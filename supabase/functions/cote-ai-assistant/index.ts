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
      ? 'Você é o Cote AI Manager, analista comercial e gestor estratégico de inteligência da associação no Cote AI. Você tem visão de toda a operação.'
      : 'Você é o Cote AI, assessor comercial exclusivo do consultor no Cote AI. Você só tem acesso aos dados pessoais do consultor que está logado.';

    const systemPrompt = `${roleDescription}

DIRETRIZES CRÍTICAS E OBRIGATÓRIAS:
1. Baseie TODAS as suas respostas EXCLUSIVAMENTE nos DADOS REAIS DO SISTEMA fornecidos no JSON abaixo.
2. NUNCA invente números, clientes, valores, vendas, cotações, rankings ou porcentagens.
3. Se o usuário perguntar sobre alguma métrica ou informação que NÃO conste no contexto real fornecido, responda educadamente: "Não tenho esse dado registrado no Cote AI."
4. ${role === 'consultor' ? 'O usuário é um consultor. Ele só pode ver os próprios dados. NUNCA mencione outros consultores ou dados globais da associação.' : 'O usuário é um gestor da associação com permissão para ver todos os dados da associação.'}
5. Seja executivo, claro, amigável e direto em português do Brasil.
6. Use formatação Markdown limpa: destaque números e valores com **negrito**, use listas com marcadores simples quando listar itens, e mantenha parágrafos curtos.
7. Quando perguntado sobre o dia de hoje ou resumo, apresente os números de cotações, conversões e pendências claramente.`;

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