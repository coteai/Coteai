import { supabase } from '@/lib/supabase';
import type { CommercialStatus } from '../utils/crmStatus';
import { normalizeCommercialStatus } from '../utils/crmStatus';

export interface AiContext {
  role: 'consultor' | 'manager';
  associationId: string;
  consultantId?: string;
  consultantName?: string;
}

export interface PeriodFilter {
  startDate?: Date;
  endDate?: Date;
  label: string;
}

export type PeriodType =
  | 'hoje'
  | 'ontem'
  | 'esta_semana'
  | 'semana_passada'
  | 'este_mes'
  | 'mes_passado'
  | 'tudo'
  | 'janeiro'
  | 'fevereiro'
  | 'março'
  | 'marco'
  | 'abril'
  | 'maio'
  | 'junho'
  | 'julho'
  | 'agosto'
  | 'setembro'
  | 'outubro'
  | 'novembro'
  | 'dezembro';

// Helpers de Período com suporte a todos os meses históricos da plataforma
export function getPeriodDates(periodType: PeriodType | string = 'este_mes'): PeriodFilter {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Mapeamento de meses individuais
  const monthsIdx: Record<string, number> = {
    janeiro: 0,
    fevereiro: 1,
    março: 2,
    marco: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11,
  };

  const pLower = String(periodType || '').toLowerCase().trim();

  if (pLower in monthsIdx) {
    const mIdx = monthsIdx[pLower];
    const year = now.getFullYear();
    const startOfMonth = new Date(year, mIdx, 1, 0, 0, 0);
    const endOfMonth = new Date(year, mIdx + 1, 0, 23, 59, 59, 999);
    const MONTH_LABELS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return { startDate: startOfMonth, endDate: endOfMonth, label: `em ${MONTH_LABELS[mIdx]}` };
  }

  switch (pLower) {
    case 'hoje':
      return { startDate: startOfToday, endDate: endOfToday, label: 'hoje' };

    case 'ontem': {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return { startDate: startOfYesterday, endDate: endOfYesterday, label: 'ontem' };
    }

    case 'esta_semana': {
      const dayOfWeek = now.getDay(); // 0 = Domingo
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      return { startDate: startOfWeek, endDate: endOfToday, label: 'esta semana' };
    }

    case 'semana_passada': {
      const dayOfWeek = now.getDay();
      const endOfLastWeek = new Date(startOfToday);
      endOfLastWeek.setDate(endOfLastWeek.getDate() - dayOfWeek - 1);
      endOfLastWeek.setHours(23, 59, 59, 999);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
      startOfLastWeek.setHours(0, 0, 0, 0);
      return { startDate: startOfLastWeek, endDate: endOfLastWeek, label: 'semana passada' };
    }

    case 'este_mes': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return { startDate: startOfMonth, endDate: endOfToday, label: 'este mês' };
    }

    case 'mes_passado': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: startOfLastMonth, endDate: endOfLastMonth, label: 'mês passado' };
    }

    case 'tudo':
    default:
      return { label: 'no total acumulado' };
  }
}

/**
 * Consulta cotações com filtros de segurança obrigatórios
 */
async function fetchSecureQuotes(ctx: AiContext, period?: PeriodFilter): Promise<any[]> {
  let assocId = ctx.associationId;
  if (!assocId) {
    try {
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) assocId = JSON.parse(adminSession).id;
      else {
        const consultorSession = localStorage.getItem('consultor_session');
        if (consultorSession) assocId = JSON.parse(consultorSession).association_id;
      }
    } catch (e) {}
  }
  if (!assocId) return [];

  let query = supabase
    .from('quotes')
    .select('id, created_at, status, mensalidade, plano_selecionado, cliente_nome, cliente_whatsapp, placa, modelo, valor_fipe, consultant_id, consultants(id, nome)')
    .eq('association_id', assocId);

  // SEGURANÇA: Se for consultor, restringe OBRIGATORIAMENTE ao seu consultant_id
  if (ctx.role === 'consultor') {
    let consId = ctx.consultantId;
    if (!consId) {
      try {
        const consultorSession = localStorage.getItem('consultor_session');
        if (consultorSession) consId = JSON.parse(consultorSession).id;
      } catch (e) {}
    }
    if (!consId) return [];
    query = query.eq('consultant_id', consId);
  }

  if (period?.startDate) {
    query = query.gte('created_at', period.startDate.toISOString());
  }
  if (period?.endDate) {
    query = query.lte('created_at', period.endDate.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro na consulta segura do assistente:', error);
    return [];
  }
  return data || [];
}

