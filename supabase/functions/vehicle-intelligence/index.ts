import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const buildPrompt = (marca: string, modelo: string, versao: string, ano: string, uf: string) => `
Você é o principal especialista e analista de inteligência de risco, colisão e mercado automotivo do Brasil, com dados consolidados de SINESP, FENSEG, CNseg, ITURAN, TRACKER, CESVI Brasil, FIPE e KBB (Kelley Blue Book).

Analise o seguinte veículo com rigor técnico absoluto e total aderência à realidade do mercado brasileiro em 2024-2026:
Veículo: ${marca} ${modelo} ${versao}
Ano Modelo: ${ano}
Estado (UF): ${uf}

DIRETRIZES OBRIGATÓRIAS DE MERCADO:

1. ROUBO E FURTO:
- NÃO invente que carros populares líderes de vendas têm risco baixo! Carros como Chevrolet Onix, Hyundai HB20, VW Gol, Ford Ka, Fiat Palio/Uno, Fiat Strada, Toyota Hilux, Jeep Renegade/Compass têm risco ALTO ou MÉDIO-ALTO de roubo/furto no Brasil (especialmente em SP, RJ, PR, MG, BA, RS, GO, PE).
- Para o Chevrolet Onix especificamente: é historicamente e atualmente um dos TOP 3 a 5 carros mais roubados/furtados do Brasil (ranking #1 a #5 nacional). O risco é estritamente "ALTO". A justificativa deve citar o grande volume de frota circulante e a forte demanda por autopeças no mercado paralelo/clandestino e desmanches ilegais.
- Para picapes diesel (Hilux, Toro, Ranger, S10, Amarok) e SUVs (Compass, Creta, Renegade, Kicks): visados para clonagem, desmanche especializado e transporte interestadual/fronteiras.
- Taxa de recuperação no Brasil: estatisticamente entre 42% e 52%. Logo, "recuperacao_pct" deve estar entre 42 e 52, e "nunca_recuperados_pct" deve ser exatamente (100 - recuperacao_pct), ou seja, entre 48 e 58. JAMAIS coloque 20% de nunca recuperados!
- "ranking_nacional_texto": texto com o ranking real aproximado, ex: "#3º no ranking dos mais roubados no Brasil" ou "#38º no ranking dos mais roubados no Brasil".

2. COLISÃO E PEÇAS:
- Liste de 7 a 8 peças reais que tipicamente sofrem avarias em colisão frontal/lateral urbana.
- Use a nomenclatura técnica exata condizente com a versão do veículo! Se for versão com farol Full LED ou projetor, coloque "Farol Full LED" com valor compatível (R$ 2.500 a R$ 5.500). Se tiver ADAS/sensor de chuva, coloque "Para-brisa com sensor de chuva/ADAS".
- Inclua emojis representativos para cada peça (ex: 💡 para Farol, 🔧 para Capô, 🪟 para Para-brisa, 🚧 para Para-choque, 🪞 para Retrovisor, 💧 para Radiador, 🏁 para Grade frontal, 🛡️ para Para-lama).
- Valores realistas de peças originais/OEM no mercado de reposição brasileiro em Reais (R$).

3. PROBLEMAS MECÂNICOS CRÔNICOS:
- NUNCA liste manutenções preventivas rotineiras como "Troca de óleo" ou "Troca de pastilha"!
- Liste de 4 a 6 DEFEITOS MECÂNICOS CRÔNICOS OU VULNERABILIDADES CONHECIDAS do motor/câmbio/suspensão deste modelo e motorização específicos:
  * Exemplo Onix 1.0 3 cil / Turbo: Desgaste da correia dentada banhada a óleo (40.000 - 70.000 km, R$ 2.800 a R$ 4.500), Falha na bomba de vácuo do freio (40.000 - 80.000 km, R$ 1.800), Carbonização de válvulas / injeção direta (50.000 - 90.000 km, R$ 1.500), Trocador de calor de óleo (60.000 - 100.000 km, R$ 1.600), Buchas e bieletas da suspensão dianteira (30.000 - 60.000 km, R$ 900).
  * Exemplo Compass / Toro Diesel: Falha na bomba de alta pressão CP4 (80.000 - 140.000 km, R$ 8.500), Saturação do Filtro DPF e carbonização da EGR (70.000 - 120.000 km, R$ 6.500), Desgaste de coxins de motor e câmbio (60.000 - 100.000 km, R$ 2.800), Sensor de NOx / Sonda Lambda (50.000 - 90.000 km, R$ 3.200), Vazamento na tampa de válvulas (70.000 - 110.000 km, R$ 1.400).
  * Adapte sempre para o motor e modelo exatos do veículo recebido.
- Para cada problema inclua:
  - "problema": Nome técnico claro do defeito
  - "km_faixa": String formatada da faixa de KM, ex: "40.000 - 70.000 km"
  - "km_inicio": número inteiro (ex: 40000)
  - "km_fim": número inteiro (ex: 70000)
  - "valor_estimado": custo médio estimado de reparo (peça + mão de obra) em reais

4. REVENDA E LIQUIDEZ:
- "score": número com 1 casa decimal de 0.0 a 10.0 (ex: 8.8 para Onix, 8.5 para Compass, 9.2 para Corolla, 5.5 para importado de nicho).
- "demanda": "Alta", "Muito Alta", "Média" ou "Baixa"
- "dias_para_vender": número realista de dias para giro no mercado (ex: 20 a 35 dias para populares de alta liquidez, 40 a 60 para SUVs médios, 75 a 120 para carros de nicho/difíceis)
- "depreciacao_anual_pct": taxa de depreciação média anual realista (ex: 7.0% a 11.5% ao ano)
- "justificativa": texto analítico e comercial explicando a liquidez, aceitação em concessionárias e facilidade de venda desse modelo específico no Brasil.

Gere exatamente este JSON válido (sem markdown, sem texto antes ou depois):
{
  "roubo_furto": {
    "nivel": "ALTO | MÉDIO | BAIXO",
    "recuperacao_pct": 48,
    "nunca_recuperados_pct": 52,
    "ranking_nacional_texto": "#3º no ranking dos mais roubados no Brasil",
    "ranking_nacional": 3,
    "justificativa": "Texto analítico realista..."
  },
  "colisao_pecas": [
    { "peca": "Farol Full LED", "emoji": "💡", "valor_estimado": 2800 }
  ],
  "problemas_mecanicos": [
    { "problema": "Nome do defeito crônico", "km_faixa": "40.000 - 70.000 km", "km_inicio": 40000, "km_fim": 70000, "valor_estimado": 3200 }
  ],
  "revenda": {
    "score": 8.8,
    "demanda": "Alta",
    "dias_para_vender": 28,
    "depreciacao_anual_pct": 7.5,
    "justificativa": "Texto analítico realista..."
  }
}
`.trim();

async function callOpenAI(prompt: string) {
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
        {
          role: 'system',
          content: 'Você é um analista de risco e mercado automotivo brasileiro altamente técnico e preciso. Responda estritamente com JSON válido sem markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

function isValidPayload(p: any) {
  return (
    p &&
    p.roubo_furto &&
    Array.isArray(p.colisao_pecas) &&
    p.colisao_pecas.length >= 5 &&
    Array.isArray(p.problemas_mecanicos) &&
    p.problemas_mecanicos.length >= 3 &&
    p.revenda
  );
}

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

    // Check cache
    const { data: cached } = await supabase
      .from('vehicle_intelligence_cache')
      .select('payload')
      .eq('fipe_code', fipe_code)
      .eq('uf', uf)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    // Only return cache if it matches the new complete schema (has ranking_nacional_texto)
    if (cached?.payload && cached.payload.roubo_furto?.ranking_nacional_texto) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        status: 200,
      });
    }

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
      } catch (err: any) {
        console.error(`Attempt ${attempt + 1} failed:`, err.message);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
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