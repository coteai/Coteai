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
    // Edge function indisponível ou 404
  }

  // 2. Tenta chave OpenAI no frontend se configurada no Vite env
  const clientKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (clientKey) {
    try {
      const roleDesc = ctx.role === 'manager'
        ? 'Você é o Cote AI Manager, analista comercial executivo e parceiro estratégico da associação no Cote AI. Você tem visão de toda a operação.'
        : 'Você é o Cote AI, assessor comercial pessoal do consultor no Cote AI.';

      const systemPrompt = `${roleDesc}

DIRETRIZES CRÍTICAS E OBRIGATÓRIAS:
1. Baseie TODAS as suas respostas EXCLUSIVAMENTE nos DADOS REAIS DO SISTEMA fornecidos no JSON.
2. NUNCA invente números, clientes, valores, vendas, cotações, rankings ou porcentagens.
3. Se o usuário perguntar sobre alguma métrica ou informação que NÃO conste no contexto real fornecido, responda educadamente: "Não tenho esse dado registrado no Cote AI."
4. ${ctx.role === 'consultor' ? 'O usuário é um consultor. Ele só pode ver os próprios dados. NUNCA mencione outros consultores ou dados globais da associação.' : 'O usuário é um gestor da associação com permissão para ver todos os dados da associação.'}
5. Responda em português do Brasil com linguagem fluida, amigável, natural e executiva.
6. PROIBIÇÃO ABSOLUTA DE BULLETS OU LISTAS MECÂNICAS (ex: "• Novas: 0"). Converse normalmente em parágrafos bem escritos como uma pessoa real orientando o negócio.
7. Destaque números importantes com **negrito** (ex: **4 cotações**, **R$ 2.500/mês**).`;

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
 * Motor determinístico factual com linguagem conversacional 100% natural (sem bullets mecânicos)
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

  // 1. VOLUME DE COTAÇÕES (ex: "Quantas cotações fizemos hoje?", "Quantas cotações este mês?")
  if (p.includes('quantas cotações') || p.includes('quantas cotacoes') || p.includes('total de cotações') || p.includes('volume de cotações')) {
    const qMetrics = await get_quote_metrics(ctx, periodType);
    if (qMetrics.total === 0) {
      return {
        answer: `Até o momento, não registramos nenhuma nova cotação ${qMetrics.periodo}. Vale a pena verificar se há oportunidades no CRM para dar andamento.`,
        sourceFunction: 'get_quote_metrics',
        data: qMetrics,
      };
    }

    let answer = `Nós registramos um total de **${qMetrics.total} ${qMetrics.total === 1 ? 'cotação' : 'cotações'}** ${qMetrics.periodo}. `;
    const parts: string[] = [];
    if (qMetrics.novas > 0) parts.push(`**${qMetrics.novas}** ${qMetrics.novas === 1 ? 'está como nova' : 'estão como novas'}`);
    if (qMetrics.negociacao > 0) parts.push(`**${qMetrics.negociacao}** em negociação ativa`);
    if (qMetrics.proposta_enviada > 0) parts.push(`**${qMetrics.proposta_enviada}** com proposta enviada ao cliente`);
    if (qMetrics.convertida > 0) parts.push(`**${qMetrics.convertida}** convertida${qMetrics.convertida === 1 ? '' : 's'} em venda`);
    if (qMetrics.nao_convertida > 0) parts.push(`**${qMetrics.nao_convertida}** não convertida${qMetrics.nao_convertida === 1 ? '' : 's'}`);

    if (parts.length > 0) {
      answer += `Dessas, ${parts.join(', ')}.`;
    }
    if (qMetrics.convertida > 0) {
      const convRate = ((qMetrics.convertida / qMetrics.total) * 100).toFixed(1);
      answer += ` Isso representa uma taxa de conversão de **${convRate}%** no período.`;
    }
    return { answer, sourceFunction: 'get_quote_metrics', data: qMetrics };
  }

  // 2. RESUMO DIÁRIO / OPERAÇÃO DE HOJE
  if (p.includes('resumo') || p.includes('operação de hoje') || p.includes('operacao de hoje') || p.includes('como foi hoje') || p.includes('fechamento')) {
    const summary = await get_daily_summary(ctx, periodType === 'ontem' ? 'ontem' : 'hoje');

    if (summary.total === 0) {
      return {
        answer: `Até agora não tivemos novas cotações geradas ${summary.dataReferencia}. Caso precise, posso listar as cotações pendentes de dias anteriores para você retomar o contato com os clientes.`,
        sourceFunction: 'get_daily_summary',
        data: summary,
      };
    }

    let text = `Na operação de **${summary.dataReferencia}**, foram geradas **${summary.total} ${summary.total === 1 ? 'cotação' : 'cotações'}**. `;
    if (summary.convertida > 0) {
      text += `Já tivemos **${summary.convertida} conversão** em venda, somando **${formatCurrency(summary.faturamentoGerado)}/mês** em novas mensalidades (conversão de **${summary.taxaConversao}%**). `;
    } else {
      text += `Ainda não tivemos conversões finalizadas ${summary.dataReferencia}. `;
    }

    const situacoes: string[] = [];
    if (summary.novas > 0) situacoes.push(`**${summary.novas} nova(s)**`);
    if (summary.negociacao > 0) situacoes.push(`**${summary.negociacao} em negociação ativa**`);
    if (summary.proposta_enviada > 0) situacoes.push(`**${summary.proposta_enviada} com proposta enviada**`);

    if (situacoes.length > 0) {
      text += `No momento, o status delas é: ${situacoes.join(', ')}. `;
    }

    if (summary.semAtualizacao48h > 0) {
      text += `Um ponto importante de atenção: existem **${summary.semAtualizacao48h} cotações sem interação há mais de 48 horas** no CRM que precisam de acompanhamento.`;
    }

    return { answer: text, sourceFunction: 'get_daily_summary', data: summary };
  }

  // 3. TAXA DE CONVERSÃO
  if (p.includes('taxa de conversão') || p.includes('taxa de conversao') || p.includes('conversão') || p.includes('conversao')) {
    const conv = await get_conversion_rate(ctx, periodType);
    if (conv.total === 0) {
      return {
        answer: `Ainda não temos cotações registradas ${conv.periodo} para calcular a taxa de conversão.`,
        sourceFunction: 'get_conversion_rate',
      };
    }
    return {
      answer: `Nossa taxa de conversão ${conv.periodo} está em **${conv.taxaConversao}%**. Do total de **${conv.total} cotações** analisadas no período, **${conv.convertidas} foram convertidas em vendas** e **${conv.naoConvertidas}** não foram fechadas.`,
      sourceFunction: 'get_conversion_rate',
      data: conv,
    };
  }

  // 4. COTAÇÕES PENDENTES E SEM ATUALIZAÇÃO
  if (p.includes('pendente') || p.includes('sem atualização') || p.includes('sem atualizacao') || p.includes('48 horas') || p.includes('48h') || p.includes('aguardando')) {
    const pending = await get_pending_quotes(ctx);
    if (pending.totalPendentes === 0) {
      return {
        answer: 'Excelente notícia! Todas as cotações estão com status atualizado e não há nenhuma cotação pendente no momento.',
        sourceFunction: 'get_pending_quotes',
        data: pending,
      };
    }

    let text = `Temos atualmente **${pending.totalPendentes} cotações ativas aguardando fechamento comercial**. `;
    if (pending.semAtualizacao48h > 0) {
      text += `Dessas, **${pending.semAtualizacao48h} estão sem qualquer atualização há mais de 48 horas**, o que exige prioridade da equipe para não perder a oportunidade. `;
      if (pending.exemplos48h.length > 0) {
        const nomes = pending.exemplos48h.map((e: any) => `${e.modelo}${e.cliente && e.cliente !== 'Sem nome' ? ` (${e.cliente})` : ''}`).join(', ');
        text += `Alguns dos veículos aguardando retorno são: ${nomes}.`;
      }
    } else {
      text += 'Todas elas tiveram movimentações recentes nas últimas 48 horas.';
    }

    return { answer: text, sourceFunction: 'get_pending_quotes', data: pending };
  }

  // 5. VENDAS / CONVERSÕES
  if (p.includes('quantas vendas') || p.includes('total de vendas') || p.includes('vendas fiz') || p.includes('vendas tivemos') || p.includes('convertidas')) {
    const sales = await get_sales_metrics(ctx, periodType);
    if (sales.totalVendas === 0) {
      return {
        answer: `Ainda não temos vendas convertidas registradas ${sales.periodo}. Foram feitas **${sales.totalCotacoesPeriodo} cotações** no período que ainda estão no funil comercial.`,
        sourceFunction: 'get_sales_metrics',
        data: sales,
      };
    }
    return {
      answer: `${sales.periodo.charAt(0).toUpperCase() + sales.periodo.slice(1)}, nós fechamos **${sales.totalVendas} vendas convertidas**, gerando um faturamento mensal de **${formatCurrency(sales.mensalidadeTotal)}/mês** para a associação, com um ticket médio de **${formatCurrency(sales.ticketMedio)}/mês** por proposta.`,
      sourceFunction: 'get_sales_metrics',
      data: sales,
    };
  }

  // 6. VEÍCULOS MAIS COTADOS
  if (p.includes('veículo') || p.includes('veiculo') || p.includes('mais cotado') || p.includes('modelos')) {
    const topV = await get_top_vehicles(ctx, 5);
    if (topV.topVeiculos.length === 0) {
      return { answer: 'Ainda não temos registros suficientes de veículos cotados no sistema.' };
    }
    const lista = topV.topVeiculos.map((v, i) => `${i + 1}º **${v.modelo}** (${v.count} cotações)`).join(', ');
    return {
      answer: `Os veículos mais cotados até agora são: ${lista}.`,
      sourceFunction: 'get_top_vehicles',
      data: topV,
    };
  }

  // 7. PLANOS MAIS COTADOS
  if (p.includes('plano') || p.includes('planos')) {
    const topP = await get_top_plans(ctx, 5);
    if (topP.topPlanos.length === 0) {
      return { answer: 'Ainda não temos planos cotados registrados no sistema.' };
    }
    const lista = topP.topPlanos.map((pItem) => `**${pItem.plano}** com ${pItem.cotacoes} cotações (${pItem.taxaConversao}% convertidas)`).join(', ');
    return {
      answer: `Os planos com maior volume de propostas são: ${lista}.`,
      sourceFunction: 'get_top_plans',
      data: topP,
    };
  }

  // 8. ANÁLISE DE CONSULTORES (Exclusivo Manager)
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
          answer: `Não encontrei nenhum consultor com o nome "${targetName}" cadastrado no sistema.`,
        };
      }
      const c = result.consultores[0];
      return {
        answer: `Sobre o desempenho de **${c.nome}** (${result.periodo}): gerou **${c.cotacoes} cotações**, convertendo **${c.convertidas} vendas** (${c.taxaConversao}% de conversão) com ticket médio de **${formatCurrency(c.valorMedio)}/mês**.`,
        sourceFunction: 'get_consultant_performance',
        data: c,
      };
    }

    let text = `Analisando a equipe comercial em **${result.periodo}**: `;
    if (result.topConsultorCotacoes) {
      text += `quem mais cotou foi **${result.topConsultorCotacoes.nome}** com **${result.topConsultorCotacoes.cotacoes} cotações**. `;
    }
    if (result.topConsultorConversao && result.topConsultorConversao.convertidas > 0) {
      text += `A maior taxa de conversão foi de **${result.topConsultorConversao.nome}** com **${result.topConsultorConversao.taxaConversao}%** (${result.topConsultorConversao.convertidas} vendas fechadas). `;
    }

    const consultores = result.consultores || [];
    const precisandoAtencao = consultores.filter((c: any) => c.cotacoes >= 3 && c.taxaConversao === 0);
    if (precisandoAtencao.length > 0) {
      const nomes = precisandoAtencao.map((c: any) => `${c.nome} (${c.cotacoes} cotações)`).join(', ');
      text += `Vale dar uma atenção especial para ${nomes}, que tiveram bom volume de cotações mas ainda não converteram.`;
    }

    return { answer: text, sourceFunction: 'get_consultant_performance', data: result };
  }

  // 9. PIPELINE GERAL
  if (p.includes('pipeline') || p.includes('funil') || p.includes('etapas')) {
    const pipe = await get_quote_pipeline(ctx);
    const d = pipe.pipeline;
    return {
      answer: `No pipeline comercial, temos **${d.nova.count} novas**, **${d.negociacao.count} em negociação** (${formatCurrency(d.negociacao.valor)}/mês), **${d.proposta_enviada.count} com proposta enviada** (${formatCurrency(d.proposta_enviada.valor)}/mês), além de **${d.convertida.count} já convertidas** e **${d.nao_convertida.count} não convertidas**.`,
      sourceFunction: 'get_quote_pipeline',
      data: pipe,
    };
  }

  // 10. COMPARAÇÃO DE PERÍODOS
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

    let text = `Comparando **${A.nome}** com **${B.nome}**: geramos **${A.total} cotações** (contra ${B.total} no período anterior) e **${A.convertidas} conversões** (contra ${B.convertidas}). A taxa de conversão ficou em **${A.taxa}%** versus **${B.taxa}%**. `;
    if (comp.diferencas.crescimentoCotacoesPct !== null) {
      if (comp.diferencas.crescimentoCotacoesPct > 0) {
        text += `Isso representa um crescimento de **+${comp.diferencas.crescimentoCotacoesPct}%** no volume de cotações.`;
      } else if (comp.diferencas.crescimentoCotacoesPct < 0) {
        text += `Houve uma oscilação de **${comp.diferencas.crescimentoCotacoesPct}%** no volume comparado.`;
      }
    }
    return { answer: text, sourceFunction: 'compare_periods', data: comp };
  }

  // 11. SAUDAÇÕES
  if (p === 'oi' || p === 'olá' || p === 'ola' || p === 'bom dia' || p === 'boa tarde' || p === 'boa noite') {
    const nome = ctx.consultantName ? ctx.consultantName.split(' ')[0] : (ctx.role === 'manager' ? 'Gestor' : 'Consultor');
    return {
      answer: `Olá, **${nome}**! Como posso te ajudar agora? Você pode me perguntar sobre o resumo de hoje, suas vendas, taxa de conversão ou cotações pendentes da equipe.`,
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
          answer: 'Como seu assistente pessoal no Cote AI, tenho acesso exclusivamente aos seus próprios dados comerciais e cotações. Não possuo permissão para consultar métricas de outros consultores ou da associação.',
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

  // 4. Fallback imediato para o motor determinístico conversacional
  return runDeterministicQuery(prompt, ctx);
}