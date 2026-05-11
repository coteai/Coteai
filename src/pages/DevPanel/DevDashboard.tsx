import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, FileText, TrendingUp, Loader2, Plus, Activity, Globe, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const DEV_ACCENT = '#6366f1';

const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val || 0);

const KpiCard = ({ title, value, sub, icon: Icon, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="p-6 rounded-2xl flex flex-col relative overflow-hidden border"
    style={{ background: 'rgba(10,10,30,0.8)', borderColor: `${DEV_ACCENT}20` }}
  >
    <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-[60px] pointer-events-none" style={{ backgroundColor: `${DEV_ACCENT}15` }} />
    <div className="flex items-center justify-between mb-6 relative z-10">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="p-2 rounded-lg border" style={{ backgroundColor: `${DEV_ACCENT}12`, borderColor: `${DEV_ACCENT}35`, color: DEV_ACCENT }}>
        <Icon size={16} />
      </div>
    </div>
    <h3 className="text-3xl font-black text-white mb-1 relative z-10">{value}</h3>
    <p className="text-xs text-slate-500 relative z-10">{sub}</p>
  </motion.div>
);

const DevDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ associations: 0, consultants: 0, quotes: 0, converted: 0 });
  const [recentAssociations, setRecentAssociations] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assocsRes, consultantsRes, quotesRes, recentRes] = await Promise.all([
        supabase.from('associations').select('id', { count: 'exact', head: true }),
        supabase.from('consultants').select('id', { count: 'exact', head: true }),
        supabase.from('quotes').select('id, status', { count: 'exact' }),
        supabase.from('associations').select('id, nome, slug, status, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const quotesData = quotesRes.data || [];
      setStats({
        associations: assocsRes.count || 0,
        consultants: consultantsRes.count || 0,
        quotes: quotesRes.count || 0,
        converted: quotesData.filter(q => q.status === 'converted').length,
      });
      setRecentAssociations(recentRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="animate-spin w-10 h-10" style={{ color: DEV_ACCENT }} />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] mb-2" style={{ color: `${DEV_ACCENT}90` }}>Cote AI — Master Console</p>
        <h1 className="text-4xl font-black text-white uppercase tracking-tight">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">Monitoramento global da plataforma.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Associações" value={formatNumber(stats.associations)} sub="Clientes ativos" icon={Building2} delay={0.1} />
        <KpiCard title="Consultores" value={formatNumber(stats.consultants)} sub="Em toda a plataforma" icon={Users} delay={0.2} />
        <KpiCard title="Cotações Totais" value={formatNumber(stats.quotes)} sub="Geradas na plataforma" icon={FileText} delay={0.3} />
        <KpiCard title="Convertidas" value={formatNumber(stats.converted)} sub="Vendas confirmadas" icon={TrendingUp} delay={0.4} />
      </div>

      {/* Recent Associations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-8 border"
        style={{ background: 'rgba(10,10,30,0.8)', borderColor: `${DEV_ACCENT}20` }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Activity size={18} style={{ color: DEV_ACCENT }} />
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Associações Recentes</h3>
          </div>
          <button
            onClick={() => navigate('/dev/associations')}
            className="text-xs font-black uppercase tracking-widest flex items-center space-x-1 transition-all hover:opacity-70"
            style={{ color: DEV_ACCENT }}
          >
            <span>Ver todas</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {recentAssociations.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">Nenhuma associação cadastrada ainda.</p>
          ) : recentAssociations.map((a, i) => (
            <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
              onClick={() => navigate('/dev/associations')}
            >
              <div className="flex items-center space-x-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border" style={{ backgroundColor: `${DEV_ACCENT}15`, borderColor: `${DEV_ACCENT}30`, color: DEV_ACCENT }}>
                  {a.nome?.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{a.nome}</p>
                  <p className="text-xs text-slate-600">slug: {a.slug}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${a.status === 'active' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                  {a.status === 'active' ? 'Ativo' : 'Suspenso'}
                </span>
                <Globe size={14} className="text-slate-600" />
              </div>
            </div>
          ))}
        </div>

        {/* CTA to create new */}
        <button
          onClick={() => navigate('/dev/associations')}
          className="mt-6 w-full py-3 rounded-xl border border-dashed text-sm font-bold transition-all hover:border-solid flex items-center justify-center space-x-2"
          style={{ borderColor: `${DEV_ACCENT}30`, color: `${DEV_ACCENT}80` }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${DEV_ACCENT}08`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
        >
          <Plus size={16} />
          <span>Nova Associação</span>
        </button>
      </motion.div>
    </div>
  );
};

export default DevDashboard;
