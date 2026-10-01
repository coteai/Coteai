import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, role, association_id, consultant_id, context_data } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'OPENAI_API_KEY_NOT_CONFIGURED',
        message: 'Chave OPENAI_API_KEY não configurada no Supabase.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleDescription = role === 'manager'
      ? 'Você é o Cote AI Manager, analista comercial executivo da associação no Cote AI. Você tem acesso COMPLETO a todo o histórico de cotações geradas na plataforma (mais de 600 cotações acumuladas).'
      : 'Você é o Cote AI, assessor comercial exclusivo do consultor no Cote AI. Você só tem acesso aos dados pessoais do consultor que está logado.';

    const systemPrompt = `${roleDescription}

DIRETRIZES CRÍTICAS E OBRIGATÓRIAS:
1. Baseie TODAS as suas respostas EXCLUSIVAMENTE nos DADOS REAIS DO SISTEMA fornecidos no JSON abaixo.
2. NUNCA invente números, clientes, valores, vendas, cotações, rankings ou porcentagens.
3. ACESSO AO HISTÓRICO: Você tem acesso completo aos dados de todos os meses desde maio de 2026 até hoje. Se o usuário perguntar sobre o mês passado (setembro), meses específicos anteriores ou o total acumulado, utilize sempre os dados reais do campo 'historicoGeral'.
4. ${role === 'consultor' ? 'O usuário é um consultor. Ele só pode ver os próprios dados. NUNCA mencione outros consultores ou dados globais da associação.' : 'O usuário é um gestor da associação com permissão para ver todos os dados da associação.'}
5. Responda em português do Brasil com linguagem fluida, amigável, natural e executiva.
6. PROIBIÇÃO ABSOLUTA DE BULLETS OU LISTAS MECÂNICAS (ex: "• Novas: 0"). Converse normalmente em parágrafos bem escritos como uma pessoa real orientando o negócio.
7. Destaque números importantes com **negrito** (ex: **226 cotações**, **679 no total**).`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `DADOS REAIS DO SISTEMA (CRM COTE AI):\n${JSON.stringify(context_data || {}, null, 2)}\n\nPERGUNTA DO USUÁRIO:\n${prompt}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 650,
      }),
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      return new Response(JSON.stringify({
        error: 'OPENAI_API_ERROR',
        details: errText,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await openAiResponse.json();
    const answer = data.choices?.[0]?.message?.content || 'Não foi possível gerar a resposta.';

    return new Response(JSON.stringify({
      answer,
      model: 'gpt-4o-mini',
      success: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});