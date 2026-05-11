import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, FileText, CheckCircle2, DollarSign, Clock, Zap, RefreshCw, Loader2, Palette, Trophy
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

interface KpiCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  delay: number;
  accent?: boolean;
  accentHex: string;
  accentHex: string;
}

const KpiCard = ({ title, value, sub, icon: Icon, delay, accentHex }: KpiCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-card p-6 flex flex-col relative group cursor-default overflow-hidden border transition-all duration-500"
    style={{ 
      background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)`,
      borderColor: 'rgba(255,255,255,0.05)'
    }}
  >
    {/* Clean Inner Glow on Hover */}
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl shadow-[inset_0_0_40px_rgba(255,255,255,0.02)]`} />

    <Icon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.02] group-hover:scale-105 group-hover:opacity-[0.05] transition-all duration-700 pointer-events-none" style={{ color: accentHex }} />
    <div
      className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-30 pointer-events-none"
      style={{ backgroundColor: accentHex }}
    />
    <div className="flex items-center justify-between mb-8 relative z-10">
      <p className="premium-label">{title}</p>
      <div
        className="p-2 rounded-lg border group-hover:scale-110 transition-transform"
        style={{
          backgroundColor: `${accentHex}18`,
          borderColor: `${accentHex}40`,
          color: accentHex,
        }}
      >
        <Icon size={16} />
      </div>
    </div>
    <div className="relative z-10 flex flex-col">
      <h3 className="premium-title text-3xl mb-1 text-white">{value}</h3>
      {sub && <span className="font-sans text-[0.7rem] text-slate-400 mt-1">{sub}</span>}
    </div>
  </motion.div>
);

