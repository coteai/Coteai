import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Clock, Send, XCircle, Sparkles, AlertCircle, ChevronRight, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CommercialStatus } from '../../utils/crmStatus';
import {
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
  updateQuoteCommercialStatus,
} from '../../utils/crmStatus';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

interface DailyClosingSectionProps {
  quotes: any[];
  onQuoteUpdated: (updatedQuote: any) => void;
  accentHex?: string;
}

export const DailyClosingSection: React.FC<DailyClosingSectionProps> = ({
  quotes,
  onQuoteUpdated,
  accentHex = '#10b981',
}) => {
  // Cotações que precisam de fechamento / atualização comercial (não finalizadas: nova, negociacao, proposta_enviada)
  const pendingQuotes = quotes.filter((q) => {
    const s = normalizeCommercialStatus(q.status);
    return s === 'nova' || s === 'negociacao' || s === 'proposta_enviada';
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successQuoteId, setSuccessQuoteId] = useState<string | null>(null);

  const handleQuickStatusChange = async (quote: any, newStatus: CommercialStatus) => {
    setUpdatingId(quote.id);
    const res = await updateQuoteCommercialStatus(supabase, quote.id, newStatus);
    if (res.success) {
      setSuccessQuoteId(quote.id);
      setTimeout(() => {
        onQuoteUpdated({
          ...quote,
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'convertida' ? { converted_at: new Date().toISOString() } : {}),
        });
        setUpdatingId(null);
        setSuccessQuoteId(null);
      }, 500);
    } else {
      setUpdatingId(null);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#0c1427] to-[#070b16]">
      {/* Glow de destaque sutil */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-15"
        style={{ backgroundColor: accentHex }}
      />

      {/* Header do Fechamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/5 relative z-10">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentHex }}
            />
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              Fechamento do Dia
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
              Rotina Noturna / Fim do Turno
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Atualize o status das suas cotações rapidamente com apenas 1 clique.
          </p>
        </div>

        {/* Badge do total aguardando */}
        <div className="flex items-center space-x-2 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          {pendingQuotes.length > 0 ? (
            <>
              <Clock size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-white">
                <strong className="text-amber-400 font-black">{pendingQuotes.length}</strong> {pendingQuotes.length === 1 ? 'cotação aguardando' : 'cotações aguardando'} atualização
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">
                Tudo em dia! Nenhuma cotação pendente
              </span>
            </>
          )}
        </div>
      </div>

      {/* Lista de Cotações para Fechamento Rápido */}
      {pendingQuotes.length === 0 ? (
        <div className="text-center py-8 relative z-10">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Check size={24} />
          </div>
          <p className="text-sm font-bold text-white">Excelente! Fechamento do dia concluído.</p>
          <p className="text-xs text-zinc-500 mt-1">
            Todas as suas cotações foram atualizadas ou convertidas com sucesso.
          </p>
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          <AnimatePresence mode="popLayout">
            {pendingQuotes.slice(0, 6).map((quote) => {
              const currentStatus = normalizeCommercialStatus(quote.status);
              const currentConfig = COMMERCIAL_STATUSES[currentStatus];
              const isUpdating = updatingId === quote.id;
              const isSuccess = successQuoteId === quote.id;

              return (
                <motion.div
                  key={quote.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isSuccess
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Informações da Cotação: Cliente, Veículo, Valor, Status Atual */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-white text-sm truncate">
                          {quote.cliente_nome || 'Cliente sem nome'}
                        </span>
                        {quote.cliente_whatsapp && (
                          <span className="text-[11px] text-zinc-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {quote.cliente_whatsapp}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${currentConfig.badgeBg} ${currentConfig.badgeText} ${currentConfig.borderColor}`}
                        >
                          {currentConfig.shortLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 flex-wrap">
                        {quote.placa && (
                          <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-zinc-300 font-bold border border-white/5 text-[11px]">
                            {quote.placa}
                          </span>
                        )}
                        <span className="truncate">{quote.modelo || 'Veículo não informado'}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(quote.mensalidade)}
                          <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500 text-[11px]">
                          {quote.plano_selecionado || 'Cotação'}
                        </span>
                      </div>
                    </div>

                    {/* Ações Rápidas de 1 Clique */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                      {/* [Em negociação] */}
                      {currentStatus !== 'negociacao' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickStatusChange(quote, 'negociacao')}
                          className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black transition-all active:scale-95 disabled:opacity-50"
                        >
                          Em negociação
                        </button>
                      )}

                      {/* [Proposta enviada] */}
                      {currentStatus !== 'proposta_enviada' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleQuickStatusChange(quote, 'proposta_enviada')}
                          className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          Proposta enviada
                        </button>
                      )}

                      {/* [Convertida] */}
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuickStatusChange(quote, 'convertida')}
                        className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 transition-all active:scale-95 disabled:opacity-50 font-black shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      >
                        ✓ Convertida
                      </button>

                      {/* [Não convertida] */}
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuickStatusChange(quote, 'nao_convertida')}
                        className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                      >
                        ✕ Não convertida
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {pendingQuotes.length > 6 && (
            <p className="text-center text-xs text-zinc-500 pt-2">
              Mostrando as 6 primeiras de <strong className="text-white">{pendingQuotes.length}</strong> cotações pendentes.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

