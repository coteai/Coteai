import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, FileText, User, Loader2, RefreshCw,
  Sparkles, Send, TrendingUp, LayoutGrid, ListFilter, Filter, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAssociation } from '../../contexts/AssociationContext';
import type { CommercialStatus, CrmMetrics } from '../../utils/crmStatus';
import {
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
  calculateCrmMetrics,
  getTimeSinceLastUpdate,
  updateQuoteCommercialStatus,
} from '../../utils/crmStatus';
import { CrmPipeline } from '../../components/crm/CrmPipeline';
import { QuoteObservationsModal } from '../../components/crm/QuoteObservationsModal';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const QuotesManager = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(25);

  const { associationData, theme } = useAssociation();
  const associationId = associationData?.id;
  const accentHex = theme?.colors?.glowHex || '#3b82f6';

  const fetchQuotes = useCallback(async (assocId: string) => {
    setLoading(true);
    try {
      // Otimização de Performance: busca apenas os campos necessários (sem planos_cotados que é pesado)
      const selectFields = 'id, created_at, updated_at, status, mensalidade, plano_selecionado, cliente_nome, cliente_whatsapp, placa, modelo, valor_fipe, consultant_id, observacoes, consultants(id, nome)';
      
      let { data: qData, error: qError } = await supabase
        .from('quotes')
        .select(selectFields)
        .eq('association_id', assocId)
        .order('created_at', { ascending: false });

      // Fallback gracioso se updated_at ou observacoes ainda nao existirem no banco
      if (qError && (qError.code === '42703' || String(qError.message || '').includes('does not exist'))) {
        const minimalFields = 'id, created_at, status, mensalidade, plano_selecionado, cliente_nome, cliente_whatsapp, placa, modelo, valor_fipe, consultant_id, consultants(id, nome)';
        const retry = await supabase
          .from('quotes')
          .select(minimalFields)
          .eq('association_id', assocId)
          .order('created_at', { ascending: false });
        qData = retry.data;
        qError = retry.error;
      }

      if (!qError && qData) {
        setQuotes(qData);
      }

      // Busca lista de consultores para o filtro
      const { data: cData } = await supabase
        .from('consultants')
        .select('id, nome')
        .eq('association_id', assocId)
        .eq('ativo', true)
        .order('nome');

      if (cData) {
        setConsultants(cData);
      }
    } catch (err) {
      console.error('Erro ao carregar vendas da associação:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (associationId) {
      fetchQuotes(associationId);
    }
  }, [associationId, fetchQuotes]);

  // Resetar paginação ao filtrar ou buscar
  useEffect(() => {
    setVisibleCount(25);
  }, [search, filterStatus, selectedConsultant]);

  const handleQuoteUpdated = (updatedQuote: any) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q))
    );
  };

  const handleQuickConvert = async (quote: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await updateQuoteCommercialStatus(supabase, quote.id, 'convertida');
    if (res.success) {
      handleQuoteUpdated({
        ...quote,
        status: 'convertida',
        updated_at: new Date().toISOString(),
        converted_at: new Date().toISOString(),
      });
    }
  };

  // Filtragem
  const filtered = quotes.filter((q) => {
    const s = normalizeCommercialStatus(q.status);
    const matchesStatus = filterStatus === 'all' || s === filterStatus;
    const matchesConsultant =
      selectedConsultant === 'all' || q.consultant_id === selectedConsultant;
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      (q.cliente_nome || '').toLowerCase().includes(term) ||
      (q.placa || '').toLowerCase().includes(term) ||
      (q.modelo || '').toLowerCase().includes(term) ||
      (q.consultants?.nome || '').toLowerCase().includes(term);

    return matchesStatus && matchesConsultant && matchesSearch;
  });

  const paginatedList = filtered.slice(0, visibleCount);
  const metrics: CrmMetrics = calculateCrmMetrics(filtered);

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

  const statusTabs = [
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
          <div className="flex items-center space-x-2 mb-1">
            <span
              className="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border"
              style={{
                color: accentHex,
                borderColor: `${accentHex}30`,
                backgroundColor: `${accentHex}10`,
              }}
            >
              Gestão Comercial
            </span>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-zinc-500 text-xs">Visão Associação</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            Central de Vendas & CRM
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Acompanhe o funil de vendas, aprove contratos e gerencie propostas da associação.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          {/* Alternador Tabela / Pipeline */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
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
                viewMode === 'pipeline' ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualizar em Pipeline"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
          </div>

          <button
            onClick={() => associationId && fetchQuotes(associationId)}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid de Resumo das Métricas Reais da Associação */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Cotações</p>
          <p className="text-xl font-black text-white mt-1">{metrics.total}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Filtradas</p>
        </div>
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Novas</p>
          <p className="text-xl font-black text-white mt-1">{metrics.novas}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Aguardando</p>
        </div>
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Em Negociação</p>
          <p className="text-xl font-black text-white mt-1">{metrics.negociacoes}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Em contato</p>
        </div>
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Propostas Env.</p>
          <p className="text-xl font-black text-white mt-1">{metrics.propostas_enviadas}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Aguardando resposta</p>
        </div>
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Convertidas</p>
          <p className="text-xl font-black text-white mt-1">{metrics.convertidas}</p>
          <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
            {formatCurrency(metrics.valor_total_convertidas)}
          </p>
        </div>
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Taxa Conversão</p>
          <p className="text-xl font-black text-white mt-1">{metrics.taxa_conversao}%</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Ticket: {formatCurrency(metrics.valor_medio_propostas)}
          </p>
        </div>
      </div>

      {/* Pipeline vs Lista */}
      {viewMode === 'pipeline' ? (
        <CrmPipeline
          quotes={filtered}
          onQuoteUpdated={handleQuoteUpdated}
          accentHex={accentHex}
        />
      ) : (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="glass-card p-3 sm:p-4 rounded-2xl flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border border-white/5">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
              {/* Busca */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, placa, modelo, consultor..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder:text-zinc-600 text-xs sm:text-sm focus:outline-none focus:border-white/30 transition-all font-medium"
                />
              </div>

              {/* Seletor de Consultor */}
              <select
                value={selectedConsultant}
                onChange={(e) => setSelectedConsultant(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition-all appearance-none cursor-pointer"
              >
                <option value="all">Todos os Consultores</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Abas de Status */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 styled-scrollbar">
              {statusTabs.map((t) => (
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
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 text-xs text-zinc-500">
              Nenhuma cotação encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {/* ======================================================== */}
              {/* 1. VISÃO MOBILE EM CARDS (ZERO SCROLL LATERAL, 100% VISÍVEL) */}
              {/* ======================================================== */}
              <div className="block md:hidden space-y-2.5">
                {paginatedList.map((quote) => {
                  const s = normalizeCommercialStatus(quote.status);

                  return (
                    <div
                      key={quote.id}
                      onClick={() => setSelectedQuote(quote)}
                      className="p-3.5 rounded-xl border border-white/10 bg-[#0d1527]/90 active:bg-white/[0.04] transition-all flex flex-col gap-2.5 shadow-sm"
                    >
                      {/* Linha Superior: Nome do Cliente + Badge de Status */}
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

                      {/* Linha do Meio: Placa e Modelo */}
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

                      {/* Linha Inferior: Proposta + Consultor + Data + Ação */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-black text-emerald-400 text-sm">
                            {formatCurrency(quote.mensalidade)}
                            <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 block truncate max-w-[140px]">
                            {quote.plano_selecionado || 'Cotação'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-[11px] text-zinc-300 font-semibold block truncate max-w-[100px]">
                              {quote.consultants?.nome ? quote.consultants.nome.split(' ')[0] : 'Direto'}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono block">
                              {new Date(quote.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(quote.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {s !== 'convertida' && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickConvert(quote, e)}
                              className="px-2.5 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-black font-black uppercase text-[10px] tracking-wider border border-emerald-500/30 rounded-lg transition-all active:scale-95 shrink-0"
                            >
                              Aprovar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                        Consultor
                      </th>
                      <th className="p-3.5 text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                        Proposta
                      </th>
                      <th className="p-3.5 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">
                        Status / Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((quote, idx) => {
                      const s = normalizeCommercialStatus(quote.status);

                      return (
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
                            {quote.consultants ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-black text-[10px]">
                                  {quote.consultants.nome.charAt(0)}
                                </div>
                                <span className="font-semibold text-zinc-200 text-xs">
                                  {quote.consultants.nome}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-xs">Direto / Sem consultor</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="font-black text-emerald-400 text-xs">
                              {formatCurrency(quote.mensalidade)}
                              <span className="text-[10px] text-zinc-500 font-normal">/mês</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[160px]">
                              {quote.plano_selecionado || 'Cotação'}
                            </div>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {getStatusBadge(quote.status)}
                              {s !== 'convertida' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickConvert(quote, e)}
                                  className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black font-bold uppercase text-[10px] tracking-wider border border-emerald-500/30 rounded-lg transition-all active:scale-95"
                                >
                                  Aprovar
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
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

      {/* Modal de Detalhes & Observações ao clicar */}
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

export default QuotesManager;