// ========================================================
// 10 FUNÇÕES ANALÍTICAS CANÔNICAS DO COTE AI
// ========================================================

/**
 * 1. get_sales_metrics
 */
export async function get_sales_metrics(ctx: AiContext, periodType: 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | 'este_mes' | 'mes_passado' | 'tudo' = 'este_mes') {
  const period = getPeriodDates(periodType);
  const quotes = await fetchSecureQuotes(ctx, period);

  const converted = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'convertida');
  const totalVendas = converted.length;
  const mensalidadeTotal = converted.reduce((acc, q) => acc + (Number(q.mensalidade) || 0), 0);
  const ticketMedio = totalVendas > 0 ? Math.round(mensalidadeTotal / totalVendas) : 0;

  return {
    periodo: period.label,
    totalVendas,
    mensalidadeTotal,
    ticketMedio,
    totalCotacoesPeriodo: quotes.length,
  };
}

/**
 * 2. get_quote_metrics
 */
export async function get_quote_metrics(ctx: AiContext, periodType: 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | 'este_mes' | 'mes_passado' | 'tudo' = 'este_mes') {
  const period = getPeriodDates(periodType);
  const quotes = await fetchSecureQuotes(ctx, period);

  let novas = 0;
  let negociacao = 0;
  let proposta_enviada = 0;
  let convertida = 0;
  let nao_convertida = 0;

  quotes.forEach((q) => {
    const s = normalizeCommercialStatus(q.status);
    if (s === 'nova') novas++;
    else if (s === 'negociacao') negociacao++;
    else if (s === 'proposta_enviada') proposta_enviada++;
    else if (s === 'convertida') convertida++;
    else if (s === 'nao_convertida') nao_convertida++;
  });

  return {
    periodo: period.label,
    total: quotes.length,
    novas,
    negociacao,
    proposta_enviada,
    convertida,
    nao_convertida,
  };
}

/**
 * 3. get_conversion_rate
 */
export async function get_conversion_rate(ctx: AiContext, periodType: 'hoje' | 'ontem' | 'esta_semana' | 'semana_passada' | 'este_mes' | 'mes_passado' | 'tudo' = 'este_mes') {
  const period = getPeriodDates(periodType);
  const quotes = await fetchSecureQuotes(ctx, period);

  const total = quotes.length;
  const convertidas = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'convertida').length;
  const naoConvertidas = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'nao_convertida').length;
  const taxaConversao = total > 0 ? Number(((convertidas / total) * 100).toFixed(1)) : 0;

  return {
    periodo: period.label,
    total,
    convertidas,
    naoConvertidas,
    taxaConversao,
  };
}

/**
 * 4. get_consultant_performance
 */
