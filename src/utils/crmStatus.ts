import { SupabaseClient } from '@supabase/supabase-js';

export type CommercialStatus = 
  | 'nova' 
  | 'negociacao' 
  | 'proposta_enviada' 
  | 'convertida' 
  | 'nao_convertida';

export interface CommercialStatusConfig {
  id: CommercialStatus;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentColor: string;
  dotColor: string;
  description: string;
}

export const COMMERCIAL_STATUSES: Record<CommercialStatus, CommercialStatusConfig> = {
  nova: {
    id: 'nova',
    label: 'Nova Cotação',
    shortLabel: 'Nova',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    accentColor: '#3b82f6',
    dotColor: '#3b82f6',
    description: 'Cotação recém-gerada aguardando contato do consultor',
  },
  negociacao: {
    id: 'negociacao',
    label: 'Em Negociação',
    shortLabel: 'Negociação',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    accentColor: '#f59e0b',
    dotColor: '#f59e0b',
    description: 'Em contato e alinhamento de condições com o cliente',
  },
  proposta_enviada: {
    id: 'proposta_enviada',
    label: 'Proposta Enviada',
    shortLabel: 'Proposta Enviada',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    accentColor: '#6366f1',
    dotColor: '#6366f1',
    description: 'Proposta formal enviada aguardando decisão de fechamento',
  },
  convertida: {
    id: 'convertida',
    label: 'Convertida (Venda)',
    shortLabel: 'Convertida',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    accentColor: '#10b981',
    dotColor: '#10b981',
    description: 'Venda concretizada com contrato/adesão aprovada',
  },
  nao_convertida: {
    id: 'nao_convertida',
    label: 'Não Convertida',
    shortLabel: 'Não Convertida',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    accentColor: '#f43f5e',
    dotColor: '#f43f5e',
    description: 'Negociação finalizada sem fechamento no momento',
  },
};

/**
 * Normaliza status comerciais existentes no banco (inclusive legados)
 */
export function normalizeCommercialStatus(status: string | null | undefined): CommercialStatus {
  if (!status) return 'nova';
  const clean = status.trim().toLowerCase();
  
  if (clean === 'pending') return 'nova';
  if (clean === 'converted') return 'convertida';
  if (clean === 'rejected') return 'nao_convertida';
  
  if (['nova', 'negociacao', 'proposta_enviada', 'convertida', 'nao_convertida'].includes(clean)) {
    return clean as CommercialStatus;
  }
  return 'nova';
}

export interface CrmMetrics {
  total: number;
  novas: number;
  negociacoes: number;
  propostas_enviadas: number;
  convertidas: number;
  nao_convertidas: number;
  taxa_conversao: number; // Ex: 25.5 (%)
  valor_medio_propostas: number;
  valor_total_convertidas: number;
  pendentes_total: number;
  sem_atualizacao_48h: number;
  sem_atualizacao_24h: number;
}

/**
 * Calcula todas as métricas reais do CRM a partir de uma lista de cotações
 */
