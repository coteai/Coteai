import { supabase } from '@/lib/supabase';
import type { AiContext } from './aiAssistantService';
import {
  get_daily_summary,
  compare_periods,
  get_sales_metrics,
  get_quote_metrics,
  get_conversion_rate,
  get_consultant_performance,
  get_quote_pipeline,
  get_pending_quotes,
  get_top_vehicles,
  get_top_plans,
} from './aiAssistantService';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export interface AiResponse {
  answer: string;
  sourceFunction?: string;
  data?: any;
  model?: string;
}

/**
 * Coleta os dados reais do CRM em um snapshot factual estruturado
 */
export async function gatherFactualContext(ctx: AiContext): Promise<Record<string, any>> {
  const context: Record<string, any> = {
    role: ctx.role,
    dataConsulta: new Date().toISOString(),
    usuario: ctx.consultantName || (ctx.role === 'manager' ? 'Gestor' : 'Consultor'),
  };

  try {
    const [daily, quotesThisMonth, salesThisMonth, conversionThisMonth, pending, pipeline] = await Promise.all([
      get_daily_summary(ctx, 'hoje').catch(() => null),
      get_quote_metrics(ctx, 'este_mes').catch(() => null),
      get_sales_metrics(ctx, 'este_mes').catch(() => null),
      get_conversion_rate(ctx, 'este_mes').catch(() => null),
      get_pending_quotes(ctx).catch(() => null),
      get_quote_pipeline(ctx).catch(() => null),
    ]);

    context.resumoHoje = daily;
    context.cotacoesMesAtual = quotesThisMonth;
    context.vendasMesAtual = salesThisMonth;
    context.conversaoMesAtual = conversionThisMonth;
    context.cotacoesPendentes = pending;
    context.pipelineComercial = pipeline;

    if (ctx.role === 'manager') {
      const [teamPerf, topVehicles, topPlans, periodCompare] = await Promise.all([
        get_consultant_performance(ctx, undefined, 'este_mes').catch(() => null),
        get_top_vehicles(ctx, 5).catch(() => null),
        get_top_plans(ctx, 5).catch(() => null),
        compare_periods(ctx, 'este_mes', 'mes_passado').catch(() => null),
      ]);
      context.desempenhoEquipe = teamPerf;
      context.topVeiculos = topVehicles;
      context.topPlanos = topPlans;
      context.comparativoMesPassado = periodCompare;
    }
  } catch (err) {
    console.warn('[Cote AI] Error gathering factual context:', err);
  }

  return context;
}

/**
 * Tenta processar a consulta utilizando o modelo GPT-4o-mini
 */
