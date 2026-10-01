import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Clock, Send, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  FileText, MessageSquare, Phone, User, Search, Filter, MoreHorizontal
} from 'lucide-react';
import type { CommercialStatus } from '../../utils/crmStatus';
import {
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
  getTimeSinceLastUpdate,
  updateQuoteCommercialStatus,
} from '../../utils/crmStatus';
import { QuoteObservationsModal } from './QuoteObservationsModal';
import { supabase } from '@/lib/supabase';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

interface CrmPipelineProps {
  quotes: any[];
  onQuoteUpdated: (updatedQuote: any) => void;
  accentHex?: string;
  isReadOnly?: boolean;
}

export const CrmPipeline: React.FC<CrmPipelineProps> = ({
  quotes,
  onQuoteUpdated,
  accentHex = '#10b981',
  isReadOnly = false,
}) => {
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  // Filtragem por busca
  const filteredQuotes = quotes.filter((q) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const cliente = (q.cliente_nome || '').toLowerCase();
    const placa = (q.placa || '').toLowerCase();
    const modelo = (q.modelo || '').toLowerCase();
    const consultor = (q.consultants?.nome || '').toLowerCase();
    return cliente.includes(term) || placa.includes(term) || modelo.includes(term) || consultor.includes(term);
  });

  const columns: { id: CommercialStatus; title: string; icon: React.ReactNode }[] = [
    { id: 'nova', title: 'Novas', icon: <Sparkles size={14} className="text-blue-400" /> },
    { id: 'negociacao', title: 'Negociação', icon: <Clock size={14} className="text-amber-400" /> },
    { id: 'proposta_enviada', title: 'Proposta Enviada', icon: <Send size={14} className="text-indigo-400" /> },
    { id: 'convertida', title: 'Convertidas', icon: <CheckCircle2 size={14} className="text-emerald-400" /> },
    { id: 'nao_convertida', title: 'Não Convertidas', icon: <XCircle size={14} className="text-rose-400" /> },
  ];

  // Agrupamento por status
  const groupedQuotes: Record<CommercialStatus, any[]> = {
    nova: [],
    negociacao: [],
    proposta_enviada: [],
    convertida: [],
    nao_convertida: [],
  };

  filteredQuotes.forEach((q) => {
    const s = normalizeCommercialStatus(q.status);
    groupedQuotes[s].push(q);
  });

  const handleQuickAdvance = async (quote: any, targetStatus: CommercialStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await updateQuoteCommercialStatus(supabase, quote.id, targetStatus);
    if (res.success) {
      onQuoteUpdated({
        ...quote,
        status: targetStatus,
        updated_at: new Date().toISOString(),
        ...(targetStatus === 'convertida' ? { converted_at: new Date().toISOString() } : {}),
      });
    }
  };

  // Mapeamento de próximo status lógico
  const getNextStatus = (current: CommercialStatus): CommercialStatus | null => {
    if (current === 'nova') return 'negociacao';
    if (current === 'negociacao') return 'proposta_enviada';
    if (current === 'proposta_enviada') return 'convertida';
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca do Pipeline */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
        <div className="relative flex-1 max-w-sm w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, placa ou modelo..."
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all font-medium"
          />
        </div>
        <div className="text-xs text-zinc-400 font-mono">
          Total de <strong className="text-white">{filteredQuotes.length}</strong> cotações no funil
        </div>
      </div>

      {/* Grid Kanban do Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-4 styled-scrollbar">
        {columns.map((col) => {
          const colQuotes = groupedQuotes[col.id] || [];
          const cfg = COMMERCIAL_STATUSES[col.id];
          const totalValor = colQuotes.reduce((acc, q) => acc + (Number(q.mensalidade) || 0), 0);

          return (
            <div
              key={col.id}
              className="bg-[#0b1224]/80 rounded-2xl border border-white/10 p-3 flex flex-col min-h-[500px] shadow-lg backdrop-blur-sm"
            >
              {/* Col Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-md bg-white/5 border border-white/10">{col.icon}</div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    {col.title}
                  </h4>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}
                  >
                    {colQuotes.length}
                  </span>
                </div>
              </div>

              {/* Subtotal da Coluna */}
              {colQuotes.length > 0 && (
                <div className="text-[10px] text-zinc-500 font-mono mb-2 px-1 flex justify-between">
                  <span>Mensalidade total:</span>
                  <span className="font-bold text-zinc-300">{formatCurrency(totalValor)}</span>
                </div>
              )}

              {/* Cards List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto styled-scrollbar max-h-[600px] pr-0.5">
                {colQuotes.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded-xl text-[11px] text-zinc-600 uppercase tracking-widest font-mono">
                    Vazio
                  </div>
                ) : (
                  colQuotes.map((quote) => {
                    const next = getNextStatus(col.id);
                    const timeInfo = getTimeSinceLastUpdate(quote.updated_at || quote.created_at);

                    return (
                      <motion.div
                        key={quote.id}
                        layout
                        onClick={() => setSelectedQuote(quote)}
                        className={`p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all cursor-pointer relative group flex flex-col justify-between shadow-sm hover:shadow-md ${
                          timeInfo.isCritical && (col.id === 'nova' || col.id === 'negociacao' || col.id === 'proposta_enviada')
                            ? 'border-l-2 border-l-rose-500'
                            : ''
                        }`}
                      >
                        {/* Top: Cliente + Alerta de tempo */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <p className="font-bold text-white text-xs truncate flex-1">
                            {quote.cliente_nome || 'Cliente não informado'}
                          </p>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              timeInfo.isCritical
                                ? 'bg-rose-500/20 text-rose-300 font-bold'
                                : 'bg-white/5 text-zinc-500'
                            }`}
                          >
                            {timeInfo.text}
                          </span>
                        </div>

                        {/* Veículo & Placa */}
                        <div className="text-[11px] text-zinc-400 mb-2">
                          <p className="font-semibold text-zinc-200 truncate">{quote.modelo || 'Veículo'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {quote.placa && (
                              <span className="font-mono text-[10px] bg-white/5 px-1 py-0.2 rounded border border-white/5 text-zinc-300">
                                {quote.placa}
                              </span>
                            )}
                            {quote.valor_fipe > 0 && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                FIPE: {formatCurrency(quote.valor_fipe)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Consultor (se exibido no Admin) */}
                        {quote.consultants?.nome && (
                          <div className="text-[10px] text-zinc-500 mb-2 flex items-center gap-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span className="truncate">{quote.consultants.nome}</span>
                          </div>
                        )}

                        {/* Bottom: Valor + Ação Rápida */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-500 block leading-none">Proposta</span>
                            <span className="text-xs font-black text-emerald-400">
                              {formatCurrency(quote.mensalidade)}
                              <span className="text-[9px] font-normal text-zinc-500">/mês</span>
                            </span>
                          </div>

                          {!isReadOnly && next && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdvance(quote, next, e)}
                              className="flex items-center space-x-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-all active:scale-95"
                              title={`Avançar para ${COMMERCIAL_STATUSES[next].shortLabel}`}
                            >
                              <span>Avançar</span>
                              <ChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalhes e Observações */}
      {selectedQuote && (
        <QuoteObservationsModal
          quote={selectedQuote}
          isOpen={!!selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onUpdated={(updated) => {
            onQuoteUpdated(updated);
            setSelectedQuote(null);
          }}
          accentHex={accentHex}
        />
      )}
    </div>
  );
};

