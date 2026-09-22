import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache key: model-level (not FIPE variant), for web-search results
function buildModelCacheKey(marca: string, modelo: string): string {
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return 'WS-' + n(marca) + '-' + n(modelo);
}

// Web Search prompt — asks the model to research the web before answering
const buildWebSearchPrompt = (marca: string, modelo: string, versao: string, ano: string, uf: string) => [
  `Você tem acesso à busca na web. Pesquise informações reais e atuais sobre o veículo ${marca} ${modelo} ${versao} no Brasil para preencher os 4 blocos do relatório abaixo.`,
  '',
  `INSTRUÇÃO CRÍTICA: Faça buscas reais antes de cada bloco. Baseie a resposta APENAS no que encontrar. NÃO invente dados.`,
  '',
  `Pesquise sobre:`,
  `1. Ranking e estatísticas de roubo/furto do ${marca} ${modelo} no Brasil (SINESP, SSP-SP, SENATRAN, Fenabrave, ITURAN 2024-2026)`,
  `2. Preços reais de peças de reposição do ${marca} ${modelo} no mercado brasileiro (lojas online, distribuidoras, peças OEM/originais 2024-2026)`,
  `3. Problemas mecânicos crônicos e defeitos conhecidos do ${marca} ${modelo} relatados em fóruns, oficinas e recalls no Brasil`,
  `4. Dados de revenda: preço médio de usados, tempo médio de venda, liquidez e depreciação do ${marca} ${modelo} (Webmotors, OLX, iCarros 2024-2026)`,
  '',
  `Estado: ${uf} | Ano do modelo: ${ano}`,
  '',
  `Retorne APENAS este JSON válido (sem markdown, sem texto fora do JSON):`,
  `{`,
  `  "roubo_furto": {`,
  `    "nivel": "ALTO",`,
  `    "recuperacao_pct": 48,`,
  `    "nunca_recuperados_pct": 52,`,
  `    "ranking_nacional_texto": "#3° no ranking dos mais roubados no Brasil",`,
  `    "ranking_nacional": 3,`,
  `    "justificativa": "Texto baseado nas buscas."`,
  `  },`,
  `  "colisao_pecas": [`,
  `    { "peca": "Farol Full LED", "emoji": "💡", "valor_estimado": 3200 }`,
  `  ],`,
  `  "problemas_mecanicos": [`,
  `    { "problema": "Defeito crônico real", "km_faixa": "40.000 - 80.000 km", "km_inicio": 40000, "km_fim": 80000, "valor_estimado": 2800 }`,
  `  ],`,
  `  "revenda": {`,
  `    "score": 8.8,`,
  `    "demanda": "Alta",`,
  `    "dias_para_vender": 28,`,
  `    "depreciacao_anual_pct": 7.5,`,
  `    "justificativa": "Texto baseado nos dados encontrados."`,
  `  }`,
  `}`,
  '',
  `Regras obrigatórias:`,
  `- colisao_pecas: mínimo 7 peças com valores pesquisados`,
  `- problemas_mecanicos: mínimo 4 defeitos crônicos reais (NUNCA troca de óleo ou pastilhas)`,
  `- recuperacao_pct + nunca_recuperados_pct = exatamente 100`,
  `- nivel: "ALTO", "MÉDIO" ou "BAIXO" (baseie-se no ranking real encontrado)`,
  `- score de revenda: 0.0 a 10.0`,
].join('\n');

// Fallback prompt — used when web search is unavailable (grounded statistical knowledge)
const buildFallbackPrompt = (marca: string, modelo: string, versao: string, ano: string, uf: string) => [
  `Você é especialista em risco e mercado automotivo do Brasil (SINESP, FENSEG, CESVI, FIPE, KBB).`,
  `Veículo: ${marca} ${modelo} ${versao}, Ano ${ano}, Estado ${uf}`,
  '',
  `DIRETRIZES CRÍTICAS DE MERCADO:`,
  `- Chevrolet Onix, HB20, VW Gol: RISCO ALTO, top 3-5 ranking nacional`,
  `- Toyota Hilux, Jeep Compass Diesel, Renegade: RISCO MÉDIO-ALTO (clonagem e desmanche)`,
  `- recuperacao_pct entre 42-52; nunca_recuperados_pct = 100 - recuperacao_pct`,
  `- NUNCA liste troca de óleo ou pastilhas — liste DEFEITOS CRÔNICOS REAIS do modelo`,
  `- colisao_pecas: use preços reais OEM (farol LED = R$2.500-5.500, capô = R$1.500-3.000)`,
  '',
  `Retorne APENAS JSON válido sem markdown:`,
  `{`,
  `  "roubo_furto": { "nivel": "ALTO|MÉDIO|BAIXO", "recuperacao_pct": 48, "nunca_recuperados_pct": 52, "ranking_nacional_texto": "#3° no ranking dos mais roubados no Brasil", "ranking_nacional": 3, "justificativa": "texto" },`,
  `  "colisao_pecas": [{ "peca": "Farol Full LED", "emoji": "💡", "valor_estimado": 3200 }],`,
  `  "problemas_mecanicos": [{ "problema": "defeito crônico", "km_faixa": "40.000 - 70.000 km", "km_inicio": 40000, "km_fim": 70000, "valor_estimado": 3200 }],`,
  `  "revenda": { "score": 8.8, "demanda": "Alta", "dias_para_vender": 28, "depreciacao_anual_pct": 7.5, "justificativa": "texto" }`,
  `}`,
].join('\n');