export async function get_consultant_performance(
  ctx: AiContext,
  targetConsultantName?: string,
  periodType: PeriodType = 'este_mes'
) {
  // Se for Consultor: responde unicamente pelo próprio usuário
  if (ctx.role === 'consultor') {
    const period = getPeriodDates(periodType);
    const quotes = await fetchSecureQuotes(ctx, period);
    const total = quotes.length;
    const convertidas = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'convertida').length;
    const taxa = total > 0 ? Number(((convertidas / total) * 100).toFixed(1)) : 0;
    const mensalidade = quotes.reduce((acc, q) => acc + (Number(q.mensalidade) || 0), 0);

    return {
      isSingle: true,
      consultor: ctx.consultantName || 'Você',
      totalCotacoes: total,
      convertidas,
      taxaConversao: taxa,
      valorMedio: total > 0 ? Math.round(mensalidade / total) : 0,
      periodo: period.label,
    };
  }

  // Se for Manager: pode analisar todos os consultores da associação
  const period = getPeriodDates(periodType);
  const quotes = await fetchSecureQuotes(ctx, period);

  // Busca lista de consultores da associação
  const { data: consultants } = await supabase
    .from('consultants')
    .select('id, nome, ativo')
    .eq('association_id', ctx.associationId);

  const map: Record<string, { nome: string; cotacoes: number; convertidas: number; naoConvertidas: number; somaValor: number }> = {};

  (consultants || []).forEach((c) => {
    map[c.id] = { nome: c.nome, cotacoes: 0, convertidas: 0, naoConvertidas: 0, somaValor: 0 };
  });

  let semConsultorCount = 0;

  quotes.forEach((q) => {
    const cid = q.consultant_id;
    if (cid && map[cid]) {
      map[cid].cotacoes++;
      const s = normalizeCommercialStatus(q.status);
      if (s === 'convertida') map[cid].convertidas++;
      else if (s === 'nao_convertida') map[cid].naoConvertidas++;
      map[cid].somaValor += Number(q.mensalidade) || 0;
    } else {
      semConsultorCount++;
    }
  });

  const list = Object.keys(map).map((id) => {
    const item = map[id];
    const taxa = item.cotacoes > 0 ? Number(((item.convertidas / item.cotacoes) * 100).toFixed(1)) : 0;
    const valorMedio = item.cotacoes > 0 ? Math.round(item.somaValor / item.cotacoes) : 0;
    return {
      id,
      nome: item.nome,
      cotacoes: item.cotacoes,
      convertidas: item.convertidas,
      naoConvertidas: item.naoConvertidas,
      taxaConversao: taxa,
      valorMedio,
    };
  });

  // Se o gestor pediu um consultor específico (ex: "Alex", "Emily", "Julia")
  if (targetConsultantName) {
    const term = targetConsultantName.toLowerCase();
    const found = list.filter((c) => c.nome.toLowerCase().includes(term));
    return {
      periodo: period.label,
      consultores: found,
      isFiltered: true,
      searchTerm: targetConsultantName,
      semConsultorCount,
      totalCotacoesPeriodo: quotes.length,
    };
  }

  // Ordenações específicas
  const rankingPorCotacoes = [...list].filter((c) => c.cotacoes > 0).sort((a, b) => b.cotacoes - a.cotacoes);
  const rankingPorVendas = [...list].filter((c) => c.convertidas > 0).sort((a, b) => b.convertidas - a.convertidas || b.taxaConversao - a.taxaConversao);

  // Ordena lista padrão por volume de cotações
  list.sort((a, b) => b.cotacoes - a.cotacoes || b.convertidas - a.convertidas);

  return {
    periodo: period.label,
    consultores: list,
    semConsultorCount,
    totalCotacoesPeriodo: quotes.length,
    rankingPorCotacoes,
    rankingPorVendas,
    topConsultoresCotacoes: rankingPorCotacoes.slice(0, 10),
    topConsultorCotacoes: rankingPorCotacoes[0] || null,
    topConsultorConversao: [...list].filter((c) => c.cotacoes >= 2).sort((a, b) => b.taxaConversao - a.taxaConversao)[0] || null,
  };
}

/**
 * 5. get_quote_pipeline
 */
export async function get_quote_pipeline(ctx: AiContext) {
  const quotes = await fetchSecureQuotes(ctx);

  const pipeline = {
    nova: { count: 0, valor: 0 },
    negociacao: { count: 0, valor: 0 },
    proposta_enviada: { count: 0, valor: 0 },
    convertida: { count: 0, valor: 0 },
    nao_convertida: { count: 0, valor: 0 },
  };

  quotes.forEach((q) => {
    const s = normalizeCommercialStatus(q.status);
    const val = Number(q.mensalidade) || 0;
    if (pipeline[s]) {
      pipeline[s].count++;
      pipeline[s].valor += val;
    }
  });

  return {
    total: quotes.length,
    pipeline,
  };
}