const ConsultorDashboard = () => {
  const { consultor } = useConsultorAuth();
  const { associationData } = useAssociation();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);

  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;

  const fetchData = async () => {
    if (!consultor) return;
    setLoading(true);

    const { data } = await supabase
      .from('quotes')
      .select('id, created_at, status, mensalidade, plano_selecionado, cliente_nome, placa, modelo')
      .eq('consultant_id', consultor.id)
      .order('created_at', { ascending: false });

    if (data) {
      setQuotes(data);
      buildChartData(data);
    }
    
    await fetchRanking();
    setLoading(false);
  };

  const fetchRanking = async () => {
    if (!associationData?.id) return;
    
    const { data: consultants } = await supabase
      .from('consultants')
      .select('id, nome')
      .eq('association_id', associationData.id)
      .eq('ativo', true);

    if (!consultants) return;

    const { data: allQuotes } = await supabase
      .from('quotes')
      .select('consultant_id')
      .eq('association_id', associationData.id)
      .eq('status', 'converted');

    const quotesCount = (allQuotes || []).reduce((acc: any, q: any) => {
      if (q.consultant_id) {
        acc[q.consultant_id] = (acc[q.consultant_id] || 0) + 1;
      }
      return acc;
    }, {});

    const ranked = consultants.map(c => ({
      id: c.id,
      nome: c.nome,
      converted: quotesCount[c.id] || 0
    })).sort((a, b) => b.converted - a.converted).slice(0, 5);

    setRanking(ranked);
  };

  const buildChartData = (data: any[]) => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days[key] = 0;
    }
    data.forEach((q) => {
      const key = new Date(q.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      if (key in days) days[key]++;
    });
    setChartData(Object.entries(days).map(([name, cotacoes]) => ({ name, cotacoes })));
  };

  useEffect(() => {
    fetchData();
  }, [consultor, associationData]);

  const total = quotes.length;
  const converted = quotes.filter((q) => q.status === 'converted').length;
  const pending = quotes.filter((q) => q.status === 'pending').length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';
  const totalValue = quotes
    .filter((q) => q.status === 'converted')
    .reduce((sum, q) => sum + (q.mensalidade || 0), 0);

  const getStatusBadge = (status: string) => {
    if (status === 'converted')
      return (
        <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
          <CheckCircle2 size={10} className="mr-1" /> Convertida
        </span>
      );
    if (status === 'rejected')
      return (
        <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/30">
          Perdida
        </span>
      );
    return (
      <span className="inline-flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
        <Clock size={10} className="mr-1" /> Pendente
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="premium-label mb-2" style={{ color: accentHex }}>
            Meu Desempenho
          </p>
          <h1 className="premium-title text-4xl uppercase tracking-tighter">
            Olá, {consultor?.nome?.split(' ')[0]}
          </h1>
          <p className="text-slate-400 mt-1">Aqui estão as métricas das suas cotações.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => navigate('/consultor/cotacao')}
            className="flex items-center space-x-2 py-2.5 px-5 rounded-xl font-black text-sm text-black uppercase tracking-wide transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95"
            style={{ backgroundColor: accentHex }}
          >
            <Zap size={15} className="fill-black" />
            <span>Nova Cotação</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total de Cotações" value={String(total)} sub="geradas por mim" icon={FileText} delay={0.1} accentHex={accentHex} />
            <KpiCard
              title="Convertidas"
              value={String(converted)}
              sub={`${conversionRate}% de conversão`}
              icon={CheckCircle2}
              delay={0.2}
              accentHex={accentHex}
            />
            <KpiCard title="Pendentes" value={String(pending)} sub="aguardando aprovação" icon={Clock} delay={0.3} accentHex={accentHex} />
            <KpiCard
              title="Receita Gerada"
              value={formatCurrency(totalValue)}
              sub="em mensalidades convertidas"
              icon={DollarSign}
              delay={0.4}
              accentHex={accentHex}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2 glass-card p-8 flex flex-col relative overflow-hidden"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom right, ${accentHex}08, transparent)`,
                }}
              />
              <div className="mb-8 relative z-10 flex justify-between items-center">
                <h3 className="premium-label">Cotações nos Últimos 14 Dias</h3>
                <div
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: `${accentHex}33`, borderColor: `${accentHex}80` }}
                />
              </div>
              <div className="h-[260px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="consultorGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentHex} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={accentHex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(255,255,255,0.05)"
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                      interval={1}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.05)"
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(11,17,32,0.9)',
                        backdropFilter: 'blur(10px)',
                        borderColor: `${accentHex}30`,
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cotacoes"
                      name="Cotações"
                      stroke={accentHex}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#consultorGreen)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <div className="space-y-6">
              {/* Ranking */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card p-6 flex flex-col lg:col-span-1 border border-white/5 bg-[#121212]"
              >
                <div className="mb-6 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Trophy size={18} style={{ color: accentHex }} />
                    <h3 className="premium-label">Ranking de Vendas</h3>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  {ranking.map((r, idx) => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden hover:bg-white/[0.03] transition-colors group">
                      {idx === 0 && <div className="absolute inset-0 opacity-20" style={{ backgroundColor: accentHex }} />}
                      <div className="flex items-center space-x-3 relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${idx === 0 ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] border-white/20' : idx === 1 ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' : idx === 2 ? 'bg-amber-700/10 text-amber-500 border-amber-700/20' : 'bg-white/5 text-zinc-500 border-white/10'}`}>
                          {idx + 1}
                        </div>
                        <p className={`text-sm font-bold truncate max-w-[120px] transition-colors ${idx === 0 ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>{r.nome.split(' ')[0]}</p>
                      </div>
                      <div className="text-right relative z-10 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                        <p className="text-sm font-black text-white">{r.converted} <span className="text-[10px] text-zinc-500 font-medium">vendas</span></p>
                      </div>
                    </div>
                  ))}
                  {ranking.length === 0 && (
                    <div className="text-center text-zinc-500 text-xs py-4">Nenhuma venda na associação ainda.</div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Recent Quotes */}
          <div className="glass-card p-8 flex flex-col">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="premium-label">Últimas Cotações</h3>
              <button
                onClick={() => navigate('/consultor/vendas')}
                className="text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                style={{ color: accentHex }}
              >
                Ver todas →
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto styled-scrollbar pr-1">
              {quotes.slice(0, 5).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <FileText size={36} className="text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm font-medium">Nenhuma cotação ainda.</p>
                  <button
                    onClick={() => navigate('/consultor/cotacao')}
                    className="mt-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: accentHex }}
                  >
                    Gerar primeira cotação →
                  </button>
                </div>
              ) : (
                quotes.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 bg-black/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-200 truncate">
                        {q.cliente_nome || '—'}
                      </p>
                      <p className="text-xs text-zinc-600 font-mono">
                        {q.placa || q.modelo || '—'}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {new Date(q.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="ml-2 shrink-0">{getStatusBadge(q.status)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConsultorDashboard;