// ─── OpenAI: Responses API with web_search (primary) ────────────────────────

async function callWithWebSearch(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
      tools: [{ type: 'web_search' }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Responses API ${response.status}: ${err.slice(0, 400)}`);
  }

  const data = await response.json();
  // Extract text from message output items
  const messages = (data.output ?? []).filter((o: any) => o.type === 'message');
  const text = messages
    .flatMap((m: any) => (m.content ?? []).filter((c: any) => c.type === 'output_text').map((c: any) => c.text))
    .join('');
  return text || null;
}

// ─── OpenAI: Chat Completions (fallback, no web search) ─────────────────────

async function callChatCompletions(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Você é analista de risco automotivo brasileiro. Responda estritamente com JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Chat ${response.status}: ${err.slice(0, 400)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

// ─── Extract JSON from text (web search may embed JSON in prose) ─────────────

function extractJson(text: string): any {
  try {
    return JSON.parse(text.trim());
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No valid JSON found in response');
  }
}

// ─── Payload validation ──────────────────────────────────────────────────────

function isValidPayload(p: any): boolean {
  return (
    p != null &&
    p.roubo_furto &&
    typeof p.roubo_furto.nivel === 'string' &&
    Array.isArray(p.colisao_pecas) &&
    p.colisao_pecas.length >= 5 &&
    Array.isArray(p.problemas_mecanicos) &&
    p.problemas_mecanicos.length >= 3 &&
    p.revenda &&
    typeof p.revenda.score !== 'undefined'
  );
}

// ─── Generate with web search primary, chat completions fallback ─────────────

async function generatePayload(
  marca: string, modelo: string, versao: string, ano: string, uf: string
): Promise<any> {
  const wsPrompt = buildWebSearchPrompt(marca, modelo, versao, ano, uf);
  const fbPrompt = buildFallbackPrompt(marca, modelo, versao, ano, uf);

  // Attempts: web search x2, then chat completions x1
  const attempts: Array<{ label: string; fn: () => Promise<string | null> }> = [
    { label: 'web_search_1', fn: () => callWithWebSearch(wsPrompt) },
    { label: 'web_search_2', fn: async () => { await new Promise(r => setTimeout(r, 1000)); return callWithWebSearch(wsPrompt); } },
    { label: 'chat_completions_fallback', fn: () => callChatCompletions(fbPrompt) },
  ];

  for (const { label, fn } of attempts) {
    try {
      console.log(`Attempting: ${label}`);
      const raw = await fn();
      if (!raw) { console.warn(`${label}: empty response`); continue; }
      const parsed = extractJson(raw);
      if (isValidPayload(parsed)) {
        console.log(`Success via: ${label}`);
        parsed._source = label;
        return parsed;
      }
      console.warn(`${label}: invalid payload structure`);
    } catch (err: any) {
      console.error(`${label} failed:`, err.message);
    }
  }

  return null;
}

// ─── Serve ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const unavailable = () =>
    new Response(
      JSON.stringify({ error: 'intelligence_unavailable' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  try {
    const { marca, modelo, versao, ano, uf, fipe_code } = await req.json();

    if (!marca || !modelo || !ano || !uf || !fipe_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: marca, modelo, ano, uf, fipe_code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // ── Cache Layer 1: Model-level web-search cache (30 days, reused across all variants) ──
    const modelKey = buildModelCacheKey(marca, modelo);
    const { data: wsCache } = await supabase
      .from('vehicle_intelligence_cache')
      .select('payload')
      .eq('fipe_code', modelKey)
      .eq('uf', 'WS')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (wsCache?.payload && isValidPayload(wsCache.payload)) {
      console.log('Cache HIT (model-level):', modelKey);
      return new Response(JSON.stringify(wsCache.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT-MODEL' },
        status: 200,
      });
    }

    // ── Cache Layer 2: FIPE-variant cache (90 days, legacy) ─────────────────
    const { data: fipeCache } = await supabase
      .from('vehicle_intelligence_cache')
      .select('payload')
      .eq('fipe_code', fipe_code)
      .eq('uf', uf)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (fipeCache?.payload && isValidPayload(fipeCache.payload) && fipeCache.payload.roubo_furto?.ranking_nacional_texto) {
      console.log('Cache HIT (fipe-level):', fipe_code, uf);
      return new Response(JSON.stringify(fipeCache.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT-FIPE' },
        status: 200,
      });
    }

    // ── Generate ─────────────────────────────────────────────────────────────
    const payload = await generatePayload(marca, modelo, versao ?? '', String(ano), uf);
    if (!payload) return unavailable();

    // ── Persist: model-level (30 days) ──────────────────────────────────────
    const exp30 = new Date(); exp30.setDate(exp30.getDate() + 30);
    await supabase.from('vehicle_intelligence_cache').upsert(
      { fipe_code: modelKey, uf: 'WS', payload, expires_at: exp30.toISOString() },
      { onConflict: 'fipe_code,uf' }
    );

    // ── Persist: fipe-level (90 days) ───────────────────────────────────────
    const exp90 = new Date(); exp90.setDate(exp90.getDate() + 90);
    await supabase.from('vehicle_intelligence_cache').upsert(
      { fipe_code, uf, payload, expires_at: exp90.toISOString() },
      { onConflict: 'fipe_code,uf' }
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      status: 200,
    });
  } catch (err) {
    console.error('vehicle-intelligence fatal error:', err);
    return unavailable();
  }
});