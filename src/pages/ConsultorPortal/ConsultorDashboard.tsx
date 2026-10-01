import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, FileText, CheckCircle2, DollarSign, Clock, Zap, RefreshCw,
  Loader2, Send, XCircle, Sparkles, AlertTriangle, ArrowUpRight, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';
import { useNavigate } from 'react-router-dom';
import type { CrmMetrics, CommercialStatus } from '../../utils/crmStatus';
import {
  calculateCrmMetrics,
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
} from '../../utils/crmStatus';
import { DailyClosingSection } from '../../components/crm/DailyClosingSection';
import { PendingQuotesSection } from '../../components/crm/PendingQuotesSection';
import { CrmPipeline } from '../../components/crm/CrmPipeline';
import { QuoteObservationsModal } from '../../components/crm/QuoteObservationsModal';
import { CoteAiAssistantModal } from '../../components/assistant/CoteAiAssistantModal';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accentColor: string;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  sub,
  icon: Icon,
  accentColor,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="glass-card p-4 rounded-2xl border border-white/5 bg-[#0d1527]/70 relative overflow-hidden group hover:border-white/15 transition-all"
  >
    <div
      className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-10 group-hover:opacity-25 transition-opacity"
      style={{ backgroundColor: accentColor }}
    />
    <div className="flex items-center justify-between mb-3 relative z-10">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
        {title}
      </span>
      <div
        className="p-1.5 rounded-lg border"
        style={{
          backgroundColor: `${accentColor}15`,
          borderColor: `${accentColor}30`,
          color: accentColor,
        }}
      >
        <Icon size={14} />
      </div>
    </div>
    <div className="relative z-10">
      <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
      {sub && <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const ConsultorDashboard = () => {
  const { consultor } = useConsultorAuth();
  const { associationData } = useAssociation();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInitialQuery, setAssistantInitialQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'fechamento' | 'pendentes'>('pipeline');

  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;

  const fetchQuotes = useCallback(async () => {
    if (!consultor?.id || !associationData?.id) return;
    setLoading(true);

    try {
      // Isolamento estrito: busca apenas cotacoes deste consultor nesta associacao
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('consultant_id', consultor.id)
        .eq('association_id', associationData.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQuotes(data);
      }
    } catch (err) {
      console.error('Erro ao buscar cotações do consultor:', err);
    } finally {
      setLoading(false);
    }
  }, [consultor?.id, associationData?.id]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Atualização local de cotação sem precisar de reload completo
  const handleQuoteUpdated = (updatedQuote: any) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q))
    );
  };

  // Métricas comerciais reais calculadas diretamente sobre as cotações do consultor
  const metrics: CrmMetrics = calculateCrmMetrics(quotes);

  const getStatusBadge = (status: string) => {
    const s = normalizeCommercialStatus(status);
    const cfg = COMMERCIAL_STATUSES[s];
    return (
      <span
        className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5"
          style={{ backgroundColor: cfg.dotColor }}
        />
        {cfg.shortLabel}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header do Consultor */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
              Portal Comercial
            </span>
            <span className="text-zinc-600 text-xs">•</span>
            <span className="text-zinc-500 text-xs font-mono">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Olá, {consultor?.nome ? consultor.nome.split(' ')[0] : 'Consultor'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Acompanhe seu funil comercial, cotações pendentes e fechamento diário.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={fetchQuotes}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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

            {/* Banner do Assistente Cote AI */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-900/20 via-[#0b162f]/80 to-emerald-900/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden shadow-lg">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border font-black text-white shrink-0 shadow-md"
            style={{
              backgroundColor: `${accentHex}20`,
              borderColor: `${accentHex}50`,
              color: accentHex,
            }}
          >
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
              Cote AI • Seu Assessor Comercial
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Fale por áudio ou texto para consultar suas vendas, cotações pendentes e taxa de conversão.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setAssistantInitialQuery('');
            setIsAssistantOpen(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-black transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5 shrink-0"
          style={{ backgroundColor: accentHex }}
        >
          <Sparkles size={14} className="fill-black" />
          <span>Falar com Cote AI</span>
        </button>
      </div>

      {/* Grid de Resumo Comercial (Métricas Reais) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <MetricCard
          title="Total Cotações"
          value={metrics.total}
          sub="No histórico"
          icon={FileText}
          accentColor="#94a3b8"
          delay={0.05}
        />
        <MetricCard
          title="Novas"
          value={metrics.novas}
          sub="Aguardando contato"
          icon={Sparkles}
          accentColor="#3b82f6"
          delay={0.1}
        />
        <MetricCard
          title="Em Negociação"
          value={metrics.negociacoes}
          sub="Em tratativas"
          icon={Clock}
          accentColor="#f59e0b"
          delay={0.15}
        />
        <MetricCard
          title="Propostas Env."
          value={metrics.propostas_enviadas}
          sub="Em decisão"
          icon={Send}
          accentColor="#6366f1"
          delay={0.2}
        />
        <MetricCard
          title="Convertidas"
          value={metrics.convertidas}
          sub="Vendas fechadas"
          icon={CheckCircle2}
          accentColor="#10b981"
          delay={0.25}
        />
        <MetricCard
          title="Não Convert."
          value={metrics.nao_convertidas}
          sub="Sem fechamento"
          icon={XCircle}
          accentColor="#f43f5e"
          delay={0.3}
        />
        <MetricCard
          title="Taxa Conversão"
          value={`${metrics.taxa_conversao}%`}
          sub={`Ticket médio: ${formatCurrency(metrics.valor_medio_propostas)}`}
          icon={TrendingUp}
          accentColor={accentHex}
          delay={0.35}
        />
      </div>

      {/* Navegação entre Áreas Principais do CRM */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'pipeline'
              ? 'bg-white/15 text-white border border-white/20 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Sparkles size={14} style={{ color: accentHex }} />
          <span>Pipeline Comercial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fechamento')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
            activeTab === 'fechamento'
              ? 'bg-white/15 text-white border border-white/20 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Clock size={14} className="text-amber-400" />
          <span>Fechamento do Dia</span>
          {metrics.pendentes_total > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black flex items-center justify-center">
              {metrics.pendentes_total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pendentes')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
            activeTab === 'pendentes'
              ? 'bg-white/15 text-white border border-white/20 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <AlertTriangle size={14} className={metrics.sem_atualizacao_48h > 0 ? 'text-rose-400' : 'text-zinc-400'} />
          <span>Cotações Pendentes</span>
          {metrics.sem_atualizacao_48h > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black flex items-center justify-center animate-pulse">
              {metrics.sem_atualizacao_48h}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo Dinâmico por Aba */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={36} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          {/* Aba 1: Pipeline Comercial */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              {/* Alerta inteligente se houver cotações sem atualização */}
              {metrics.sem_atualizacao_48h > 0 && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                    <span className="text-rose-300 font-semibold">
                      Você possui <strong>{metrics.sem_atualizacao_48h} cotações sem atualização há mais de 48 horas</strong>.
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('fechamento')}
                    className="px-3 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white font-black uppercase text-[10px] tracking-wider rounded-lg border border-rose-500/30 transition-all shrink-0"
                  >
                    Fazer Fechamento Rápido →
                  </button>
                </div>
              )}

              <CrmPipeline
                quotes={quotes}
                onQuoteUpdated={handleQuoteUpdated}
                accentHex={accentHex}
              />
            </div>
          )}

          {/* Aba 2: Fechamento do Dia */}
          {activeTab === 'fechamento' && (
            <DailyClosingSection
              quotes={quotes}
              onQuoteUpdated={handleQuoteUpdated}
              accentHex={accentHex}
            />
          )}

          {/* Aba 3: Cotações Pendentes */}
          {activeTab === 'pendentes' && (
            <PendingQuotesSection
              quotes={quotes}
              onOpenDetails={(q) => setSelectedQuote(q)}
              accentHex={accentHex}
            />
          )}

          {/* Histórico Recente das Cotações */}
          <div className="glass-card p-4 sm:p-6 rounded-2xl border border-white/5 bg-[#0b1224]/60">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Histórico Recente
                </h3>
                <p className="text-xs text-zinc-500">Últimas cotações emitidas por você</p>
              </div>
              <button
                onClick={() => navigate('/consultor/vendas')}
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: accentHex }}
              >
                Ver todas no CRM <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {quotes.slice(0, 5).length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  Nenhuma cotação gerada ainda.{' '}
                  <button
                    onClick={() => navigate('/consultor/cotacao')}
                    className="underline font-bold"
                    style={{ color: accentHex }}
                  >
                    Gerar a primeira
                  </button>
                </div>
              ) : (
                quotes.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className="p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs truncate">
                          {q.cliente_nome || 'Cliente não informado'}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          #{q.id.substring(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                        {q.placa && (
                          <span className="font-mono text-zinc-300 font-bold">{q.placa}</span>
                        )}
                        <span className="truncate">{q.modelo}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(q.mensalidade)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                        {new Date(q.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {getStatusBadge(q.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

            {/* Modal do Assistente Cote AI */}
      {consultor && (
        <CoteAiAssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          context={{
            role: 'consultor',
            associationId: associationData?.id || '',
            consultantId: consultor.id,
            consultantName: consultor.nome,
          }}
          accentHex={accentHex}
        />
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

export default ConsultorDashboard;