async function callGpt4oMini(prompt: string, ctx: AiContext, contextData: Record<string, any>): Promise<string | null> {
  // 1. Tenta Edge Function do Supabase
  try {
    const { data, error } = await supabase.functions.invoke('cote-ai-assistant', {
      body: {
        prompt,
        role: ctx.role,
        association_id: ctx.associationId,
        consultant_id: ctx.consultantId,
        context_data: contextData,
      },
    });

    if (!error && data && data.success && data.answer) {
      return data.answer;
    }
  } catch (err) {
    console.warn('[Cote AI] Edge function invoke error:', err);
  }

  // 2. Tenta chamada direta se VITE_OPENAI_API_KEY estiver configurada no frontend
  const clientKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (clientKey) {
    try {
      const roleDesc = ctx.role === 'manager'
        ? 'Você é o Cote AI Manager, gestor analítico e copiloto comercial da associação no Cote AI. Você tem visão de toda a operação.'
        : 'Você é o Cote AI, assessor comercial exclusivo do consultor no Cote AI. Você só tem acesso aos dados pessoais do consultor.';

      const systemPrompt = `${roleDesc}

DIRETRIZES CRÍTICAS E OBRIGATÓRIAS:
1. Baseie TODAS as suas respostas EXCLUSIVAMENTE nos DADOS REAIS DO SISTEMA fornecidos no JSON abaixo.
2. NUNCA invente números, clientes, valores, vendas, cotações, rankings ou porcentagens.
3. Se o usuário perguntar sobre alguma métrica ou informação que NÃO conste no contexto real fornecido, responda educadamente: "Não tenho esse dado registrado no Cote AI."
4. ${ctx.role === 'consultor' ? 'O usuário é um consultor. Ele só pode ver os próprios dados. NUNCA mencione outros consultores ou dados globais da associação.' : 'O usuário é um gestor da associação com permissão para ver todos os dados da associação.'}
5. Seja executivo, claro, amigável e direto em português do Brasil.
6. Use formatação Markdown limpa: destaque números e valores com **negrito**, use listas com marcadores simples quando listar itens, e mantenha parágrafos curtos.
7. Quando perguntado sobre o dia de hoje ou resumo, apresente os números de cotações, conversões e pendências claramente.`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `DADOS REAIS DO SISTEMA (CRM COTE AI):\n${JSON.stringify(contextData, null, 2)}\n\nPERGUNTA DO USUÁRIO:\n${prompt}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 650,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (err) {
      console.warn('[Cote AI] Direct OpenAI API error:', err);
    }
  }

  return null;
}

/**
 * Motor determinístico factual - garante que nenhuma pergunta fique sem resposta precisa
 */
async function runDeterministicQuery(prompt: string, ctx: AiContext): Promise<AiResponse> {
  const p = prompt.toLowerCase().trim();

  // Identificação do período mencionado na pergunta
  let periodType: 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | 'este_mes' | 'mes_passado' | 'tudo' = 'este_mes';
  if (p.includes('hoje')) periodType = 'hoje';
  else if (p.includes('ontem')) periodType = 'ontem';
  else if (p.includes('esta semana') || p.includes('dessa semana')) periodType = 'esta_semana';
  else if (p.includes('semana passada')) periodType = 'semana_passada';
  else if (p.includes('mês passado') || p.includes('mes passado')) periodType = 'mes_passado';
  else if (p.includes('este mês') || p.includes('este mes') || p.includes('desse mês')) periodType = 'este_mes';
  else if (p.includes('sempre') || p.includes('total') || p.includes('histórico')) periodType = 'tudo';

  // 1. RESUMO DIÁRIO / OPERAÇÃO DE HOJE
  if (p.includes('resumo') || p.includes('operação de hoje') || p.includes('operacao de hoje') || p.includes('como foi hoje') || p.includes('fechamento')) {
    const summary = await get_daily_summary(ctx, periodType === 'ontem' ? 'ontem' : 'hoje');

    if (summary.total === 0) {
      return {
        answer: `**Resumo da operação de ${summary.dataReferencia}:**\n\nNenhuma cotação foi registrada ${summary.dataReferencia} até o momento.\n\n*Recomendação:* Fique atento às oportunidades no CRM para iniciar novas negociações.`,
        sourceFunction: 'get_daily_summary',
        data: summary,
      };
    }

    let text = `📊 **Resumo da operação de ${summary.dataReferencia}:**\n\n`;
    text += `• **${summary.total}** cotações geradas\n`;
    text += `• **${summary.proposta_enviada}** propostas enviadas\n`;
    text += `• **${summary.negociacao}** em negociação ativa\n`;
    text += `• **${summary.convertida}** conversões (${formatCurrency(summary.faturamentoGerado)}/mês)\n`;
    text += `• **${summary.nao_convertida}** não convertidas\n`;
    text += `• **${summary.taxaConversao}%** de taxa de conversão\n\n`;

    if (summary.semAtualizacao48h > 0) {
      text += `⚠️ **Atenção:** Existem **${summary.semAtualizacao48h} cotações** aguardando atualização há mais de 48 horas. Recomenda-se realizar o fechamento diário ou retomar contato imediato.`;
    } else {
      text += `✅ O fluxo de cotações de ${summary.dataReferencia} está com os registros comerciais atualizados.`;
    }

    return { answer: text, sourceFunction: 'get_daily_summary', data: summary };
  }

  // 2. COMPARAÇÃO DE PERÍODOS
  if (p.includes('compare') || p.includes('comparar') || p.includes('comparativo') || p.includes('diferença entre')) {
    let pA: 'hoje' | 'esta_semana' | 'este_mes' = 'este_mes';
    let pB: 'ontem' | 'semana_passada' | 'mes_passado' = 'mes_passado';

    if (p.includes('hoje') && p.includes('ontem')) {
      pA = 'hoje';
      pB = 'ontem';
    } else if (p.includes('semana')) {
      pA = 'esta_semana';
      pB = 'semana_passada';
    }

    const comp = await compare_periods(ctx, pA, pB);
    const A = comp.periodoA;
    const B = comp.periodoB;

    let text = `📈 **Comparativo: ${A.nome.toUpperCase()} vs ${B.nome.toUpperCase()}**\n\n`;
    text += `• **Cotações:** ${A.total} (${A.nome}) vs ${B.total} (${B.nome}) [${comp.diferencas.diffCotacoes >= 0 ? `+${comp.diferencas.diffCotacoes}` : comp.diferencas.diffCotacoes}]\n`;
    text += `• **Convertidas:** ${A.convertidas} vs ${B.convertidas} [${comp.diferencas.diffConvertidas >= 0 ? `+${comp.diferencas.diffConvertidas}` : comp.diferencas.diffConvertidas}]\n`;
    text += `• **Taxa de Conversão:** ${A.taxa}% vs ${B.taxa}% [${comp.diferencas.diffTaxa >= 0 ? `+${comp.diferencas.diffTaxa}%` : `${comp.diferencas.diffTaxa}%`}]\n`;
    text += `• **Ticket Médio:** ${formatCurrency(A.ticket)} vs ${formatCurrency(B.ticket)}\n\n`;

    if (comp.diferencas.crescimentoCotacoesPct !== null) {
      if (comp.diferencas.crescimentoCotacoesPct > 0) {
        text += `O volume de cotações cresceu **${comp.diferencas.crescimentoCotacoesPct}%** em relação ao período anterior.\n`;
      } else if (comp.diferencas.crescimentoCotacoesPct < 0) {
        text += `Houve uma retração de **${Math.abs(comp.diferencas.crescimentoCotacoesPct)}%** no volume de cotações.\n`;
      }
    }

    return { answer: text, sourceFunction: 'compare_periods', data: comp };
  }

  // 3. TAXA DE CONVERSÃO
  if (p.includes('taxa de conversão') || p.includes('taxa de conversao') || p.includes('conversão') || p.includes('conversao')) {
    const conv = await get_conversion_rate(ctx, periodType);
    if (conv.total === 0) {
      return {
        answer: `Não tenho cotações registradas para calcular a taxa de conversão em **${conv.periodo}**.`,
        sourceFunction: 'get_conversion_rate',
      };
    }
    return {
      answer: `Sua taxa de conversão em **${conv.periodo}** é de **${conv.taxaConversao}%**.\n\n• Total de cotações: **${conv.total}**\n• Cotações convertidas em vendas: **${conv.convertidas}**\n• Não convertidas: **${conv.naoConvertidas}**`,
      sourceFunction: 'get_conversion_rate',
      data: conv,
    };
  }

  // 4. COTAÇÕES PENDENTES E SEM ATUALIZAÇÃO
  if (p.includes('pendente') || p.includes('sem atualização') || p.includes('sem atualizacao') || p.includes('48 horas') || p.includes('48h') || p.includes('aguardando')) {
    const pending = await get_pending_quotes(ctx);
    if (pending.totalPendentes === 0) {
      return {
        answer: 'Parabéns! Todas as suas cotações estão com status atualizado e não há nenhuma cotação pendente no momento.',
        sourceFunction: 'get_pending_quotes',
        data: pending,
      };
    }

    let text = `Você possui **${pending.totalPendentes} cotações ativas aguardando fechamento comercial**.\n\n`;
    if (pending.semAtualizacao48h > 0) {
      text += `⚠️ **${pending.semAtualizacao48h} cotações estão sem atualização há mais de 48 horas!**\n`;
      if (pending.exemplos48h.length > 0) {
        text += '\nExemplos prioritários para contato:\n';
        pending.exemplos48h.forEach((item: any) => {
          text += `• **${item.cliente}** - ${item.modelo} (${item.placa || 'Sem placa'}) - ${formatCurrency(item.valor)}/mês\n`;
        });
      }
    } else {
      text += 'Todas as cotações pendentes tiveram interações recentes nas últimas 48 horas.';
    }

    return { answer: text, sourceFunction: 'get_pending_quotes', data: pending };
  }

  // 5. VENDAS / CONVERSÕES
  if (p.includes('quantas vendas') || p.includes('total de vendas') || p.includes('vendas fiz') || p.includes('vendas tivemos') || p.includes('convertidas')) {
    const sales = await get_sales_metrics(ctx, periodType);
    return {
      answer: `Em **${sales.periodo}**, foram realizadas **${sales.totalVendas} vendas convertidas**.\n\n• Mensalidade total gerada: **${formatCurrency(sales.mensalidadeTotal)}/mês**\n• Ticket médio da proposta: **${formatCurrency(sales.ticketMedio)}/mês**\n• Total de cotações analisadas no período: **${sales.totalCotacoesPeriodo}**`,
      sourceFunction: 'get_sales_metrics',
      data: sales,
    };
  }

  // 6. VOLUME DE COTAÇÕES
  if (p.includes('quantas cotações') || p.includes('quantas cotacoes') || p.includes('total de cotações') || p.includes('volume de cotações')) {
    const qMetrics = await get_quote_metrics(ctx, periodType);
    return {
      answer: `Foram geradas **${qMetrics.total} cotações** em **${qMetrics.periodo}**.\n\nDistribuição atual:\n• Novas: **${qMetrics.novas}**\n• Em negociação: **${qMetrics.negociacao}**\n• Propostas enviadas: **${qMetrics.proposta_enviada}**\n• Convertidas: **${qMetrics.convertida}**\n• Não convertidas: **${qMetrics.nao_convertida}**`,
      sourceFunction: 'get_quote_metrics',
      data: qMetrics,
    };
  }

  // 7. VEÍCULOS MAIS COTADOS
  if (p.includes('veículo') || p.includes('veiculo') || p.includes('mais cotado') || p.includes('modelos')) {
    const topV = await get_top_vehicles(ctx, 5);
    if (topV.topVeiculos.length === 0) {
      return { answer: 'Não tenho esse dado registrado no Cote AI (nenhum veículo cotado até o momento).' };
    }
    let text = `🚗 **Top 5 Veículos mais cotados no sistema:**\n\n`;
    topV.topVeiculos.forEach((v, idx) => {
      text += `${idx + 1}. **${v.modelo}**: ${v.count} cotações\n`;
    });
    return { answer: text, sourceFunction: 'get_top_vehicles', data: topV };
  }

  // 8. PLANOS MAIS COTADOS
  if (p.includes('plano') || p.includes('planos')) {
    const topP = await get_top_plans(ctx, 5);
    if (topP.topPlanos.length === 0) {
      return { answer: 'Não tenho esse dado registrado no Cote AI (nenhum plano cotado ainda).' };
    }
    let text = `🛡️ **Planos mais cotados e aceitos:**\n\n`;
    topP.topPlanos.forEach((pItem, idx) => {
      text += `${idx + 1}. **${pItem.plano}**: ${pItem.cotacoes} cotações | ${pItem.convertidas} convertidas (${pItem.taxaConversao}%)\n`;
    });
    return { answer: text, sourceFunction: 'get_top_plans', data: topP };
  }

  // 9. ANÁLISE DE CONSULTORES (Exclusivo Manager)
  if (ctx.role === 'manager' && (p.includes('consultor') || p.includes('consultores') || p.includes('equipe') || p.includes('atenção') || p.includes('atencao') || p.includes('desempenho'))) {
    let targetName: string | undefined = undefined;
    const words = p.split(/\s+/);
    const triggerIndex = words.findIndex((w) => w === 'do' || w === 'da' || w === 'de');
    if (triggerIndex !== -1 && words[triggerIndex + 1]) {
      targetName = words[triggerIndex + 1].replace(/[?,.!]/g, '');
    }

    const result = await get_consultant_performance(ctx, targetName, periodType === 'tudo' ? 'tudo' : 'este_mes');

    if (result.isFiltered && targetName) {
      if (!result.consultores || result.consultores.length === 0) {
        return {
          answer: `Não encontrei nenhum consultor com o nome "${targetName}" registrado no Cote AI.`,
        };
      }
      const c = result.consultores[0];
      return {
        answer: `👤 **Desempenho de ${c.nome} (${result.periodo}):**\n\n• Cotações geradas: **${c.cotacoes}**\n• Vendas convertidas: **${c.convertidas}**\n• Não convertidas: **${c.naoConvertidas}**\n• Taxa de conversão: **${c.taxaConversao}%**\n• Ticket médio: **${formatCurrency(c.valorMedio)}/mês**`,
        sourceFunction: 'get_consultant_performance',
        data: c,
      };
    }

    let text = `👥 **Desempenho da equipe comercial em ${result.periodo}:**\n\n`;
    if (result.topConsultorCotacoes) {
      text += `• **Maior volume de cotações:** ${result.topConsultorCotacoes.nome} (${result.topConsultorCotacoes.cotacoes} cotações)\n`;
    }
    if (result.topConsultorConversao) {
      text += `• **Maior taxa de conversão:** ${result.topConsultorConversao.nome} (${result.topConsultorConversao.taxaConversao}% com ${result.topConsultorConversao.convertidas} vendas)\n`;
    }

    const consultores = result.consultores || [];
    const precisandoAtencao = consultores.filter((c: any) => c.cotacoes >= 3 && c.taxaConversao === 0);
    if (precisandoAtencao.length > 0) {
      text += `\n⚠️ **Consultores que precisam de suporte no fechamento:**\n`;
      precisandoAtencao.forEach((c: any) => {
        text += `• **${c.nome}**: ${c.cotacoes} cotações sem nenhuma conversão até o momento.\n`;
      });
    }

    return { answer: text, sourceFunction: 'get_consultant_performance', data: result };
  }

  // 10. PIPELINE GERAL
  if (p.includes('pipeline') || p.includes('funil') || p.includes('etapas')) {
    const pipe = await get_quote_pipeline(ctx);
    const d = pipe.pipeline;
    return {
      answer: `🎯 **Pipeline Comercial Ativo:**\n\n• **Novas:** ${d.nova.count} (${formatCurrency(d.nova.valor)}/mês)\n• **Em Negociação:** ${d.negociacao.count} (${formatCurrency(d.negociacao.valor)}/mês)\n• **Proposta Enviada:** ${d.proposta_enviada.count} (${formatCurrency(d.proposta_enviada.valor)}/mês)\n• **Convertidas:** ${d.convertida.count} (${formatCurrency(d.convertida.valor)}/mês)\n• **Não Convertidas:** ${d.nao_convertida.count}`,
      sourceFunction: 'get_quote_pipeline',
      data: pipe,
    };
  }

  // 11. SAUDAÇÕES
  if (p === 'oi' || p === 'olá' || p === 'ola' || p === 'bom dia' || p === 'boa tarde' || p === 'boa noite') {
    const nome = ctx.consultantName ? ctx.consultantName.split(' ')[0] : (ctx.role === 'manager' ? 'Gestor' : 'Consultor');
    return {
      answer: `Olá, **${nome}**! Como posso te ajudar hoje? Você pode me perguntar sobre o **resumo de hoje**, **suas vendas**, **taxa de conversão** ou **cotações pendentes**.`,
    };
  }

  // 12. FALLBACK FACTUAL
  return {
    answer: 'Não tenho esse dado registrado no Cote AI. Você pode me perguntar sobre cotações, vendas, taxa de conversão, cotações pendentes, comparativos de períodos ou resumo da operação.',
  };
}

/**
 * Ponto de entrada principal do Assistente IA
 */
export async function processAiQuery(prompt: string, ctx: AiContext): Promise<AiResponse> {
  const p = prompt.toLowerCase().trim();

  // 1. VERIFICAÇÃO DE ESCOPO PARA CONSULTOR
  if (ctx.role === 'consultor') {
    const prohibitedTerms = [
      'outros consultores', 'outro consultor', 'ranking geral', 'toda a associação',
      'todos os consultores', 'qual consultor', 'quem vendeu mais', 'equipe toda', 'geral da associação'
    ];
    for (const term of prohibitedTerms) {
      if (p.includes(term)) {
        return {
          answer: 'Como seu assistente pessoal no Cote AI, tenho acesso exclusivamente aos seus próprios dados comerciais, clientes e cotações. Não possuo permissão para consultar métricas de outros consultores ou da associação.',
        };
      }
    }
  }

  // 2. Coleta snapshot de dados reais do CRM
  const contextData = await gatherFactualContext(ctx);

  // 3. Tenta processar com GPT-4o-mini
  const gptAnswer = await callGpt4oMini(prompt, ctx, contextData);
  if (gptAnswer) {
    return {
      answer: gptAnswer,
      model: 'gpt-4o-mini',
      data: contextData,
    };
  }

  // 4. Fallback imediato para o motor determinístico factual
  return runDeterministicQuery(prompt, ctx);
}