export function calculateCrmMetrics(quotes: any[]): CrmMetrics {
  const total = quotes.length;
  let novas = 0;
  let negociacoes = 0;
  let propostas_enviadas = 0;
  let convertidas = 0;
  let nao_convertidas = 0;
  let somaMensalidade = 0;
  let countMensalidade = 0;
  let somaConvertidas = 0;
  let pendentes_total = 0;
  let sem_atualizacao_48h = 0;
  let sem_atualizacao_24h = 0;

  const now = Date.now();
  const MS_24H = 24 * 60 * 60 * 1000;
  const MS_48H = 48 * 60 * 60 * 1000;

  for (const q of quotes) {
    const status = normalizeCommercialStatus(q.status);
    const mensalidade = Number(q.mensalidade) || 0;

    if (mensalidade > 0) {
      somaMensalidade += mensalidade;
      countMensalidade++;
    }

    if (status === 'nova') novas++;
    else if (status === 'negociacao') negociacoes++;
    else if (status === 'proposta_enviada') propostas_enviadas++;
    else if (status === 'convertida') {
      convertidas++;
      somaConvertidas += mensalidade;
    } else if (status === 'nao_convertida') {
      nao_convertidas++;
    }

    // Cotações ativas que precisam de acompanhamento
    const isPending = status === 'nova' || status === 'negociacao' || status === 'proposta_enviada';
    if (isPending) {
      pendentes_total++;
      const lastUpdate = new Date(q.updated_at || q.created_at || now).getTime();
      const diff = now - lastUpdate;
      if (diff >= MS_48H) {
        sem_atualizacao_48h++;
      } else if (diff >= MS_24H) {
        sem_atualizacao_24h++;
      }
    }
  }

  const taxa_conversao = total > 0 ? Number(((convertidas / total) * 100).toFixed(1)) : 0;
  const valor_medio_propostas = countMensalidade > 0 ? Math.round(somaMensalidade / countMensalidade) : 0;

  return {
    total,
    novas,
    negociacoes,
    propostas_enviadas,
    convertidas,
    nao_convertidas,
    taxa_conversao,
    valor_medio_propostas,
    valor_total_convertidas: somaConvertidas,
    pendentes_total,
    sem_atualizacao_48h,
    sem_atualizacao_24h,
  };
}

/**
 * Retorna tempo decorrido desde a última alteração com alertas visuais
 */
export function getTimeSinceLastUpdate(dateStr: string | null | undefined): {
  hours: number;
  text: string;
  isWarning: boolean;
  isCritical: boolean;
} {
  if (!dateStr) {
    return { hours: 0, text: 'Recente', isWarning: false, isCritical: false };
  }
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(hours / 24);

  let text = '';
  if (hours < 1) text = 'Há poucos minutos';
  else if (hours === 1) text = 'Há 1 hora';
  else if (hours < 24) text = `Há ${hours} horas`;
  else if (days === 1) text = 'Há 1 dia';
  else text = `Há ${days} dias`;

  return {
    hours,
    text,
    isWarning: hours >= 24 && hours < 48,
    isCritical: hours >= 48,
  };
}

/**
 * Atualiza status da cotação no Supabase com resiliência a esquemas legados
 */
export async function updateQuoteCommercialStatus(
  supabase: SupabaseClient,
  quoteId: string,
  newStatus: CommercialStatus,
  extras?: {
    observacoes?: string;
    cliente_nome?: string;
    cliente_whatsapp?: string;
  }
): Promise<{ success: boolean; error?: any }> {
  const now = new Date().toISOString();
  
  const payload: any = {
    status: newStatus,
    updated_at: now,
  };

  if (newStatus === 'convertida') {
    payload.converted_at = now;
  }

  if (extras?.observacoes !== undefined) {
    payload.observacoes = extras.observacoes;
  }
  if (extras?.cliente_nome !== undefined) {
    payload.cliente_nome = extras.cliente_nome;
  }
  if (extras?.cliente_whatsapp !== undefined) {
    payload.cliente_whatsapp = extras.cliente_whatsapp;
  }

  // Tentativa 1: com todos os campos modernos
  const { error: fullError } = await supabase
    .from('quotes')
    .update(payload)
    .eq('id', quoteId);

  if (!fullError) {
    return { success: true };
  }

  // Se o erro for falta de coluna (code 42703), tentamos apenas campos base garantidos
  if (fullError.code === '42703' || String(fullError.message || '').includes('does not exist')) {
    const minimalPayload: any = {
      status: newStatus,
    };
    if (newStatus === 'convertida') {
      minimalPayload.converted_at = now;
    }
    if (extras?.cliente_nome) minimalPayload.cliente_nome = extras.cliente_nome;
    if (extras?.cliente_whatsapp) minimalPayload.cliente_whatsapp = extras.cliente_whatsapp;

    const { error: minError } = await supabase
      .from('quotes')
      .update(minimalPayload)
      .eq('id', quoteId);

    if (!minError) {
      return { success: true };
    }
    return { success: false, error: minError };
  }

  return { success: false, error: fullError };
}
