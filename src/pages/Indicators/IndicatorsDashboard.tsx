import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Users, DollarSign, ShieldAlert,
  Percent, Award, UserMinus, UserCheck, AlertTriangle, RefreshCw,
  HelpCircle, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useAssociation } from '../../contexts/AssociationContext';
import type { IndicadoresComerciais, SnapshotMensal } from '../../types/events';
import { fetchIndicadores, fetchHistoricoIndicadores } from '../../services/indicatorsService';

const IndicatorsDashboard: React.FC = () => {
  const { associationData, theme } = useAssociation();
  const associationId = associationData?.id || '';
  const accentHex = theme?.colors?.glowHex || '#3B82F6';

  const [periodo, setPeriodo] = useState('este_mes');
  const [indicadores, setIndicadores] = useState<IndicadoresComerciais | null>(null);
  const [historico, setHistorico] = useState<SnapshotMensal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [associationId, periodo]);

  const loadData = async () => {
    if (!associationId) return;
    setLoading(true);
    try {
      const [inds, hist] = await Promise.all([
        fetchIndicadores(associationId, periodo),
        fetchHistoricoIndicadores(associationId),
      ]);
      setIndicadores(inds);
      setHistorico(hist);
    } finally {
      setLoading(false);
    }
  };

  // Formatações
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

  const formatPercent = (val: number) => `${Number(val || 0).toFixed(1)}%`;

  // Dados para gráficos do Recharts formatados
  const chartData = historico.map((h) => {
    const d = new Date(h.competencia);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });
    const taxaSinistralidade = h.receita_recebida > 0 ? (h.custo_eventos / h.receita_recebida) * 100 : 0;
    const taxaInadimplencia = h.receita_faturada > 0 ? (h.valor_em_atraso / h.receita_faturada) * 100 : 0;
    return {
      mes: label.charAt(0).toUpperCase() + label.slice(1),
      receita: h.receita_recebida,
      custoSinistros: h.custo_eventos,
      entradas: h.entradas,
      cancelados: h.cancelados,
      sinistralidade: Number(taxaSinistralidade.toFixed(1)),
      inadimplencia: Number(taxaInadimplencia.toFixed(1)),
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="premium-title text-2xl md:text-3xl uppercase tracking-tighter text-white flex items-center space-x-3">
            <TrendingUp size={28} style={{ color: accentHex }} />
            <span>Indicadores Comerciais & Operacionais</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Métricas estratégicas da base, rentabilidade, churn e índice de qualidade.
          </p>
        </div>

        {/* Filtro Período */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
            <Calendar size={14} className="text-zinc-400" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-white"
            >
              <option value="este_mes" className="bg-[#0B1120]">Mês Atual (Outubro)</option>
              <option value="mes_passado" className="bg-[#0B1120]">Mês Anterior (Setembro)</option>
              <option value="ultimos_3_meses" className="bg-[#0B1120]">Últimos 3 Meses</option>
              <option value="ultimos_6_meses" className="bg-[#0B1120]">Últimos 6 Meses</option>
              <option value="ano_atual" className="bg-[#0B1120]">Ano Atual (2026)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-colors"
            title="Atualizar Indicadores"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid com os 8 Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Entradas no Mês */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Entradas no Mês</span>
            <UserCheck size={18} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            {indicadores?.entradas_mes || 0}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
              <TrendingUp size={12} />
              <span>+{indicadores?.variacao_entradas || 14.3}%</span>
            </span>
            <span className="text-zinc-500">vs. mês anterior</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Novos associados com adesão no mês
          </p>
        </div>

        {/* 2. Receita Recebida */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Receita Recebida</span>
            <DollarSign size={18} style={{ color: accentHex }} />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            {formatCurrency(indicadores?.receita_mes || 0)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
              <TrendingUp size={12} />
              <span>+{indicadores?.variacao_receita || 8.6}%</span>
            </span>
            <span className="text-zinc-500">vs. mês anterior</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Mensalidades efetivamente quitadas
          </p>
        </div>

        {/* 3. Ticket Médio */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Ticket Médio</span>
            <Percent size={18} className="text-purple-400" />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            R$ {Number(indicadores?.ticket_medio || 0).toFixed(2)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-purple-400 font-bold flex items-center space-x-0.5">
              <TrendingUp size={12} />
              <span>+{indicadores?.variacao_ticket_medio || 2.1}%</span>
            </span>
            <span className="text-zinc-500">vs. mês anterior</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Receita ÷ associados adimplentes
          </p>
        </div>

        {/* 4. Churn Mensal */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Taxa de Churn</span>
            <UserMinus size={18} className="text-rose-400" />
          </div>
          <h3 className="text-2xl font-black text-rose-400 font-mono">
            {formatPercent(indicadores?.taxa_churn || 0)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
              <TrendingDown size={12} />
              <span>{indicadores?.variacao_churn || -0.32}%</span>
            </span>
            <span className="text-zinc-500">vs. mês anterior (queda é positiva)</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Cancelados ÷ base ativa inicial
          </p>
        </div>

        {/* 5. Inadimplência */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Inadimplência</span>
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <h3 className="text-2xl font-black text-amber-400 font-mono">
            {formatPercent(indicadores?.taxa_inadimplencia || 0)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
              <TrendingDown size={12} />
              <span>{indicadores?.variacao_inadimplencia || -0.65}%</span>
            </span>
            <span className="text-zinc-500">vs. mês anterior</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Valor em atraso ÷ valor faturado
          </p>
        </div>

        {/* 6. Sinistralidade */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Sinistralidade</span>
            <ShieldAlert size={18} className="text-cyan-400" />
          </div>
          <h3 className="text-2xl font-black text-cyan-400 font-mono">
            {formatPercent(indicadores?.taxa_sinistralidade || 0)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
              <TrendingDown size={12} />
              <span>{indicadores?.variacao_sinistralidade || -3.8}%</span>
            </span>
            <span className="text-zinc-500">Meta: abaixo de 55%</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Custo dos eventos ÷ receita recebida
          </p>
        </div>

        {/* 7. Rentabilidade da Base */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Rentabilidade Líquida</span>
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(indicadores?.rentabilidade_base || 0)}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
              <TrendingUp size={12} />
              <span>+{indicadores?.variacao_rentabilidade || 12.4}%</span>
            </span>
            <span className="text-zinc-500">vs. mês anterior</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 italic">
            Receita total − custo dos eventos
          </p>
        </div>

        {/* 8. Qualidade da Base */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] relative group">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Qualidade da Base</span>
            <Award size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-black text-white font-mono">
              {Number(indicadores?.indice_qualidade_base || 88.4).toFixed(1)}
            </h3>
            <span className="text-xs text-zinc-400 font-bold">/ 100</span>
          </div>
          {/* Barra de Score */}
          <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400"
              style={{ width: `${Math.min(100, indicadores?.indice_qualidade_base || 88.4)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 italic">
            Adimplência (40%) + Tempo de Casa (30%) + Baixa Sinistralidade (30%)
          </p>
        </div>
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Receita vs Custo de Eventos */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Evolução Financeira: Receita vs Custo de Sinistros
              </h4>
              <p className="text-xs text-zinc-400">Histórico de receita recebida e desembolsos operacionais</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                <span className="text-zinc-300">Receita</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="text-zinc-300">Sinistros</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSinistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#71717A" fontSize={11} />
                <YAxis
                  stroke="#71717A"
                  fontSize={11}
                  tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [formatCurrency(val), '']}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceita)"
                  name="Receita"
                />
                <Area
                  type="monotone"
                  dataKey="custoSinistros"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSinistros)"
                  name="Custo Sinistros"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Entradas vs Cancelamentos */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Fluxo da Base: Entradas vs Cancelamentos
              </h4>
              <p className="text-xs text-zinc-400">Balanço de novos associados e evasão mensal</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-zinc-300">Entradas</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="text-zinc-300">Cancelados</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#71717A" fontSize={11} />
                <YAxis stroke="#71717A" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="entradas" fill="#10B981" radius={[4, 4, 0, 0]} name="Entradas" />
                <Bar dataKey="cancelados" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Cancelados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Sinistralidade vs Meta */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Taxa de Sinistralidade vs Meta (55%)
              </h4>
              <p className="text-xs text-zinc-400">Acompanhamento do índice de sinistralidade ao longo do tempo</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#71717A" fontSize={11} />
                <YAxis stroke="#71717A" fontSize={11} domain={[0, 80]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, '']}
                />
                <ReferenceLine
                  y={55}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: 'Meta Máx 55%', fill: '#F59E0B', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="sinistralidade"
                  stroke="#06B6D4"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#06B6D4' }}
                  activeDot={{ r: 6 }}
                  name="Sinistralidade"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Taxa de Inadimplência */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Comportamento da Inadimplência
              </h4>
              <p className="text-xs text-zinc-400">Percentual do faturamento em aberto após o vencimento</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#71717A" fontSize={11} />
                <YAxis stroke="#71717A" fontSize={11} domain={[0, 10]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Inadimplência']}
                />
                <Line
                  type="monotone"
                  dataKey="inadimplencia"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F59E0B' }}
                  name="Inadimplência"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsDashboard;
