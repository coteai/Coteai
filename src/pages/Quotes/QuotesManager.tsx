import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, FileText, User, Loader2, RefreshCw,
  Sparkles, Send, TrendingUp, LayoutGrid, ListFilter, Filter
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

  const { associationData, theme } = useAssociation();
  const associationId = associationData?.id;
  const accentHex = theme?.colors?.glowHex || '#3b82f6';

  const fetchQuotes = useCallback(async (assocId: string) => {
    setLoading(true);
    try {
      // 1. Busca todas as cotações desta associação com dados do consultor
      const { data: qData, error: qError } = await supabase
        .from('quotes')
        .select('*, consultants(id, nome)')
        .eq('association_id', assocId)
        .order('created_at', { ascending: false });

      if (!qError && qData) {
        setQuotes(qData);
      }

      // 2. Busca lista de consultores da associação para o filtro
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
    <div className="space-y-6 max-w-7xl mx-auto">
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
              title="Visualizar em Tabela"
            >
              <ListFilter size={15} />
              <span className="hidden sm:inline">Tabela</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Cotações</p>
          <p className="text-xl font-black text-white mt-1">{metrics.total}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Filtradas</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Novas</p>
          <p className="text-xl font-black text-white mt-1">{metrics.novas}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Aguardando</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Em Negociação</p>
          <p className="text-xl font-black text-white mt-1">{metrics.negociacoes}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Em contato</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Propostas Enviadas</p>
          <p className="text-xl font-black text-white mt-1">{metrics.propostas_enviadas}</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Aguardando resposta</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Convertidas</p>
          <p className="text-xl font-black text-white mt-1">{metrics.convertidas}</p>
          <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
            {formatCurrency(metrics.valor_total_convertidas)}
          </p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl border border-white/5 bg-[#0d1527]/70">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Taxa de Conversão</p>
          <p className="text-xl font-black text-white mt-1">{metrics.taxa_conversao}%</p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Média: {formatCurrency(metrics.valor_medio_propostas)}
          </p>
        </div>
      </div>

      {/* Pipeline vs Tabela */}
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

          {/* Tabela de Vendas da Associação */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={36} className="animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 bg-[#0b1224]/70">
              <div className="overflow-x-auto">
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
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-xs text-zinc-500">
                          Nenhuma cotação encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((quote, idx) => {
                        const s = normalizeCommercialStatus(quote.status);
                        const timeInfo = getTimeSinceLastUpdate(quote.updated_at || quote.created_at);

                        return (
                          <motion.tr
                            key={quote.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
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

export default QuotesManager;