/**
 * 6. get_pending_quotes
 */
export async function get_pending_quotes(ctx: AiContext) {
  const quotes = await fetchSecureQuotes(ctx);
  const now = Date.now();
  const MS_24H = 24 * 60 * 60 * 1000;
  const MS_48H = 48 * 60 * 60 * 1000;

  const pending = quotes.filter((q) => {
    const s = normalizeCommercialStatus(q.status);
    return s === 'nova' || s === 'negociacao' || s === 'proposta_enviada';
  });

  const stale24h: any[] = [];
  const stale48h: any[] = [];

  pending.forEach((q) => {
    const lastUpdate = new Date(q.updated_at || q.created_at || now).getTime();
    const diff = now - lastUpdate;
    if (diff >= MS_48H) {
      stale48h.push(q);
    } else if (diff >= MS_24H) {
      stale24h.push(q);
    }
  });

  return {
    totalPendentes: pending.length,
    semAtualizacao48h: stale48h.length,
    semAtualizacao24h: stale24h.length,
    exemplos48h: stale48h.slice(0, 5).map((q) => ({
      cliente: q.cliente_nome || 'Sem nome',
      placa: q.placa,
      modelo: q.modelo,
      valor: q.mensalidade,
      status: q.status,
    })),
  };
}

/**
 * 7. get_top_vehicles
 */
