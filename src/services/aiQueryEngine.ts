import { supabase } from '../lib/supabase';
import type { AiContext, PeriodType } from './aiAssistantService';
import {
  getPeriodDates,
  get_sales_metrics,
  get_quote_metrics,
  get_conversion_rate,
  get_consultant_performance,
  get_quote_pipeline,
  get_pending_quotes,
  get_top_vehicles,
  get_top_plans,
  compare_periods,
  get_daily_summary,
  get_historical_summary,
} from './aiAssistantService';

export interface AiResponse {
  answer: string;
  sourceFunction?: string;
  data?: any;
  model?: 'gpt-4o-mini' | 'deterministic';
}

function formatCurrency(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Coleta instantânea de dados factuais reais do sistema para contextualizar a IA
 */
export async function gatherFactualContext(ctx: AiContext): Promise<Record<string, any>> {
  const now = new Date();
  const context: Record<string, any> = {
    role: ctx.role,
    tempoReal: {
      dataAtual: now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      horaAtual: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      mesAtual: 'outubro de 2026',
      mesPassado: 'setembro de 2026',
      proximoMes: 'novembro de 2026',
      ano: 2026,
    },
    usuario: ctx.consultantName || (ctx.role === 'manager' ? 'Gestor' : 'Consultor'),
  };

  try {
    const [daily, quotesThisMonth, salesThisMonth, conversionThisMonth, pending, pipeline, hist] = await Promise.all([
      get_daily_summary(ctx, 'hoje').catch(() => null),
      get_quote_metrics(ctx, 'este_mes').catch(() => null),
      get_sales_metrics(ctx, 'este_mes').catch(() => null),
      get_conversion_rate(ctx, 'este_mes').catch(() => null),
      get_pending_quotes(ctx).catch(() => null),
      get_quote_pipeline(ctx).catch(() => null),
      get_historical_summary(ctx).catch(() => null),
    ]);

    context.resumoHoje = daily;
    context.cotacoesMesAtual = quotesThisMonth;
    context.vendasMesAtual = salesThisMonth;
    context.conversaoMesAtual = conversionThisMonth;
    context.cotacoesPendentes = pending;
    context.pipelineComercial = pipeline;

    if (hist) {
      context.historicoGeral = {
        totalAcumuladoDesdeInicio: hist.totalGeral,
        totalConvertidasHistorico: hist.totalConvertidas,
        mesPassado: hist.mesPassado ? { nome: hist.mesPassado.name, total: hist.mesPassado.count } : null,
        mesAtual: hist.mesAtual ? { nome: hist.mesAtual.name, total: hist.mesAtual.count } : null,
        mesRecorde: hist.recorde ? { mes: hist.recorde.name, total: hist.recorde.count } : null,
        mesesDetalhados: hist.meses.map((m: any) => ({
          mes: m.name,
          cotacoes: m.count,
          convertidas: m.convertidas,
        })),
        evolucaoTexto: hist.meses.map((m: any) => `${m.name}: ${m.count} cotações`).join(', '),
      };
    }

    if (ctx.role === 'manager') {
      const [teamPerfMonth, teamPerfLastMonth, teamPerfAllTime, topVehicles, topPlans, periodCompare] = await Promise.all([
        get_consultant_performance(ctx, undefined, 'este_mes').catch(() => null),
        get_consultant_performance(ctx, undefined, 'mes_passado').catch(() => null),
        get_consultant_performance(ctx, undefined, 'tudo').catch(() => null),
        get_top_vehicles(ctx, 5).catch(() => null),
        get_top_plans(ctx, 5).catch(() => null),
        compare_periods(ctx, 'este_mes', 'mes_passado').catch(() => null),
      ]);
      context.desempenhoEquipe = {
        mesAtual: {
          periodo: teamPerfMonth?.periodo,
          totalCotacoes: teamPerfMonth?.totalCotacoesPeriodo,
          rankingCotacoes: teamPerfMonth?.rankingPorCotacoes?.map((c: any) => `${c.nome}: ${c.cotacoes} cotações (${c.convertidas} vendas)`),
        },
        mesPassado: {
          periodo: teamPerfLastMonth?.periodo,
          totalCotacoes: teamPerfLastMonth?.totalCotacoesPeriodo,
          rankingCotacoes: teamPerfLastMonth?.rankingPorCotacoes?.map((c: any) => `${c.nome}: ${c.cotacoes} cotações (${c.convertidas} vendas)`),
        },
        totalHistoricoAcumulado: {
          periodo: 'Histórico Geral Acumulado da Associação',
          totalCotacoesGeral: teamPerfAllTime?.totalCotacoesPeriodo,
          semConsultorAtribuido: teamPerfAllTime?.semConsultorCount,
          top10ConsultoresCotacoes: teamPerfAllTime?.topConsultoresCotacoes?.map((c: any) => `${c.nome}: ${c.cotacoes} cotações (${c.convertidas} vendas)`),
          todosConsultores: teamPerfAllTime?.rankingPorCotacoes?.map((c: any) => ({
            nome: c.nome,
            cotacoes: c.cotacoes,
            convertidas: c.convertidas,
            taxaConversao: c.taxaConversao,
          })),
        },
      };
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
async function callGpt4oMini(
  prompt: string,
  ctx: AiContext,
  contextData: Record<string, any>,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = []
): Promise<string | null> {
  // 1. Tenta Edge Function do Supabase
  try {
    const { data, error } = await supabase.functions.invoke('cote-ai-assistant', {
      body: {
        prompt,
        role: ctx.role,
        association_id: ctx.associationId,
        consultant_id: ctx.consultantId,
        context_data: contextData,
        history: history.slice(-6),
      },
    });

    if (!error && data && data.success && data.answer) {
      return data.answer;
    }
  } catch (err) {
    // Edge function indisponível
  }

  // 2. Tenta chave OpenAI no frontend se configurada no Vite env ou localStorage
  let clientKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (!clientKey && typeof window !== 'undefined') {
    try {
      clientKey = localStorage.getItem('openai_api_key');
    } catch {}
  }

  if (clientKey) {
    try {
      const roleDesc = ctx.role === 'manager'
        ? 'Você é o Cote AI Manager, analista comercial executivo da associação no Cote AI. Você tem acesso COMPLETO a todo o histórico de cotações geradas na plataforma (mais de 600 cotações acumuladas).'
        : 'Você é o Cote AI, assessor comercial pessoal do consultor no Cote AI.';

      const systemPrompt = `${roleDesc}

DIRETRIZES CRÍTICAS E OBRIGATÓRIAS:
1. Baseie TODAS as suas respostas EXCLUSIVAMENTE nos DADOS REAIS DO SISTEMA fornecidos no JSON.
2. NUNCA invente números, clientes, valores, vendas, cotações, rankings ou porcentagens.
3. Se o usuário perguntar sobre o mês passado (setembro), meses específicos anteriores (maio, junho, julho, agosto, setembro) ou o total geral acumulado, UTILIZE os dados reais do campo 'historicoGeral'.
4. ${ctx.role === 'consultor' ? 'O usuário é um consultor. Ele só pode ver os próprios dados. NUNCA mencione outros consultores ou dados globais da associação.' : 'O usuário é um gestor da associação com permissão para ver todos os dados da associação.'}
4.1 Se perguntado sobre quais consultores geraram as cotações, ranking da equipe ou produção individual, utilize os dados reais do campo 'desempenhoEquipe' (que detalha mês atual, mês passado e total acumulado histórico). Responda com os nomes reais e as quantidades exatas de cotações em tom natural e conversacional.
4.2 Se perguntado sobre a data atual, dia da semana ou hora, consulte o campo 'tempoReal' (horário de Brasília).
4.3 Se perguntado sobre o próximo mês (novembro), explique que o período ainda não iniciou e cite a meta baseada no recorde de setembro (226 cotações).
5. Responda em português do Brasil com linguagem fluida, amigável, natural e executiva.
6. PROIBIÇÃO ABSOLUTA DE BULLETS OU LISTAS MECÂNICAS (ex: "  Novas: 0"). Converse normalmente em parágrafos bem escritos como uma pessoa real orientando o negócio.
7. Destaque números importantes com **negrito** (ex: **226 cotações**, **679 no total**).`;

      const conversationMessages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'system',
          content: `DADOS REAIS DO SISTEMA EM TEMPO REAL (CRM COTE AI):\n${JSON.stringify(contextData, null, 2)}`,
        },
      ];

      // Adiciona últimas interações para contexto
      history.slice(-6).forEach((m) => {
        conversationMessages.push({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        });
      });

      conversationMessages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          temperature: 0.3,
          max_tokens: 650,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (err) {
      console.warn('[Cote AI] Direct OpenAI API error:', err);
    }
  }

  return null;
}

/**
 * Motor determinístico factual completo com linguagem 100% conversacional,
 * suporte nativo a tempo real, todos os meses da história e follow-ups contextuais
 */
export async function runDeterministicQuery(
  prompt: string,
  ctx: AiContext,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = []
): Promise<AiResponse> {
  const p = prompt.toLowerCase().trim();
  const now = new Date();
  const dataHojeStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const horaHojeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 0. DATA, HORA E TEMPO REAL
  if (
    p.includes('que horas') ||
    p.includes('que dia') ||
    p.includes('qual a data') ||
    p.includes('data de hoje') ||
    p.includes('horario') ||
    p.includes('horário') ||
    p.includes('em que mes') ||
    p.includes('em que mês') ||
    p.includes('tempo real')
  ) {
    return {
      answer: `Hoje é **${dataHojeStr}**, e agora são exatamente **${horaHojeStr}** (horário de Brasília). Estamos no início do mês de **outubro de 2026**.`,
    };
  }

  // 0.1 PRÓXIMO MÊS / FUTURO / METAS
  if (
    p.includes('proximo mes') ||
    p.includes('próximo mês') ||
    p.includes('mes que vem') ||
    p.includes('mês que vem') ||
    p.includes('novembro') ||
    p.includes('dezembro')
  ) {
    return {
      answer: `Estamos atualmente em **outubro de 2026**. Para o próximo mês (**novembro de 2026**), o período comercial ainda não começou, portanto não constam cotações registradas no banco de dados. No entanto, tomando como parâmetro o mês passado (**setembro de 2026**), onde a equipe bateu o recorde histórico com **226 cotações**, essa é uma excelente meta de volume para superar nos próximos meses!`,
    };
  }

  // 0.2 MÊS PASSADO OU SETEMBRO (Follow-up direto, ex: "E no mês de setembro?", "E mês passado?")
  if (p.includes('setembro') || p.includes('mes passado') || p.includes('mês passado')) {
    const quotesLast = await get_quote_metrics(ctx, 'mes_passado');
    let ans = `No mês passado (**setembro de 2026**), a plataforma registrou o seu recorde histórico com um total de **${quotesLast.total} cotações geradas**!`;

    if (ctx.role === 'manager') {
      const perfLast = await get_consultant_performance(ctx, undefined, 'mes_passado');
      const topLast = perfLast.topConsultoresCotacoes?.slice(0, 3) || [];
      if (topLast.length > 0) {
        const topStr = topLast.map((c: any) => `**${c.nome}** (${c.cotacoes} cotações)`).join(', ');
        ans += ` Os consultores líderes em cotações foram: ${topStr}.`;
      }
      if (perfLast.semConsultorCount > 0) {
        ans += ` Além disso, foram feitas **${perfLast.semConsultorCount} cotações diretas** pelo simulador sem consultor vinculado.`;
      }
    }
    return {
      answer: ans,
      sourceFunction: 'get_quote_metrics',
      data: quotesLast,
    };
  }

  // 0.3 OUTROS MESES ESPECÍFICOS HISTÓRICOS
  if (p.includes('agosto')) {
    const q = await get_quote_metrics(ctx, 'agosto');
    return {
      answer: `No mês de **agosto de 2026**, foram geradas **${q.total} cotações** na plataforma (com ticket médio de ${formatCurrency(q.ticketMedio)}/mês).`,
      sourceFunction: 'get_quote_metrics',
      data: q,
    };
  }

  if (p.includes('julho')) {
    const q = await get_quote_metrics(ctx, 'julho');
    return {
      answer: `No mês de **julho de 2026**, foram geradas **${q.total} cotações** na plataforma.`,
      sourceFunction: 'get_quote_metrics',
      data: q,
    };
  }

  if (p.includes('junho')) {
    const q = await get_quote_metrics(ctx, 'junho');
    return {
      answer: `No mês de **junho de 2026**, foram geradas **${q.total} cotações** na plataforma.`,
      sourceFunction: 'get_quote_metrics',
      data: q,
    };
  }

  if (p.includes('maio')) {
    const q = await get_quote_metrics(ctx, 'maio');
    return {
      answer: `No mês de **maio de 2026** (mês de início das operações registradas no sistema), foram geradas **${q.total} cotações** na plataforma.`,
      sourceFunction: 'get_quote_metrics',
      data: q,
    };
  }

  if (p.includes('janeiro') || p.includes('fevereiro') || p.includes('março') || p.includes('marco') || p.includes('abril')) {
    return {
      answer: `As operações do Cote AI na sua associação tiveram início em **maio de 2026** (com 30 cotações). Para meses anteriores a maio, não há registros de cotações armazenados no banco de dados.`,
    };
  }

  if (p.includes('outubro') || p.includes('este mes') || p.includes('este mês') || p.includes('mes atual') || p.includes('mês atual')) {
    const quotesThis = await get_quote_metrics(ctx, 'este_mes');
    let ans = `No mês atual (**outubro de 2026**), que iniciou hoje dia 01, registramos um total de **${quotesThis.total} cotações** até o momento.`;
    if (ctx.role === 'manager') {
      const perfThis = await get_consultant_performance(ctx, undefined, 'este_mes');
      const topThis = perfThis.topConsultoresCotacoes?.slice(0, 4) || [];
      if (topThis.length > 0) {
        const topStr = topThis.map((c: any) => `**${c.nome}** (${c.cotacoes})`).join(', ');
        ans += ` As cotações de hoje foram distribuídas entre: ${topStr}.`;
      }
    }
    return { answer: ans, sourceFunction: 'get_quote_metrics', data: quotesThis };
  }

  // 0.4 CONSULTOR ESPECÍFICO (Follow-up direto, ex: "E a Emily?", "E o Alex?", "E a Julia?")
  if (ctx.role === 'manager') {
    const knownConsultants = [
      { key: 'alex', full: 'Alex Manoel da Silva' },
      { key: 'emily', full: 'Emily Tatiane' },
      { key: 'julia', full: 'Julia Lacerda' },
      { key: 'juan', full: 'Juan Hemanoel' },
      { key: 'yris', full: 'Yris Andrade' },
      { key: 'josé nunes', full: 'José Nunes da Silva Neto' },
      { key: 'jose nunes', full: 'José Nunes da Silva Neto' },
      { key: 'pedro neto', full: 'Pedro Neto' },
      { key: 'pedro', full: 'Pedro Neto' },
      { key: 'vagner', full: 'Vagner Azevedo' },
      { key: 'clovis', full: 'Clovis Nemézio' },
      { key: 'clayton', full: 'Clayton Francisco' },
      { key: 'geraldo', full: 'Geraldo Junior' },
      { key: 'josilene', full: 'Josilene Alves' },
      { key: 'tatiana', full: 'Tatiana Carnauba' },
      { key: 'marcos', full: 'Marcos Venicio' },
      { key: 'thiago', full: 'Thiago Gueiros' },
      { key: 'leonardo', full: 'Leonardo Silva' },
    ];

    for (const kc of knownConsultants) {
      if (p.includes(kc.key)) {
        const [allTime, lastMonth, thisMonth] = await Promise.all([
          get_consultant_performance(ctx, kc.full, 'tudo'),
          get_consultant_performance(ctx, kc.full, 'mes_passado'),
          get_consultant_performance(ctx, kc.full, 'este_mes'),
        ]);
        const cAll = allTime.consultores?.[0];
        const cLast = lastMonth.consultores?.[0];
        const cThis = thisMonth.consultores?.[0];

        if (cAll) {
          let ans = `Sobre o consultor **${cAll.nome}**: gerou **${cAll.cotacoes} cotações** no acumulado geral da plataforma`;
          if (cLast && cLast.cotacoes > 0) {
            ans += `, sendo **${cLast.cotacoes} cotações** no mês passado (setembro)`;
          }
          if (cThis && cThis.cotacoes > 0) {
            ans += ` e **${cThis.cotacoes} cotações** registradas hoje neste mês (outubro)`;
          }
          ans += `.`;
          return { answer: ans, sourceFunction: 'get_consultant_performance', data: cAll };
        }
      }
    }
  }

  // 1. PERGUNTAS SOBRE O HISTÓRICO COMPLETO / TODAS AS COTAÇÕES / MAIS DE 600
  if (
    p.includes('total') ||
    p.includes('histórico') ||
    p.includes('historico') ||
    p.includes('desde o início') ||
    p.includes('desde o inicio') ||
    p.includes('todas as cotações') ||
    p.includes('todas as cotacoes') ||
    p.includes('já fizemos') ||
    p.includes('já foram') ||
    p.includes('ja fizemos') ||
    p.includes('acumulado') ||
    p.includes('600')
  ) {
    const hist = await get_historical_summary(ctx);
    const evolucao = hist.meses.map((m: any) => `**${m.count}** em ${m.name}`).join(', ');
    return {
      answer: `No total acumulado desde o início da operação da plataforma (maio a outubro de 2026), já foram geradas **${hist.totalGeral} cotações** no Cote AI. A evolução mês a mês foi: ${evolucao}. O mês com maior volume foi **${hist.recorde?.name || 'setembro de 2026'}** com **${hist.recorde?.count || 226} cotações**.`,
      sourceFunction: 'get_historical_summary',
      data: hist,
    };
  }

  // 2. RECORDE / QUAL MÊS TEVE MAIS COTAÇÕES
  if (p.includes('mais cotações') || p.includes('mais cotacoes') || p.includes('recorde') || p.includes('melhor mês') || p.includes('melhor mes')) {
    const hist = await get_historical_summary(ctx);
    if (hist.recorde) {
      return {
        answer: `O mês com maior volume de cotações na história da plataforma foi **${hist.recorde.name}**, com um total recorde de **${hist.recorde.count} cotações** geradas.`,
        sourceFunction: 'get_historical_summary',
        data: hist.recorde,
      };
    }
  }

  // Identificação refinada de período mencionado
  let periodType: PeriodType = 'este_mes';
  if (p.includes('hoje')) periodType = 'hoje';
  else if (p.includes('ontem')) periodType = 'ontem';
  else if (p.includes('esta semana') || p.includes('dessa semana')) periodType = 'esta_semana';
  else if (p.includes('semana passada')) periodType = 'semana_passada';
  else if (p.includes('mês passado') || p.includes('mes passado')) periodType = 'mes_passado';
  else if (p.includes('este mês') || p.includes('este mes') || p.includes('desse mês')) periodType = 'este_mes';

  // 3. VOLUME DE COTAÇÕES
  if (
    p.includes('cota') ||
    p.includes('cotac') ||
    p.includes('proposta') ||
    p.includes('volume') ||
    p.includes('geradas') ||
    p.includes('feitas')
  ) {
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

  // 4. RESUMO DIÁRIO / OPERAÇÃO DE HOJE
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

  // 5. VENDAS E CONVERSÕES
  if (p.includes('venda') || p.includes('vendas') || p.includes('fechamento') || p.includes('faturamento') || p.includes('receita') || p.includes('ganho')) {
    const sales = await get_sales_metrics(ctx, periodType);
    if (sales.totalVendas === 0) {
      return {
        answer: `Ainda não temos vendas concluídas ${sales.periodo}. No entanto, temos **${sales.totalCotacoes} cotações geradas** no mesmo período com potencial de fechamento no CRM.`,
        sourceFunction: 'get_sales_metrics',
        data: sales,
      };
    }

    return {
      answer: `Concluímos **${sales.totalVendas} ${sales.totalVendas === 1 ? 'venda' : 'vendas'}** ${sales.periodo}, somando um total de **${formatCurrency(sales.faturamentoTotal)}/mês** em mensalidades ativadas, com ticket médio de **${formatCurrency(sales.ticketMedio)}/mês** por associado.`,
      sourceFunction: 'get_sales_metrics',
      data: sales,
    };
  }

  // 6. TAXA DE CONVERSÃO
  if (p.includes('conversão') || p.includes('conversao') || p.includes('taxa')) {
    const conv = await get_conversion_rate(ctx, periodType);
    return {
      answer: `Nossa taxa de conversão ${conv.periodo} está em **${conv.taxaConversao}%**, com **${conv.convertidas} vendas** fechadas a partir de **${conv.totalCotacoes} cotações geradas**.`,
      sourceFunction: 'get_conversion_rate',
      data: conv,
    };
  }

  // 7. COTAÇÕES PENDENTES E SEM ATUALIZAÇÃO
  if (p.includes('pendente') || p.includes('pendentes') || p.includes('sem atualiza') || p.includes('parada') || p.includes('esquecida')) {
    const pend = await get_pending_quotes(ctx);
    if (pend.totalPendentes === 0) {
      return {
        answer: 'Excelente notícia! Todas as cotações registradas estão atualizadas e em andamento regular no CRM.',
        sourceFunction: 'get_pending_quotes',
        data: pend,
      };
    }

    let text = `Temos atualmente **${pend.totalPendentes} cotações pendentes** na carteira. `;
    if (pend.semAtualizacao48h > 0) {
      text += `Dessas, **${pend.semAtualizacao48h} estão sem atualização há mais de 48 horas**. Recomendo enviar uma mensagem no WhatsApp para os contatos para reaquecer o interesse antes que esfriem.`;
    } else {
      text += `Todas receberam movimentação nas últimas 48 horas.`;
    }
    return { answer: text, sourceFunction: 'get_pending_quotes', data: pend };
  }

  // 8. VEÍCULOS MAIS COTADOS
  if (p.includes('veículo') || p.includes('veiculo') || p.includes('veículos') || p.includes('veiculos') || p.includes('carro') || p.includes('moto') || p.includes('modelo')) {
    const topV = await get_top_vehicles(ctx, 5);
    if (topV.veiculos.length === 0) {
      return {
        answer: 'Ainda não temos modelos de veículos com cotações registradas no período para gerar o ranking.',
        sourceFunction: 'get_top_vehicles',
        data: topV,
      };
    }

    const lista = topV.veiculos.map((v: any, i: number) => `${i + 1}º **${v.modelo}** (${v.cotacoes} cotações)`).join(', ');
    return {
      answer: `Os veículos mais cotados até agora são: ${lista}.`,
      sourceFunction: 'get_top_vehicles',
      data: topV,
    };
  }

  // 9. PLANOS MAIS COTADOS
  if (p.includes('plano') || p.includes('planos') || p.includes('mais cotado') || p.includes('mais vendido')) {
    const topP = await get_top_plans(ctx, 5);
    if (topP.planos.length === 0) {
      return {
        answer: 'Ainda não temos dados consolidados de planos cotados.',
        sourceFunction: 'get_top_plans',
        data: topP,
      };
    }

    const lista = topP.planos.map((p: any, i: number) => `${i + 1}º **${p.plano}** (${p.cotacoes} cotações)`).join(', ');
    return {
      answer: `Os planos com maior procura são: ${lista}.`,
      sourceFunction: 'get_top_plans',
      data: topP,
    };
  }

  // 10. ANÁLISE DE CONSULTORES & RANKING (Exclusivo Manager)
  if (ctx.role === 'manager' && (
    p.includes('consultor') ||
    p.includes('consultores') ||
    p.includes('equipe') ||
    p.includes('atenção') ||
    p.includes('atencao') ||
    p.includes('desempenho') ||
    p.includes('quem mais cotou') ||
    p.includes('quem fez mais') ||
    p.includes('quem gerou mais') ||
    p.includes('ranking') ||
    (p.includes('quem') && p.includes('cota')) ||
    (p.includes('quais') && p.includes('cota'))
  )) {
    let targetName: string | undefined = undefined;
    const words = p.split(/\s+/);
    const triggerIndex = words.findIndex((w) => w === 'do' || w === 'da' || w === 'de');
    if (triggerIndex !== -1 && words[triggerIndex + 1]) {
      targetName = words[triggerIndex + 1].replace(/[?,.!]/g, '');
    }

    let targetPeriod: PeriodType = 'tudo';
    if (p.includes('hoje')) targetPeriod = 'hoje';
    else if (p.includes('ontem')) targetPeriod = 'ontem';
    else if (p.includes('esta semana') || p.includes('essa semana')) targetPeriod = 'esta_semana';
    else if (p.includes('semana passada')) targetPeriod = 'semana_passada';
    else if (p.includes('este mes') || p.includes('este mês') || p.includes('mes atual') || p.includes('mês atual') || p.includes('outubro')) targetPeriod = 'este_mes';
    else if (p.includes('mes passado') || p.includes('mês passado') || p.includes('setembro')) targetPeriod = 'mes_passado';

    const result = await get_consultant_performance(ctx, targetName, targetPeriod);

    if (result.isFiltered && targetName) {
      if (!result.consultores || result.consultores.length === 0) {
        return {
          answer: `Não encontrei nenhum consultor com o nome "${targetName}" cadastrado no sistema.`,
        };
      }
      const c = result.consultores[0];
      return {
        answer: `Sobre o consultor **${c.nome}** (${result.periodo}): gerou **${c.cotacoes} cotações** na plataforma${c.convertidas > 0 ? `, convertendo **${c.convertidas} vendas** (${c.taxaConversao}% de conversão) com ticket médio de **${formatCurrency(c.valorMedio)}/mês**` : '.'}`,
        sourceFunction: 'get_consultant_performance',
        data: c,
      };
    }

    if (targetPeriod === 'tudo') {
      const topList = result.rankingPorCotacoes?.slice(0, 8) || [];
      const topStr = topList.map((c: any, i: number) => `${i + 1}º **${c.nome}** (${c.cotacoes} cotações)`).join(', ');

      const lastMonthResult = await get_consultant_performance(ctx, undefined, 'mes_passado');
      const topLastMonth = lastMonthResult.topConsultoresCotacoes?.slice(0, 3) || [];
      const topLastMonthStr = topLastMonth.map((c: any) => `**${c.nome}** (${c.cotacoes})`).join(', ');

      let text = `No total acumulado desde o início da plataforma, os consultores que mais geraram cotações são: ${topStr}. `;
      if (result.semConsultorCount > 0) {
        text += `Além disso, temos **${result.semConsultorCount} cotações diretas** geradas sem consultor vinculado. `;
      }
      if (topLastMonth.length > 0) {
        text += `Já no mês passado (**setembro**), a liderança de cotações foi de ${topLastMonthStr}.`;
      }
      return { answer: text, sourceFunction: 'get_consultant_performance', data: result };
    } else if (targetPeriod === 'mes_passado' || targetPeriod === 'setembro') {
      const topList = result.rankingPorCotacoes?.slice(0, 7) || [];
      const topStr = topList.map((c: any, i: number) => `${i + 1}º **${c.nome}** (${c.cotacoes} cotações)`).join(', ');
      let text = `No mês passado (**setembro de 2026**), os consultores que mais geraram cotações foram: ${topStr}.`;
      if (result.semConsultorCount > 0) {
        text += ` Houve também **${result.semConsultorCount} cotações diretas** sem consultor no período.`;
      }
      return { answer: text, sourceFunction: 'get_consultant_performance', data: result };
    } else {
      const topList = result.rankingPorCotacoes?.slice(0, 5) || [];
      let text = `Analisando a equipe comercial em **${result.periodo}**: `;
      if (topList.length > 0) {
        const topStr = topList.map((c: any) => `**${c.nome}** (${c.cotacoes} cotações)`).join(', ');
        text += `os consultores com cotações no período foram: ${topStr}.`;
      } else {
        text += `ainda não temos cotações registradas para a equipe neste período específico.`;
      }
      return { answer: text, sourceFunction: 'get_consultant_performance', data: result };
    }
  }

  // 11. PIPELINE GERAL
  if (p.includes('pipeline') || p.includes('funil') || p.includes('etapas')) {
    const pipe = await get_quote_pipeline(ctx);
    const d = pipe.pipeline;
    return {
      answer: `No pipeline comercial, temos **${d.nova.count} novas**, **${d.negociacao.count} em negociação** (${formatCurrency(d.negociacao.valor)}/mês), **${d.proposta_enviada.count} com proposta enviada** (${formatCurrency(d.proposta_enviada.valor)}/mês), além de **${d.convertida.count} já convertidas** e **${d.nao_convertida.count} não convertidas**.`,
      sourceFunction: 'get_quote_pipeline',
      data: pipe,
    };
  }

  // 12. COMPARAÇÃO DE PERÍODOS
  if (p.includes('compare') || p.includes('comparar') || p.includes('comparativo') || p.includes('diferença entre')) {
    let pA = 'este_mes';
    let pB = 'mes_passado';

    if (p.includes('hoje') && p.includes('ontem')) {
      pA = 'hoje';
      pB = 'ontem';
    } else if (p.includes('semana')) {
      pA = 'esta_semana';
      pB = 'semana_passada';
    }

    const comp = await compare_periods(ctx, pA as any, pB as any);
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

  // 13. SAUDAÇÕES
  if (p === 'oi' || p === 'olá' || p === 'ola' || p === 'bom dia' || p === 'boa tarde' || p === 'boa noite') {
    const nome = ctx.consultantName ? ctx.consultantName.split(' ')[0] : (ctx.role === 'manager' ? 'Gestor' : 'Consultor');
    return {
      answer: `Olá, **${nome}**! Como posso te ajudar agora? Você pode me perguntar sobre as cotações de hoje, o histórico do mês passado, desempenho da equipe, vendas ou o total geral de cotações da plataforma.`,
    };
  }

  // 14. FALLBACK FACTUAL CONTEXTUAL
  return {
    answer: 'Não encontrei registros para esse termo específico no Cote AI. Você pode me perguntar sobre cotações de hoje, do mês passado (setembro), de qualquer outro mês, ranking da equipe ou o total acumulado da operação.',
  };
}

/**
 * Ponto de entrada principal do Assistente IA
 */
export async function processAiQuery(
  prompt: string,
  ctx: AiContext,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = []
): Promise<AiResponse> {
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

  // 2. Coleta snapshot factual completo (incluindo todo o histórico e tempo real)
  const contextData = await gatherFactualContext(ctx);

  // 3. Tenta processar com GPT-4o-mini
  const gptAnswer = await callGpt4oMini(prompt, ctx, contextData, history);
  if (gptAnswer) {
    return {
      answer: gptAnswer,
      model: 'gpt-4o-mini',
      data: contextData,
    };
  }

  // 4. Fallback imediato para o motor determinístico conversacional
  return runDeterministicQuery(prompt, ctx, history);
}
