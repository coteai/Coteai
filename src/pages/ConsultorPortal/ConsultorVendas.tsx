import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle2, Clock, Zap, RefreshCw, Search, Loader2,
  Sparkles, Send, XCircle, LayoutGrid, ListFilter, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';
import { useNavigate } from 'react-router-dom';
import type { CommercialStatus } from '../../utils/crmStatus';
import {
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
  getTimeSinceLastUpdate,
} from '../../utils/crmStatus';
import { CrmPipeline } from '../../components/crm/CrmPipeline';
import { QuoteObservationsModal } from '../../components/crm/QuoteObservationsModal';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const ConsultorVendas = () => {
  const { consultor } = useConsultorAuth();
  const { associationData } = useAssociation();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(25);

  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;

  const fetchQuotes = useCallback(async () => {
    if (!consultor?.id || !associationData?.id) return;
    setLoading(true);

    try {
      // Otimização de Performance: campos necessários leves
      const selectFields = 'id, created_at, updated_at, status, mensalidade, plano_selecionado, cliente_nome, cliente_whatsapp, placa, modelo, valor_fipe, consultant_id, observacoes';
      
      let { data, error } = await supabase
        .from('quotes')
        .select(selectFields)
        .eq('consultant_id', consultor.id)
        .eq('association_id', associationData.id)
        .order('created_at', { ascending: false });

      if (error && (error.code === '42703' || String(error.message || '').includes('does not exist'))) {
        const minimalFields = 'id, created_at, status, mensalidade, plano_selecionado, cliente_nome, cliente_whatsapp, placa, modelo, valor_fipe, consultant_id';
        const retry = await supabase
          .from('quotes')
          .select(minimalFields)
          .eq('consultant_id', consultor.id)
          .eq('association_id', associationData.id)
          .order('created_at', { ascending: false });
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        setQuotes(data);
      }
    } catch (err) {
      console.error('Erro ao buscar vendas do consultor:', err);
    } finally {
      setLoading(false);
    }
  }, [consultor?.id, associationData?.id]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Resetar paginação ao filtrar ou buscar
  useEffect(() => {
    setVisibleCount(25);
  }, [search, filterStatus]);

  const handleQuoteUpdated = (updatedQuote: any) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q))
    );
  };

  const filtered = quotes.filter((q) => {
    const s = normalizeCommercialStatus(q.status);
    const matchesStatus = filterStatus === 'all' || s === filterStatus;
    const term = search.toLowerCase();
    const matchesSearch =
      (q.cliente_nome || '').toLowerCase().includes(term) ||
      (q.placa || '').toLowerCase().includes(term) ||
      (q.modelo || '').toLowerCase().includes(term) ||
      (q.id || '').toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const paginatedList = filtered.slice(0, visibleCount);

  const getStatusBadge = (status: string) => {
    const s = normalizeCommercialStatus(status);
    const cfg = COMMERCIAL_STATUSES[s];
    return (
      <span
        className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}
      >
        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: cfg.dotColor }} />
        {cfg.shortLabel}
      </span>
    );
  };

  const tabs: { label: string; value: string; count?: number }[] = [
    { label: 'Todas', value: 'all', count: quotes.length },
    { label: 'Novas', value: 'nova', count: quotes.filter((q) => normalizeCommercialStatus(q.status) === 'nova').length },
    { label: 'Negociação', value: 'negociacao', count: quotes.filter((q) => normalizeCommercialStatus(q.status) === 'negociacao').length },
    { label: 'Propostas Env.', value: 'proposta_enviada', count: quotes.filter((q) => normalizeCommercialStatus(q.status) === 'proposta_enviada').length },
    { label: 'Convertidas', value: 'convertida', count: quotes.filter((q) => normalizeCommercialStatus(q.status) === 'convertida').length },
    { label: 'Não Convertidas', value: 'nao_convertida', count: quotes.filter((q) => normalizeCommercialStatus(q.status) === 'nao_convertida').length },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentHex }}>
            CRM & Pipeline
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Minhas Vendas & Cotações
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Histórico completo e gestão dos estágios comerciais das suas cotações.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Alternador Lista / Pipeline */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualizar em Lista"
            >
              <ListFilter size={15} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'pipeline'
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualizar em Pipeline"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
          </div>

          <button
            onClick={fetchQuotes}
            className="p-2.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
            title="Recarregar"
          >
            <RefreshCw size={16} />
          </button>

          <button
            onClick={() => navigate('/consultor/cotacao')}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-xl font-black text-xs text-black uppercase tracking-wide transition-all hover:brightness-110 active:scale-95 shadow-lg"
            style={{ backgroundColor: accentHex }}
          >
            <Zap size={14} className="fill-black" />
            <span>Nova Cotação</span>
          </button>
        </div>
      </div>

      {/* Visualização Pipeline vs Lista */}
      {viewMode === 'pipeline' ? (
        <CrmPipeline
          quotes={quotes}
          onQuoteUpdated={handleQuoteUpdated}
          accentHex={accentHex}
        />
      ) : (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="glass-card p-3 sm:p-4 rounded-2xl flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border border-white/5">
            {/* Campo de Busca */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente, placa, modelo, código..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder:text-zinc-600 text-xs sm:text-sm focus:outline-none focus:border-white/30 transition-all font-medium"
              />
            </div>

            {/* Abas de Status Comercial */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 styled-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFilterStatus(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterStatus === t.value
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="text-[10px] opacity-70 font-mono">({t.count})</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={36} className="animate-spin text-zinc-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
              <FileText size={40} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-bold text-sm mb-1">
                {quotes.length === 0
                  ? 'Nenhuma cotação gerada ainda.'
                  : 'Nenhuma cotação encontrada com este filtro.'}
              </p>
              {quotes.length === 0 && (
                <button
                  onClick={() => navigate('/consultor/cotacao')}
                  className="mt-3 text-xs font-bold uppercase tracking-wider"
                  style={{ color: accentHex }}
                >
                  Gerar primeira cotação →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* ======================================================== */}
              {/* 1. VISÃO MOBILE EM CARDS (ZERO SCROLL LATERAL, 100% VISÍVEL) */}
              {/* ======================================================== */}
              <div className="block md:hidden space-y-2.5">
                {paginatedList.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => setSelectedQuote(quote)}
                    className="p-3.5 rounded-xl border border-white/10 bg-[#0d1527]/90 active:bg-white/[0.04] transition-all flex flex-col gap-2.5 shadow-sm"
                  >
                    {/* Top: Cliente + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate">
                          {quote.cliente_nome || 'Cliente não informado'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          #{quote.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(quote.status)}
                      </div>
                    </div>

                    {/* Meio: Placa + Modelo */}
                    <div className="flex items-center gap-2 text-xs">
                      {quote.placa ? (
                        <span className="font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-black border border-blue-500/20 text-[11px] shrink-0">
                          {quote.placa}
                        </span>
                      ) : (
                        <span className="font-mono bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                          S/ PLACA
                        </span>
                      )}
                      <span className="text-zinc-200 font-medium truncate">
                        {quote.modelo || 'Veículo não informado'}
                      </span>
                    </div>

                    {/* Rodapé: Valor + Data/Hora */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-emerald-400 text-sm">
                          {formatCurrency(quote.mensalidade)}
                          <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate max-w-[150px]">
                          {quote.plano_selecionado || 'Cotação'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 font-mono block">
                          {new Date(quote.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(quote.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-bold mt-0.5 inline-block" style={{ color: accentHex }}>
                          Ver detalhes →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ======================================================== */}
              {/* 2. VISÃO DESKTOP EM TABELA (SOMENTE PARA TELAS LARGAS) */}
              {/* ======================================================== */}
              <div className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-white/5 bg-[#0b1224]/70">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="p-3.5 text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                        Cotação
                      </th>
                      <th className="p-3.5 text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                        Cliente / Veículo
                      </th>
                      <th className="p-3.5 text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                        Plano & Proposta
                      </th>
                      <th className="p-3.5 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">
                        Status Comercial
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((quote, idx) => (
                      <motion.tr
                        key={quote.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                        onClick={() => setSelectedQuote(quote)}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      >
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center text-xs">
                            <FileText size={14} className="text-zinc-600 mr-1.5" />
                            #{quote.id.substring(0, 8).toUpperCase()}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {new Date(quote.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-white text-xs">
                            {quote.cliente_nome || 'Cliente não informado'}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-xs">
                            {quote.placa && (
                              <span className="font-mono bg-white/5 px-1 py-0.2 rounded border border-white/5 text-zinc-300 font-bold mr-1.5">
                                {quote.placa}
                              </span>
                            )}
                            <span>{quote.modelo}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-black text-emerald-400 text-xs">
                            {formatCurrency(quote.mensalidade)}
                            <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                            {quote.plano_selecionado || 'Cotação'}
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          {getStatusBadge(quote.status)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botão de Paginação Progressiva (Carregar Mais) */}
              {filtered.length > visibleCount && (
                <div className="flex flex-col items-center justify-center pt-3 pb-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 25)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all active:scale-95 shadow-md flex items-center gap-2"
                  >
                    <span>Carregar mais cotações</span>
                    <ChevronRight size={14} />
                  </button>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Exibindo {paginatedList.length} de {filtered.length} cotações
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes & Observações */}
      {selectedQuote && (
        <QuoteObservationsModal
          quote={selectedQuote}
          isOpen={!!selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onUpdated={(updated) => {
            handleQuoteUpdated(updated);
            setSelectedQuote(null);
          }}
          accentHex={accentHex}
        />
      )}
    </div>
  );
};

export default ConsultorVendas;