export async function get_top_vehicles(ctx: AiContext, limit = 5) {
  const quotes = await fetchSecureQuotes(ctx);
  const modelCount: Record<string, number> = {};

  quotes.forEach((q) => {
    if (q.modelo) {
      const clean = q.modelo.trim().toUpperCase();
      modelCount[clean] = (modelCount[clean] || 0) + 1;
    }
  });

  const sorted = Object.entries(modelCount)
    .map(([modelo, count]) => ({ modelo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return {
    totalAnalisadas: quotes.length,
    topVeiculos: sorted,
  };
}

/**
 * 8. get_top_plans
 */
export async function get_top_plans(ctx: AiContext, limit = 5) {
  const quotes = await fetchSecureQuotes(ctx);
  const planCount: Record<string, { total: number; convertidas: number }> = {};

  quotes.forEach((q) => {
    const plano = q.plano_selecionado || 'Cotação Padrão';
    if (!planCount[plano]) planCount[plano] = { total: 0, convertidas: 0 };
    planCount[plano].total++;
    if (normalizeCommercialStatus(q.status) === 'convertida') {
      planCount[plano].convertidas++;
    }
  });

  const sorted = Object.entries(planCount)
    .map(([plano, data]) => ({
      plano,
      cotacoes: data.total,
      convertidas: data.convertidas,
      taxaConversao: data.total > 0 ? Number(((data.convertidas / data.total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.cotacoes - a.cotacoes)
    .slice(0, limit);

  return {
    topPlanos: sorted,
  };
}

/**
 * 9. compare_periods
 */
export async function compare_periods(
  ctx: AiContext,
  periodAType: 'hoje' | 'esta_semana' | 'este_mes' = 'este_mes',
  periodBType: 'ontem' | 'semana_passada' | 'mes_passado' = 'mes_passado'
) {
  const pA = getPeriodDates(periodAType);
  const pB = getPeriodDates(periodBType);

  const quotesA = await fetchSecureQuotes(ctx, pA);
  const quotesB = await fetchSecureQuotes(ctx, pB);

  const calc = (quotes: any[]) => {
    const total = quotes.length;
    const convertidas = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'convertida').length;
    const negociacoes = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'negociacao').length;
    const propostas = quotes.filter((q) => normalizeCommercialStatus(q.status) === 'proposta_enviada').length;
    const soma = quotes.reduce((acc, q) => acc + (Number(q.mensalidade) || 0), 0);
    const taxa = total > 0 ? Number(((convertidas / total) * 100).toFixed(1)) : 0;
    const ticket = total > 0 ? Math.round(soma / total) : 0;
    return { total, convertidas, negociacoes, propostas, taxa, ticket, soma };
  };

  const statA = calc(quotesA);
  const statB = calc(quotesB);

  const diffCotacoes = statA.total - statB.total;
  const diffConvertidas = statA.convertidas - statB.convertidas;
  const diffTaxa = Number((statA.taxa - statB.taxa).toFixed(1));

  return {
    periodoA: { nome: pA.label, ...statA },
    periodoB: { nome: pB.label, ...statB },
    diferencas: {
      diffCotacoes,
      diffConvertidas,
      diffTaxa,
      crescimentoCotacoesPct: statB.total > 0 ? Number((((statA.total - statB.total) / statB.total) * 100).toFixed(1)) : null,
    },
  };
}

/**
 * 10. get_daily_summary
 */
export async function get_daily_summary(ctx: AiContext, dateType: 'hoje' | 'ontem' = 'hoje') {
  const period = getPeriodDates(dateType);
  const quotes = await fetchSecureQuotes(ctx, period);

  const total = quotes.length;
  let novas = 0;
  let negociacao = 0;
  let proposta_enviada = 0;
  let convertida = 0;
  let nao_convertida = 0;
  let somaConvertida = 0;

  quotes.forEach((q) => {
    const s = normalizeCommercialStatus(q.status);
    if (s === 'nova') novas++;
    else if (s === 'negociacao') negociacao++;
    else if (s === 'proposta_enviada') proposta_enviada++;
    else if (s === 'convertida') {
      convertida++;
      somaConvertida += Number(q.mensalidade) || 0;
    } else if (s === 'nao_convertida') {
      nao_convertida++;
    }
  });

  const taxa = total > 0 ? Number(((convertida / total) * 100).toFixed(1)) : 0;

  // Busca também se existem cotações pendentes gerais que estão estagnadas
  const pendingData = await get_pending_quotes(ctx);

  return {
    dataReferencia: period.label,
    total,
    novas,
    negociacao,
    proposta_enviada,
    convertida,
    nao_convertida,
    taxaConversao: taxa,
    faturamentoGerado: somaConvertida,
    semAtualizacao48h: pendingData.semAtualizacao48h,
    totalPendentes: pendingData.totalPendentes,
  };
}
/**
 * 11. get_historical_summary
 * Acesso completo ao histórico de todas as cotações já geradas na plataforma por mês
 */
export async function get_historical_summary(ctx: AiContext) {
  const quotes = await fetchSecureQuotes(ctx);

  const MONTHS = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const monthMap: Record<string, { key: string; name: string; mes: string; ano: number; count: number; convertidas: number }> = {};
  let totalConvertidas = 0;

  quotes.forEach((q) => {
    const d = new Date(q.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const name = `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
    if (!monthMap[key]) {
      monthMap[key] = { key, name, mes: MONTHS[d.getMonth()], ano: d.getFullYear(), count: 0, convertidas: 0 };
    }
    monthMap[key].count++;
    const s = normalizeCommercialStatus(q.status);
    if (s === 'convertida') {
      monthMap[key].convertidas++;
      totalConvertidas++;
    }
  });

  const sortedMonths = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
  const totalGeral = quotes.length;
  const recorde = [...sortedMonths].sort((a, b) => b.count - a.count)[0] || null;

  const now = new Date();
  const mesAtualKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mesPassadoKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const mesAtualData = monthMap[mesAtualKey] || (sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1] : null);
  const mesPassadoData = monthMap[mesPassadoKey] || (sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null);

  return {
    totalGeral,
    totalConvertidas,
    meses: sortedMonths,
    mesPassado: mesPassadoData,
    mesAtual: mesAtualData,
    recorde,
  };
}