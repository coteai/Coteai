import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle2, Car, Bike, Truck, Loader2, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const formatNumber = (val: number) =>
  new Intl.NumberFormat('pt-BR').format(val || 0);

const StatCard = ({ title, value, change, icon: Icon, delay, accentHex }: any) => {
  return (
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

    {/* Subtle Watermark Icon */}
    <Icon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.02] group-hover:scale-105 group-hover:opacity-[0.05] transition-all duration-700 pointer-events-none" style={{ color: accentHex }} />
    
    <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-30 pointer-events-none" style={{ backgroundColor: accentHex }} />
    
    <div className="flex flex-col relative z-10">
      <div className="flex items-center justify-between mb-8">
        <p className="premium-label">{title}</p>
        <div className="p-2 rounded-lg border group-hover:scale-110 transition-transform" style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}>
          <Icon size={16} />
        </div>
      </div>
      
      <div className="flex flex-col">
        <h3 className="premium-title text-3xl mb-1 text-white">{value}</h3>
        {change && (
          <span className="font-sans text-[0.7rem] text-slate-400 mt-1">
            {change}
          </span>
        )}
      </div>
    </div>
  </motion.div>
)};

const Dashboard = () => {
  const { associationData } = useAssociation();
  const [loading, setLoading] = useState(true);
  
  const [kpis, setKpis] = useState({ total: 0, converted: 0, conversionRate: '0.0', avgTicket: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
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
    
    // Fetch quotes
    const { data: quotesData, error } = await supabase
      .from('quotes')
      .select('*, consultants(nome), vehicle_categories(tipo_veiculo)')
      .eq('association_id', associationData?.id);
      
    const quotes = quotesData || [];

    // 1. KPIs
    const total = quotes.length;
    const converted = quotes.filter(q => q.status === 'converted');
    const conversionRate = total > 0 ? ((converted.length / total) * 100).toFixed(1) : '0.0';
    const totalRevenue = converted.reduce((sum, q) => sum + (Number(q.mensalidade) || 0), 0);
    const avgTicket = converted.length > 0 ? totalRevenue / converted.length : 0;
    
    setKpis({ total, converted: converted.length, conversionRate, avgTicket });

    // 2. Chart Data (Last 14 days)
    const days: any = {};
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
        if (q.status === 'converted') days[date].convertidas++;
      }
    });
    setChartData(Object.values(days));

    // 3. Consultant Ranking
    const consultantsMap: any = {};
    converted.forEach(q => {
      if (q.consultants) {
        const id = q.consultant_id;
        if (!consultantsMap[id]) {
          consultantsMap[id] = { name: q.consultants.nome, conv: 0 };
        }
        consultantsMap[id].conv++;
      }
    });
    const rankedConsultants = Object.values(consultantsMap)
      .sort((a: any, b: any) => b.conv - a.conv)
      .slice(0, 5)
      .map((c: any, i) => ({ pos: i + 1, ...c }));
    setRanking(rankedConsultants);

    // 4. Top Vehicles
    const vehiclesMap: any = {};
    quotes.forEach(q => {
      if (q.modelo) {
        if (!vehiclesMap[q.modelo]) {
          const tipo = q.vehicle_categories?.tipo_veiculo || 'carro';
          vehiclesMap[q.modelo] = { name: q.modelo, tipo: tipo, count: 0 };
        }
        vehiclesMap[q.modelo].count++;
      }
    });
    const topV = Object.values(vehiclesMap)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .map((v: any, i) => ({ pos: i + 1, name: v.name, tipo: v.tipo === 'moto' ? 'Moto' : v.tipo === 'caminhao' ? 'Caminhão' : 'Carro', conv: v.count }));
    setTopVehicles(topV);

    // 5. Plans Distribution
    const plansMap: any = {};
    converted.forEach(q => {
      if (q.plano_selecionado) {
        plansMap[q.plano_selecionado] = (plansMap[q.plano_selecionado] || 0) + 1;
      }
    });
    const plansArray = Object.entries(plansMap).map(([name, count]: any) => ({
      name,
      count,
      pct: converted.length > 0 ? Math.round((count / converted.length) * 100) : 0
    })).sort((a, b) => b.count - a.count);
    
    const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-zinc-500'];
    const textColors = ['text-violet-400', 'text-blue-400', 'text-emerald-400', 'text-orange-400', 'text-zinc-300'];
    
    setPlansDist(plansArray.map((p, i) => ({
      ...p,
      color: colors[i % colors.length],
      textColor: textColors[i % textColors.length]
    })));

    // 6. Segmentation
    const segMap: any = {
      carro: { count: 0, fipeSum: 0 },
      moto: { count: 0, fipeSum: 0 },
      caminhao: { count: 0, fipeSum: 0 },
    };
    quotes.forEach(q => {
      const tipo = q.vehicle_categories?.tipo_veiculo || 'carro';
      if (segMap[tipo]) {
        segMap[tipo].count++;
        segMap[tipo].fipeSum += (Number(q.valor_fipe) || 0);
      }
    });
    
    const totalSeg = quotes.length || 1; 
    const segs = [
      { id: 'carro', Icon: Car, name: 'Carros', pct: `${Math.round((segMap.carro.count / totalSeg) * 100)}%`, avg: segMap.carro.count > 0 ? segMap.carro.fipeSum / segMap.carro.count : 0, color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
      { id: 'moto', Icon: Bike, name: 'Motos', pct: `${Math.round((segMap.moto.count / totalSeg) * 100)}%`, avg: segMap.moto.count > 0 ? segMap.moto.fipeSum / segMap.moto.count : 0, color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
      { id: 'caminhao', Icon: Truck, name: 'Caminhões', pct: `${Math.round((segMap.caminhao.count / totalSeg) * 100)}%`, avg: segMap.caminhao.count > 0 ? segMap.caminhao.fipeSum / segMap.caminhao.count : 0, color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    ];
    setSegments(segs);

    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end mb-12 relative">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <p className="premium-label mb-2">Monitoramento de Performance</p>
          <h1 className="premium-title text-4xl uppercase tracking-tighter">Visão Global</h1>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={loading}
          className="relative z-10 px-8 py-3 glass-card rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all text-white border-white/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Atualizar Dados
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Cotações Totais" value={formatNumber(kpis.total)} change="Geradas pela associação" icon={FileText} delay={0.1} accentHex={accentHex} />
            <StatCard title="Convertidas" value={formatNumber(kpis.converted)} change="Vendas confirmadas" icon={CheckCircle2} delay={0.2} accentHex={accentHex} />
            <StatCard title="Taxa Conversão" value={`${kpis.conversionRate}%`} change="Conversão global" icon={TrendingUp} delay={0.3} accentHex={accentHex} />
            <StatCard title="Ticket Médio" value={formatCurrency(kpis.avgTicket)} change="Mensalidade média convertida" icon={DollarSign} delay={0.4} accentHex={accentHex} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="lg:col-span-2 glass-card p-8 flex flex-col relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="mb-10 relative z-10 flex justify-between items-center">
                <h3 className="premium-label">Evolução de Atividade (Últimos 14 dias)</h3>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/40" />
                    <span className="text-xs text-slate-400 font-bold uppercase">Cotações</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500/20 border border-violet-500/40" />
                    <span className="text-xs text-slate-400 font-bold uppercase">Convertidas</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorViolet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.05)" 
                      tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'var(--font-mono)'}} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                      interval={1}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.05)" 
                      tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'var(--font-mono)'}} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(11, 17, 32, 0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area type="monotone" name="Cotações" dataKey="cotacoes" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorBlue)" />
                    <Area type="monotone" name="Convertidas" dataKey="convertidas" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorViolet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Consultant Ranking */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="glass-card p-8 flex flex-col relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-violet-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="mb-8 relative z-10">
                <h3 className="premium-label">Liderança de Vendas</h3>
              </div>
 
              <div className="flex-1 space-y-3 relative z-10">
                {ranking.length > 0 ? ranking.map((c) => (
                  <div key={c.pos} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5 bg-black/20 relative overflow-hidden">
                    {c.pos === 1 && <div className="absolute inset-0 bg-emerald-500/5" />}
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs border ${
                        c.pos === 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 accent-glow-emerald shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-slate-500'
                      }`}>
                        {c.pos}
                      </div>
                      <span className={`font-sans text-sm font-semibold truncate max-w-[120px] ${c.pos === 1 ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{c.name}</span>
                    </div>
                    <div className="flex flex-col items-end relative z-10">
                      <span className="font-mono text-sm text-white font-bold">{c.conv}</span>
                      <span className="text-[0.6rem] text-slate-600 uppercase font-bold tracking-tighter">Vendas</span>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-500 font-medium">Nenhuma venda registrada ainda.</div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Analytics Row */}
          <div className="pt-12 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <p className="premium-label mb-8 text-center italic opacity-60">Insights Avançados Cote AI</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Most Quoted Vehicles */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-8 relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              <h3 className="premium-label mb-10 relative z-10">Veículos em Alta</h3>
              <div className="space-y-2 relative z-10">
                {topVehicles.length > 0 ? topVehicles.map((v) => (
                  <div key={v.pos} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] transition-all border border-white/5 hover:border-blue-500/20 bg-black/20 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/10 ${v.pos === 1 ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-zinc-500'}`}>
                         {v.tipo === 'Moto' ? <Bike size={18} /> : v.tipo === 'Caminhão' ? <Truck size={18} /> : <Car size={18} />}
                      </div>
                      <div>
                        <p className="font-sans font-bold text-slate-200 text-sm truncate max-w-[140px] group-hover:text-white transition-colors">{v.name}</p>
                        <p className="font-sans text-[0.6rem] text-zinc-500 uppercase tracking-widest font-bold">Top {v.pos} • {v.tipo}</p>
                      </div>
                    </div>
                    <div className="relative z-10 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
                      <span className="font-mono text-xs text-blue-400 font-black">{v.conv} <span className="text-[10px]">cot.</span></span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-sm text-zinc-500 py-8">Nenhum veículo cotado.</div>
                )}
              </div>
            </motion.div>

            {/* Most Popular Plans */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="glass-card p-8 flex flex-col justify-between relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h3 className="premium-label mb-10">Planos Convertidos</h3>
                <div className="space-y-8">
                  {plansDist.length > 0 ? plansDist.map((plan) => (
                    <div key={plan.name} className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className={`font-sans text-[0.7rem] font-bold ${plan.textColor} uppercase tracking-widest`}>{plan.name}</span>
                        <span className="font-mono text-sm text-white font-bold">{plan.pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div className={`h-full rounded-full ${plan.color} relative overflow-hidden`} style={{ width: `${plan.pct}%`, boxShadow: `0 0 15px ${plan.color.replace('bg-', 'var(--tw-shadow-')})` }}>
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30" />
                        </div>
                      </div>
                    </div>
                  )) : (
                     <div className="text-center text-sm text-zinc-500 py-8">Nenhuma conversão ainda.</div>
                  )}
                </div>
              </div>
              {plansDist.length > 0 && (
                <div className="mt-12 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="font-sans text-[0.65rem] text-slate-400 leading-relaxed text-center italic">
                    O plano "{plansDist[0].name}" representa {plansDist[0].pct}% das suas conversões totais.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Categories */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="glass-card p-8 relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)` }}>
              <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              <h3 className="premium-label mb-10 relative z-10">Segmentação Geral</h3>
              <div className="flex flex-col space-y-6 relative z-10">
                {segments.map(({ id, Icon, name, pct, avg, color }) => (
                  <div key={id} className="flex items-center space-x-5 p-4 rounded-2xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${color.split(' ')[0]} border ${color.split(' ')[1]} ${color.split(' ')[2]}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-sans text-[0.75rem] font-bold text-slate-200 uppercase tracking-wide">{name}</span>
                        <span className="font-mono text-sm text-white font-bold">{pct}</span>
                      </div>
                      <p className="font-mono text-[0.6rem] text-slate-600 uppercase tracking-tighter">Média: {formatCurrency(avg)}</p>
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
