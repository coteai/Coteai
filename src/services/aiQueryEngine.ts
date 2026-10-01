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
}

/**
 * Processa a pergunta do usuário e devolve uma resposta estritamente factual
 */
export async function processAiQuery(prompt: string, ctx: AiContext): Promise<AiResponse> {
  const p = prompt.toLowerCase().trim();

  // 1. VERIFICAÇÃO DE SEGURANÇA E ESCOPO PARA O CONSULTOR
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

  // Identificação do período mencionado na pergunta
  let periodType: 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | 'este_mes' | 'mes_passado' | 'tudo' = 'este_mes';
  if (p.includes('hoje')) periodType = 'hoje';
  else if (p.includes('ontem')) periodType = 'ontem';
  else if (p.includes('esta semana') || p.includes('dessa semana')) periodType = 'esta_semana';
  else if (p.includes('semana passada')) periodType = 'semana_passada';
  else if (p.includes('mês passado') || p.includes('mes passado')) periodType = 'mes_passado';
  else if (p.includes('este mês') || p.includes('este mes') || p.includes('desse mês')) periodType = 'este_mes';
  else if (p.includes('sempre') || p.includes('total') || p.includes('histórico')) periodType = 'tudo';

  // 2. RESUMO DIÁRIO / OPERAÇÃO DE HOJE
  if (p.includes('resumo da operação') || p.includes('resumo de hoje') || p.includes('como foi nossa operação') || p.includes('como foi hoje') || p.includes('meu resumo de hoje') || p.includes('resumo do dia')) {
    const summary = await get_daily_summary(ctx, periodType === 'ontem' ? 'ontem' : 'hoje');

    if (summary.total === 0) {
      return {
        answer: `**Resumo da operação de ${summary.dataReferencia}:**\n\nNenhuma cotação foi registrada ${summary.dataReferencia} até o momento.\n\n*Nota:* Fique atento às oportunidades no CRM para iniciar novas negociações.`,
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

  // 3. COMPARAÇÃO DE PERÍODOS
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
    text += `| Indicador | ${A.nome} | ${B.nome} | Variação |\n`;
    text += `| :--- | :---: | :---: | :---: |\n`;
    text += `| **Cotações** | ${A.total} | ${B.total} | ${comp.diferencas.diffCotacoes >= 0 ? `+${comp.diferencas.diffCotacoes}` : comp.diferencas.diffCotacoes} |\n`;
    text += `| **Convertidas** | ${A.convertidas} | ${B.convertidas} | ${comp.diferencas.diffConvertidas >= 0 ? `+${comp.diferencas.diffConvertidas}` : comp.diferencas.diffConvertidas} |\n`;
    text += `| **Taxa de Conversão** | ${A.taxa}% | ${B.taxa}% | ${comp.diferencas.diffTaxa >= 0 ? `+${comp.diferencas.diffTaxa}%` : `${comp.diferencas.diffTaxa}%`} |\n`;
    text += `| **Ticket Médio** | ${formatCurrency(A.ticket)} | ${formatCurrency(B.ticket)} | - |\n\n`;

    if (comp.diferencas.crescimentoCotacoesPct !== null) {
      if (comp.diferencas.crescimentoCotacoesPct > 0) {
        text += `• O volume de cotações cresceu **${comp.diferencas.crescimentoCotacoesPct}%** em relação ao período anterior.\n`;
      } else if (comp.diferencas.crescimentoCotacoesPct < 0) {
        text += `• Houve uma retração de **${Math.abs(comp.diferencas.crescimentoCotacoesPct)}%** no volume de cotações.\n`;
      }
    }

    return { answer: text, sourceFunction: 'compare_periods', data: comp };
  }

  // 4. TAXA DE CONVERSÃO
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

  // 5. COTAÇÕES PENDENTES E SEM ATUALIZAÇÃO
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
      text += `🚨 **${pending.semAtualizacao48h} cotações estão sem atualização há mais de 48 horas!**\n`;
      if (pending.exemplos48h.length > 0) {
        text += '\nExemplos prioritários para contato:\n';
        pending.exemplos48h.forEach((item: any) => {
          text += `• **${item.cliente}** - ${item.modelo} (${item.placa || 'Sem placa'}) - ${formatCurrency(item.valor)}/mês\n`;
        });
      }
    } else {
      text += 'Todas as cotações pendentes tiveram interações nas últimas 48 horas.';
    }

    return { answer: text, sourceFunction: 'get_pending_quotes', data: pending };
  }

  // 6. VENDAS / CONVERSÕES
  if (p.includes('quantas vendas') || p.includes('total de vendas') || p.includes('vendas fiz') || p.includes('vendas tivemos') || p.includes('convertidas')) {
    const sales = await get_sales_metrics(ctx, periodType);
    return {
      answer: `Em **${sales.periodo}**, foram realizadas **${sales.totalVendas} vendas convertidas**.\n\n• Mensalidade total gerada: **${formatCurrency(sales.mensalidadeTotal)}/mês**\n• Ticket médio da proposta: **${formatCurrency(sales.ticketMedio)}/mês**\n• Total de cotações analisadas no período: **${sales.totalCotacoesPeriodo}**`,
      sourceFunction: 'get_sales_metrics',
      data: sales,
    };
  }

  // 7. VOLUME DE COTAÇÕES
  if (p.includes('quantas cotações') || p.includes('quantas cotacoes') || p.includes('total de cotações') || p.includes('volume de cotações')) {
    const qMetrics = await get_quote_metrics(ctx, periodType);
    return {
      answer: `Foram geradas **${qMetrics.total} cotações** em **${qMetrics.periodo}**.\n\nDistribuição atual:\n• Novas: **${qMetrics.novas}**\n• Em negociação: **${qMetrics.negociacao}**\n• Propostas enviadas: **${qMetrics.proposta_enviada}**\n• Convertidas: **${qMetrics.convertida}**\n• Não convertidas: **${qMetrics.nao_convertida}**`,
      sourceFunction: 'get_quote_metrics',
      data: qMetrics,
    };
  }

  // 8. VEÍCULOS MAIS COTADOS
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

  // 9. PLANOS MAIS COTADOS
  if (p.includes('plano') || p.includes('planos')) {
    const topP = await get_top_plans(ctx, 5);
    if (topP.topPlanos.length === 0) {
      return { answer: 'Não tenho esse dado registrado no Cote AI (nenhum plano cotado ainda).' };
    }
    let text = `📋 **Planos mais cotados e aceitos:**\n\n`;
    topP.topPlanos.forEach((pItem, idx) => {
      text += `${idx + 1}. **${pItem.plano}**: ${pItem.cotacoes} cotações | ${pItem.convertidas} convertidas (${pItem.taxaConversao}%)\n`;
    });
    return { answer: text, sourceFunction: 'get_top_plans', data: topP };
  }

  // 10. ANÁLISE DE CONSULTORES (Exclusivo Manager)
  if (ctx.role === 'manager' && (p.includes('consultor') || p.includes('consultores') || p.includes('equipe') || p.includes('atenção') || p.includes('atencao') || p.includes('desempenho'))) {
    // Tenta identificar se o gestor pediu um nome específico
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

    // Visão geral de consultores
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

  // 11. PIPELINE GERAL
  if (p.includes('pipeline') || p.includes('funil') || p.includes('etapas')) {
    const pipe = await get_quote_pipeline(ctx);
    const d = pipe.pipeline;
    return {
      answer: `📊 **Pipeline Comercial Ativo:**\n\n• **Novas:** ${d.nova.count} (${formatCurrency(d.nova.valor)}/mês)\n• **Em Negociação:** ${d.negociacao.count} (${formatCurrency(d.negociacao.valor)}/mês)\n• **Proposta Enviada:** ${d.proposta_enviada.count} (${formatCurrency(d.proposta_enviada.valor)}/mês)\n• **Convertidas:** ${d.convertida.count} (${formatCurrency(d.convertida.valor)}/mês)\n• **Não Convertidas:** ${d.nao_convertida.count}`,
      sourceFunction: 'get_quote_pipeline',
      data: pipe,
    };
  }

  // 12. PERGUNTAS SEM DADOS / NÃO REGISTRADO (REGRA 10)
  return {
    answer: 'Não tenho esse dado registrado no Cote AI. Você pode me perguntar sobre cotações, vendas, taxa de conversão, cotações pendentes, comparativos de períodos ou resumo da operação.',
  };
}

