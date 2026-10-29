import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Users, FileText, CheckCircle2, Car, Bike, Truck, Loader2,
  DollarSign, Sparkles, ShieldAlert, ArrowRight, LayoutGrid, Clock, Send,
  XCircle, Award, BarChart3, ChevronRight, Zap, Target
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { normalizeCommercialStatus, COMMERCIAL_STATUSES } from '../../utils/crmStatus';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const formatNumber = (val: number) =>
  new Intl.NumberFormat('pt-BR').format(val || 0);

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  subValue?: string;
  icon: React.ElementType;
  delay: number;
  accentHex: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  subValue,
  icon: Icon,
  delay,
  accentHex,
  onClick,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    onClick={onClick}
    className={`glass-card p-4 md:p-6 flex flex-col relative group overflow-hidden border transition-all duration-500 ${
      onClick ? 'cursor-pointer hover:border-white/20' : 'cursor-default'
    }`}
    style={{
      background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)`,
      borderColor: 'rgba(255,255,255,0.06)',
    }}
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl shadow-[inset_0_0_40px_rgba(255,255,255,0.02)]" />
    <Icon
      className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 opacity-[0.02] group-hover:scale-105 group-hover:opacity-[0.05] transition-all duration-700 pointer-events-none"
      style={{ color: accentHex }}
    />
    <div
      className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-30 pointer-events-none"
      style={{ backgroundColor: accentHex }}
    />

    <div className="flex flex-col relative z-10">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <p className="premium-label text-[0.65rem] md:text-[0.7rem] uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <div
          className="p-1.5 md:p-2 rounded-xl border group-hover:scale-110 transition-transform"
          style={{
            backgroundColor: `${accentHex}18`,
            borderColor: `${accentHex}40`,
            color: accentHex,
          }}
        >
          <Icon size={16} />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <h3 className="premium-title text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </h3>
          {subValue && (
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {subValue}
            </span>
          )}
        </div>
        {change && (
          <span className="font-sans text-[0.7rem] text-slate-400 mt-1">
            {change}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { associationData } = useAssociation();
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({
    total: 0,
    converted: 0,
    convertedRevenue: 0,
    conversionRate: '0.0',
    inPipeline: 0,
    novas: 0,
    pipelineRevenue: 0,
  });

  const [crmFunnel, setCrmFunnel] = useState<{
    novas: number;
    negociacao: number;
    proposta_enviada: number;
    convertidas: number;
    nao_convertidas: number;
  }>({ novas: 0, negociacao: 0, proposta_enviada: 0, convertidas: 0, nao_convertidas: 0 });

  const [rankingTab, setRankingTab] = useState<'vendas' | 'cotacoes'>('vendas');
  const [salesRanking, setSalesRanking] = useState<any[]>([]);
  const [quotesRanking, setQuotesRanking] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topVehicles, setTopVehicles] = useState<any[]>([]);
  const [plansDist, setPlansDist] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);

  const themeConfig = getThemeConfig(associationData?.theme || 'emerald');
  const accentHex = themeConfig.primary;

  useEffect(() => {
    if (associationData?.id) {
      fetchDashboardData();
    }
  }, [associationData]);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const { data: quotesData, error } = await supabase
        .from('quotes')
        .select('id, created_at, status, mensalidade, plano_selecionado, modelo, valor_fipe, consultant_id, consultants(id, nome), vehicle_categories(tipo_veiculo)')
        .eq('association_id', associationData?.id);

      if (error) {
        console.error('Erro ao buscar cotações do dashboard:', error);
      }

      const quotes = quotesData || [];

      // 1. Funil Comercial & KPIs
      let novasCount = 0;
      let negociacaoCount = 0;
      let propostaEnviadaCount = 0;
      let convertidasCount = 0;
      let naoConvertidasCount = 0;
      let convertedRev = 0;
      let pipelineRev = 0;

      quotes.forEach(q => {
        const st = normalizeCommercialStatus(q.status);
        const val = Number(q.mensalidade) || 0;
        if (st === 'nova') novasCount++;
        else if (st === 'negociacao') {
          negociacaoCount++;
          pipelineRev += val;
        } else if (st === 'proposta_enviada') {
          propostaEnviadaCount++;
          pipelineRev += val;
        } else if (st === 'convertida') {
          convertidasCount++;
          convertedRev += val;
        } else if (st === 'nao_convertida') {
          naoConvertidasCount++;
        }
      });

      const inPipelineCount = negociacaoCount + propostaEnviadaCount;
      const convRate = quotes.length > 0 ? ((convertidasCount / quotes.length) * 100).toFixed(1) : '0.0';

      setKpis({
        total: quotes.length,
        converted: convertidasCount,
        convertedRevenue: convertedRev,
        conversionRate: convRate,
        inPipeline: inPipelineCount,
        novas: novasCount,
        pipelineRevenue: pipelineRev,
      });

      setCrmFunnel({
        novas: novasCount,
        negociacao: negociacaoCount,
        proposta_enviada: propostaEnviadaCount,
        convertidas: convertidasCount,
        nao_convertidas: naoConvertidasCount,
      });

      // 2. Gráfico de Atividade (Últimos 14 dias)
      const days: Record<string, { name: string; cotacoes: number; convertidas: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        days[key] = { name: key, cotacoes: 0, convertidas: 0 };
      }
      quotes.forEach(q => {
        const date = new Date(q.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (days[date]) {
          days[date].cotacoes++;
          if (normalizeCommercialStatus(q.status) === 'convertida') {
            days[date].convertidas++;
          }
        }
      });
      setChartData(Object.values(days));

      // 3. Ranking Completo dos Consultores (Vendas e Cotações)
      const consultantsMap: Record<string, { id: string; name: string; quotesCount: number; salesCount: number; revenue: number }> = {};

      quotes.forEach(q => {
        if (q.consultants && q.consultant_id) {
          const id = q.consultant_id;
          const name = (q.consultants as any)?.nome || 'Consultor';
          if (!consultantsMap[id]) {
            consultantsMap[id] = { id, name, quotesCount: 0, salesCount: 0, revenue: 0 };
          }
          consultantsMap[id].quotesCount++;
          if (normalizeCommercialStatus(q.status) === 'convertida') {
            consultantsMap[id].salesCount++;
            consultantsMap[id].revenue += (Number(q.mensalidade) || 0);
          }
        }
      });

      const statsList = Object.values(consultantsMap);

      // Ranking por Vendas
      const bySales = [...statsList]
        .sort((a, b) => b.salesCount - a.salesCount || b.quotesCount - a.quotesCount)
        .slice(0, 5)
        .map((c, i) => ({
          pos: i + 1,
          ...c,
          convRate: c.quotesCount > 0 ? ((c.salesCount / c.quotesCount) * 100).toFixed(0) : '0',
        }));
      setSalesRanking(bySales);

      // Ranking por Cotações Totais
      const byQuotes = [...statsList]
        .sort((a, b) => b.quotesCount - a.quotesCount || b.salesCount - a.salesCount)
        .slice(0, 5)
        .map((c, i) => ({
          pos: i + 1,
          ...c,
          convRate: c.quotesCount > 0 ? ((c.salesCount / c.quotesCount) * 100).toFixed(0) : '0',
        }));
      setQuotesRanking(byQuotes);

      // 4. Veículos em Alta
      const vehiclesMap: Record<string, { name: string; tipo: string; count: number }> = {};
      quotes.forEach(q => {
        if (q.modelo) {
          if (!vehiclesMap[q.modelo]) {
            const tipo = (q.vehicle_categories as any)?.tipo_veiculo || 'carro';
            vehiclesMap[q.modelo] = { name: q.modelo, tipo, count: 0 };
          }
          vehiclesMap[q.modelo].count++;
        }
      });
      const topV = Object.values(vehiclesMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((v, i) => ({
          pos: i + 1,
          name: v.name,
          tipo: v.tipo === 'moto' ? 'Moto' : v.tipo === 'caminhao' ? 'Caminhão' : 'Carro',
          conv: v.count,
        }));
      setTopVehicles(topV);

      // 5. Planos Convertidos
      const plansMap: Record<string, number> = {};
      const convertedQuotes = quotes.filter(q => normalizeCommercialStatus(q.status) === 'convertida');
      convertedQuotes.forEach(q => {
        if (q.plano_selecionado) {
          plansMap[q.plano_selecionado] = (plansMap[q.plano_selecionado] || 0) + 1;
        }
      });
      const totalPlans = convertedQuotes.length || 1;
      const plansArray = Object.entries(plansMap)
        .map(([name, count]) => ({
          name,
          count,
          pct: Math.round((count / totalPlans) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];
      const textColors = ['text-blue-400', 'text-violet-400', 'text-emerald-400', 'text-amber-400'];

      setPlansDist(
        plansArray.map((p, i) => ({
          ...p,
          color: colors[i % colors.length],
          textColor: textColors[i % textColors.length],
        }))
      );

      // 6. Segmentação Geral
      const segMap: Record<string, { count: number; fipeSum: number }> = {
        carro: { count: 0, fipeSum: 0 },
        moto: { count: 0, fipeSum: 0 },
        caminhao: { count: 0, fipeSum: 0 },
      };
      quotes.forEach(q => {
        const tipo = (q.vehicle_categories as any)?.tipo_veiculo || 'carro';
        if (segMap[tipo]) {
          segMap[tipo].count++;
          segMap[tipo].fipeSum += Number(q.valor_fipe) || 0;
        }
      });

      const totalSeg = quotes.length || 1;
      const segs = [
        {
          id: 'carro',
          Icon: Car,
          name: 'Carros',
          pct: `${Math.round((segMap.carro.count / totalSeg) * 100)}%`,
          avg: segMap.carro.count > 0 ? segMap.carro.fipeSum / segMap.carro.count : 0,
          color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        },
        {
          id: 'moto',
          Icon: Bike,
          name: 'Motos',
          pct: `${Math.round((segMap.moto.count / totalSeg) * 100)}%`,
          avg: segMap.moto.count > 0 ? segMap.moto.fipeSum / segMap.moto.count : 0,
          color: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
        },
        {
          id: 'caminhao',
          Icon: Truck,
          name: 'Caminhões',
          pct: `${Math.round((segMap.caminhao.count / totalSeg) * 100)}%`,
          avg: segMap.caminhao.count > 0 ? segMap.caminhao.fipeSum / segMap.caminhao.count : 0,
          color: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        },
      ];
      setSegments(segs);
    } catch (err) {
      console.error('Erro geral no Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAiAssistant = (promptQuery?: string) => {
    window.dispatchEvent(new CustomEvent('open-coteai-assistant', { detail: { query: promptQuery } }));
  };

  const currentRanking = rankingTab === 'vendas' ? salesRanking : quotesRanking;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6 relative">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <p className="premium-label mb-1 text-slate-400">Monitoramento da Operação</p>
          <h1 className="premium-title text-2xl md:text-4xl uppercase tracking-tighter text-white">
            Visão Global
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto relative z-10">
          <button
            type="button"
            onClick={() => handleOpenAiAssistant('Resumo completo da operação comercial')}
            className="px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg"
            style={{
              backgroundColor: `${accentHex}15`,
              borderColor: `${accentHex}40`,
              color: accentHex,
            }}
          >
            <Sparkles size={15} className="animate-pulse" />
            <span className="hidden sm:inline">Cote AI Manager</span>
            <span className="sm:hidden">IA</span>
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-5 md:px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider glass-card hover:scale-105 active:scale-95 transition-all text-white border-white/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-md"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* ── Quick Access: Módulos de Eventos & Indicadores ─────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <Link
              to="/events"
              className="p-4 md:p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 transition-all flex items-center justify-between group shadow-lg"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500 text-white">
                      Módulo Integrado
                    </span>
                    <h3 className="text-sm md:text-base font-extrabold text-white">
                      Gestão de Eventos (Sinistros)
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Acompanhe vistorias, orçamentos, oficinas, peças e entrega de veículos
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </Link>

            <Link
              to="/indicators"
              className="p-4 md:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all flex items-center justify-between group shadow-lg"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                      Módulo Integrado
                    </span>
                    <h3 className="text-sm md:text-base font-extrabold text-white">
                      Indicadores Comerciais & SGA
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Churn, sinistralidade, ticket médio, rentabilidade e saúde da base
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </Link>
          </div>

          {/* ── KPI Stat Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              title="Cotações Totais"
              value={formatNumber(kpis.total)}
              change="Histórico da associação"
              icon={FileText}
              delay={0.1}
              accentHex={accentHex}
              onClick={() => navigate('/sales')}
            />
            <StatCard
              title="Vendas Convertidas"
              value={formatNumber(kpis.converted)}
              subValue={kpis.convertedRevenue > 0 ? formatCurrency(kpis.convertedRevenue) : undefined}
              change="Contratos/adesões ativas"
              icon={CheckCircle2}
              delay={0.2}
              accentHex="#10b981"
              onClick={() => navigate('/sales')}
            />
            <StatCard
              title="Funil Ativo (CRM)"
              value={formatNumber(kpis.inPipeline)}
              subValue={kpis.novas > 0 ? `+${kpis.novas} novas` : undefined}
              change="Em negociação ou proposta"
              icon={Clock}
              delay={0.3}
              accentHex="#6366f1"
              onClick={() => navigate('/sales?view=pipeline')}
            />
            <StatCard
              title="Taxa de Conversão"
              value={`${kpis.conversionRate}%`}
              change="Conversão cotação → venda"
              icon={TrendingUp}
              delay={0.4}
              accentHex={accentHex}
            />
          </div>

          {/* ── CRM Pipeline Funnel Overview ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="glass-card p-5 md:p-6 rounded-2xl border border-white/10 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <p className="premium-label text-xs uppercase tracking-wider text-slate-400">Pipeline Comercial</p>
                <h3 className="text-lg md:text-xl font-extrabold text-white">Funil de Vendas do CRM</h3>
              </div>
              <Link
                to="/sales?view=pipeline"
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all flex items-center gap-2 self-start sm:self-auto group"
              >
                <LayoutGrid size={14} className="text-blue-400" />
                <span>Abrir Pipeline CRM Completo</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform text-zinc-400" />
              </Link>
            </div>

            {/* Stage Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* 1. Novas */}
              <div
                onClick={() => navigate('/sales')}
                className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Novas Cotações</span>
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <p className="text-2xl font-black text-white">{crmFunnel.novas}</p>
                <p className="text-[11px] text-zinc-400 mt-1">Aguardando contato</p>
              </div>

              {/* 2. Negociação */}
              <div
                onClick={() => navigate('/sales?view=pipeline')}
                className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Em Negociação</span>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <p className="text-2xl font-black text-white">{crmFunnel.negociacao}</p>
                <p className="text-[11px] text-zinc-400 mt-1">Contato e condições</p>
              </div>

              {/* 3. Proposta Enviada */}
              <div
                onClick={() => navigate('/sales?view=pipeline')}
                className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Proposta Enviada</span>
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
                <p className="text-2xl font-black text-white">{crmFunnel.proposta_enviada}</p>
                <p className="text-[11px] text-zinc-400 mt-1">Aguardando fechamento</p>
              </div>

              {/* 4. Convertidas */}
              <div
                onClick={() => navigate('/sales')}
                className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Convertidas</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-black text-white">{crmFunnel.convertidas}</p>
                <p className="text-[11px] text-zinc-400 mt-1">Vendas confirmadas</p>
              </div>

              {/* 5. Não Convertidas */}
              <div
                onClick={() => navigate('/sales')}
                className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition-all col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Não Convertidas</span>
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
                <p className="text-2xl font-black text-white">{crmFunnel.nao_convertidas}</p>
                <p className="text-[11px] text-zinc-400 mt-1">Desistências / Perdidas</p>
              </div>
            </div>
          </motion.div>

          {/* ── Main Activity Grid: Gráfico 14 Dias & Ranking da Equipe ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Gráfico 14 Dias */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="lg:col-span-2 glass-card p-4 md:p-8 flex flex-col relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="mb-4 md:mb-8 relative z-10 flex justify-between items-center">
                <div>
                  <h3 className="premium-label text-slate-400">Atividade — Últimos 14 dias</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Evolução diária de cotações geradas vs vendas</p>
                </div>
                <div className="hidden sm:flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/40" />
                    <span className="text-xs text-slate-400 font-bold uppercase">Cotações</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                    <span className="text-xs text-slate-400 font-bold uppercase">Convertidas</span>
                  </div>
                </div>
              </div>

              <div className="h-[220px] md:h-[300px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(255,255,255,0.05)"
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                      interval={1}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.05)"
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11, 17, 32, 0.95)',
                        backdropFilter: 'blur(10px)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area type="monotone" name="Cotações" dataKey="cotacoes" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorBlue)" />
                    <Area type="monotone" name="Convertidas" dataKey="convertidas" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorEmerald)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Ranking dos Consultores (Completíssimo) */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="glass-card p-5 md:p-6 flex flex-col relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="premium-label text-slate-400">Ranking Comercial</h3>
                  <p className="text-xs text-zinc-400">Liderança da equipe</p>
                </div>
                {/* Tabs de Ranking */}
                <div className="flex bg-black/40 border border-white/10 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setRankingTab('vendas')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      rankingTab === 'vendas' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Vendas
                  </button>
                  <button
                    type="button"
                    onClick={() => setRankingTab('cotacoes')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      rankingTab === 'cotacoes' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Cotações
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 flex-1 relative z-10">
                {currentRanking.length > 0 ? (
                  currentRanking.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all border border-white/5 hover:border-emerald-500/20 bg-black/20 group relative overflow-hidden"
                    >
                      <div className="flex items-center space-x-3 relative z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold border ${
                            c.pos === 1
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                              : c.pos === 2
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                              : c.pos === 3
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          {c.pos}
                        </div>
                        <div>
                          <p className="font-sans text-xs md:text-sm font-semibold truncate max-w-[130px] text-white">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {c.quotesCount} cotações • {c.convRate}% conv.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end relative z-10">
                        <span className="font-mono text-sm text-white font-black">
                          {rankingTab === 'vendas' ? c.salesCount : c.quotesCount}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">
                          {rankingTab === 'vendas' ? 'Vendas' : 'Cots.'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500 py-8">
                    Nenhum consultor registrado ainda.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <Link
                  to="/consultants"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 group"
                >
                  <span>Gerenciar Equipe ({formatNumber(currentRanking.length)} exibidos)</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>

          {/* ── Cote AI Manager Hub Card ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="p-5 md:p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-blue-950/30 relative overflow-hidden shadow-lg"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">Cote AI Manager • Inteligência Operacional</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      GPT-4o Mini
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 max-w-2xl">
                    Consulte relatórios comerciais, desempenho de consultores, análise de churn e insights com linguagem natural.
                  </p>
                </div>
              </div>

              {/* Action Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAiAssistant('Como está o fechamento de cotações e vendas deste mês?')}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-[11px] font-semibold text-zinc-200 transition-all"
                >
                  📊 Fechamento do mês
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAiAssistant('Quem são os consultores com mais cotações pendentes de contato?')}
                  className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 text-[11px] font-semibold text-zinc-200 transition-all"
                >
                  ⚡ Consultores & Leads
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAiAssistant()}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Conversar com IA</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Analytics Row: Veículos, Planos e Segmentação ─────── */}
          <div className="pt-4 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <p className="premium-label mb-6 text-center italic opacity-60 text-slate-400">
              Insights Estratégicos Cote AI
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Veículos em Alta */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-card p-6 md:p-8 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                <h3 className="premium-label mb-6 relative z-10 text-slate-400">Veículos em Alta</h3>
                <div className="space-y-2 relative z-10">
                  {topVehicles.length > 0 ? (
                    topVehicles.map((v) => (
                      <div
                        key={v.pos}
                        className="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/[0.03] transition-all border border-white/5 hover:border-blue-500/20 bg-black/20 group relative overflow-hidden"
                      >
                        <div className="flex items-center space-x-3 relative z-10">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/10 ${
                              v.pos === 1
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                : 'bg-white/5 text-zinc-400'
                            }`}
                          >
                            {v.tipo === 'Moto' ? <Bike size={16} /> : v.tipo === 'Caminhão' ? <Truck size={16} /> : <Car size={16} />}
                          </div>
                          <div>
                            <p className="font-sans font-bold text-slate-200 text-xs md:text-sm truncate max-w-[140px] group-hover:text-white transition-colors">
                              {v.name}
                            </p>
                            <p className="font-sans text-[0.6rem] text-zinc-500 uppercase tracking-widest font-bold">
                              Top {v.pos} • {v.tipo}
                            </p>
                          </div>
                        </div>
                        <div className="relative z-10 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                          <span className="font-mono text-xs text-blue-400 font-black">
                            {v.conv} <span className="text-[10px]">cot.</span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-zinc-500 py-8">Nenhum veículo cotado.</div>
                  )}
                </div>
              </motion.div>

              {/* Planos Convertidos */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="glass-card p-6 md:p-8 flex flex-col justify-between relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <h3 className="premium-label mb-6 text-slate-400">Planos Convertidos</h3>
                  <div className="space-y-6">
                    {plansDist.length > 0 ? (
                      plansDist.map((plan) => (
                        <div key={plan.name} className="space-y-3">
                          <div className="flex justify-between items-end">
                            <span className={`font-sans text-[0.7rem] font-bold ${plan.textColor} uppercase tracking-widest`}>
                              {plan.name}
                            </span>
                            <span className="font-mono text-sm text-white font-bold">{plan.pct}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div
                              className={`h-full rounded-full ${plan.color} relative overflow-hidden`}
                              style={{ width: `${plan.pct}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-zinc-500 py-8">Nenhuma conversão registrada ainda.</div>
                    )}
                  </div>
                </div>
                {plansDist.length > 0 && (
                  <div className="mt-8 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <p className="font-sans text-[0.65rem] text-slate-400 leading-relaxed text-center italic">
                      O plano "{plansDist[0].name}" lidera com {plansDist[0].pct}% das conversões.
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Segmentação Geral */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="glass-card p-6 md:p-8 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
              >
                <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                <h3 className="premium-label mb-6 relative z-10 text-slate-400">Segmentação Geral</h3>
                <div className="flex flex-col space-y-4 relative z-10">
                  {segments.map(({ id, Icon, name, pct, avg, color }) => (
                    <div
                      key={id}
                      className="flex items-center space-x-4 p-3.5 rounded-2xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                          color.split(' ')[0]
                        } border ${color.split(' ')[1]} ${color.split(' ')[2]}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-sans text-xs font-bold text-slate-200 uppercase tracking-wide">
                            {name}
                          </span>
                          <span className="font-mono text-sm text-white font-bold">{pct}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          FIPE média: {formatCurrency(avg)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
