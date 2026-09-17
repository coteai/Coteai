import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const buildPrompt = (marca, modelo, versao, ano, uf) => `
Voce e um analista de risco automotivo no Brasil. Com base nos dados do veiculo abaixo, gere uma estimativa realista (baseada em padroes conhecidos do mercado brasileiro, sem numeros absurdos) para os 4 blocos pedidos. Responda APENAS com um JSON valido, sem texto antes ou depois, sem markdown.

Veiculo: ${marca} ${modelo} ${versao}, ano ${ano}
Estado (UF): ${uf}

Gere um JSON com exatamente esta estrutura:

{
  "roubo_furto": {
    "nivel": "baixo",
    "recuperacao_pct": 0,
    "nunca_recuperados_pct": 0,
    "ranking_nacional": null,
    "justificativa": "string"
  },
  "colisao_pecas": [
    { "peca": "string", "valor_estimado": 0 }
  ],
  "problemas_mecanicos": [
    { "problema": "string", "km_inicio": 0, "km_fim": 0, "valor_estimado": 0 }
  ],
  "revenda": {
    "score": 0,
    "demanda": "media",
    "dias_para_vender": 0,
    "depreciacao_anual_pct": 0,
    "justificativa": "string"
  }
}

Instrucoes:
- nivel de roubo_furto deve ser "baixo", "medio" ou "alto"
- demanda deve ser "baixa", "media" ou "alta"
- colisao_pecas: liste de 5 a 8 pecas mais provaveis de dano em colisao comum, com valor real em reais
- problemas_mecanicos: liste de 4 a 6 problemas mecanicos comuns desse modelo/motorizacao com faixa de km e custo estimado de reparo
- score de revenda de 0 a 10
- Seja consistente entre os blocos: se o risco de roubo for alto, isso deve refletir negativamente na revenda
`.trim();

async function callOpenAI(prompt) {
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
        { role: 'system', content: 'Voce e um analista de risco automotivo especializado no mercado brasileiro. Responda sempre com JSON valido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1400,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

function isValidPayload(p) {
  return (
    p &&
    p.roubo_furto &&
    Array.isArray(p.colisao_pecas) &&
    p.colisao_pecas.length >= 1 &&
    Array.isArray(p.problemas_mecanicos) &&
    p.problemas_mecanicos.length >= 1 &&
    p.revenda
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const unavailable = () => new Response(
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

    // Check cache first
    const { data: cached } = await supabase
      .from('vehicle_intelligence_cache')
      .select('payload')
      .eq('fipe_code', fipe_code)
      .eq('uf', uf)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached?.payload) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        status: 200,
      });
    }

    // Generate from OpenAI (up to 2 attempts)
    const prompt = buildPrompt(marca, modelo, versao ?? '', String(ano), uf);
    let payload = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callOpenAI(prompt);
        if (!raw) throw new Error('Empty response');
        const parsed = JSON.parse(raw);
        if (isValidPayload(parsed)) {
          payload = parsed;
          break;
        }
        throw new Error('Invalid payload structure');
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err.message);
        if (attempt === 0) await new Promise(r => setTimeout(r, 1200));
      }
    }

    if (!payload) return unavailable();

    // Cache for 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await supabase.from('vehicle_intelligence_cache').upsert(
      { fipe_code, uf, payload, expires_at: expiresAt.toISOString() },
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
