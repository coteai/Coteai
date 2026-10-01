import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Clock, MessageSquare, Phone, ExternalLink, Calendar, ChevronRight
} from 'lucide-react';
import type { CommercialStatus } from '../../utils/crmStatus';
import {
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
  getTimeSinceLastUpdate,
} from '../../utils/crmStatus';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

interface PendingQuotesSectionProps {
  quotes: any[];
  onOpenDetails: (quote: any) => void;
  accentHex?: string;
}

export const PendingQuotesSection: React.FC<PendingQuotesSectionProps> = ({
  quotes,
  onOpenDetails,
  accentHex = '#10b981',
}) => {
  // Filtra cotações ativas que precisam de atualização/acompanhamento
  const pendingQuotes = quotes.filter((q) => {
    const s = normalizeCommercialStatus(q.status);
    return s === 'nova' || s === 'negociacao' || s === 'proposta_enviada';
  });

  // Identifica cotações estagnadas (>48h e >24h)
  const stale48h = pendingQuotes.filter((q) => {
    const timeInfo = getTimeSinceLastUpdate(q.updated_at || q.created_at);
    return timeInfo.isCritical; // >= 48 horas
  });

  const stale24h = pendingQuotes.filter((q) => {
    const timeInfo = getTimeSinceLastUpdate(q.updated_at || q.created_at);
    return timeInfo.isWarning; // >= 24h e < 48h
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'stale48' | 'stale24'>('all');

  const displayedQuotes = pendingQuotes.filter((q) => {
    if (activeFilter === 'stale48') {
      return getTimeSinceLastUpdate(q.updated_at || q.created_at).isCritical;
    }
    if (activeFilter === 'stale24') {
      return getTimeSinceLastUpdate(q.updated_at || q.created_at).isWarning;
    }
    return true;
  });

  return (
    <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden bg-black/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            Cotações Pendentes
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhe propostas ativas e evite que contatos esfriem.
          </p>
        </div>

        {/* Filtros rápidos de estagnação */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-zinc-400 hover:text-white bg-black/20 border border-transparent'
            }`}
          >
            Todas ({pendingQuotes.length})
          </button>
          {stale48h.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('stale48')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                activeFilter === 'stale48'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                  : 'text-rose-400/80 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40'
              }`}
            >
              &gt;48h ({stale48h.length})
            </button>
          )}
          {stale24h.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('stale24')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                activeFilter === 'stale24'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-amber-400/80 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              &gt;24h ({stale24h.length})
            </button>
          )}
        </div>
      </div>

      {/* Alerta Destacado: >48h sem atualização */}
      {stale48h.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-rose-300">
              Atenção: {stale48h.length === 1 ? '1 cotação está' : `${stale48h.length} cotações estão`} sem atualização há mais de 48 horas.
            </p>
            <p className="text-rose-400/80 mt-0.5">
              Entre em contato com o cliente para não perder a janela de decisão ou atualize o status comercial.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Cotações */}
      {displayedQuotes.length === 0 ? (
        <div className="text-center py-6 text-xs text-zinc-500">
          Nenhuma cotação pendente no filtro selecionado.
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedQuotes.slice(0, 5).map((quote) => {
            const status = normalizeCommercialStatus(quote.status);
            const cfg = COMMERCIAL_STATUSES[status];
            const timeInfo = getTimeSinceLastUpdate(quote.updated_at || quote.created_at);

            return (
              <div
                key={quote.id}
                onClick={() => onOpenDetails(quote)}
                className="p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs truncate">
                      {quote.cliente_nome || 'Cliente não cadastrado'}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}
                    >
                      {cfg.shortLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="font-mono text-zinc-300 font-bold">{quote.placa || 'SEM PLACA'}</span>
                    <span className="truncate">{quote.modelo}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(quote.mensalidade)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0">
                  {/* Badge de tempo sem atualização */}
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                      timeInfo.isCritical
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : timeInfo.isWarning
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-white/5 text-zinc-500 border-white/5'
                    }`}
                  >
                    {timeInfo.text}
                  </span>

                  <button
                    type="button"
                    className="p-1.5 text-zinc-500 group-hover:text-white rounded-lg group-hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          {displayedQuotes.length > 5 && (
            <p className="text-center text-[11px] text-zinc-500 pt-1">
              + {displayedQuotes.length - 5} cotações pendentes na lista completa.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

