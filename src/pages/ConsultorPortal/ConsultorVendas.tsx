import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Clock, FileText, Loader2, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useNavigate } from 'react-router-dom';
import { getThemeConfig } from '../../utils/themePresets';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const ConsultorVendas = () => {
  const { consultor } = useConsultorAuth();
  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'converted' | 'rejected'>('all');

  const fetchQuotes = async () => {
    if (!consultor) return;
    setLoading(true);

    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('consultant_id', consultor.id)
      .order('created_at', { ascending: false });

    if (data) setQuotes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [consultor]);

  const filtered = quotes.filter((q) => {
    const matchesSearch =
      !search ||
      q.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      q.placa?.toLowerCase().includes(search.toLowerCase()) ||
      q.modelo?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'converted':
        return (
          <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
            <CheckCircle2 size={12} className="mr-1.5" /> CONVERTIDA
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-500/30">
            <XCircle size={12} className="mr-1.5" /> PERDIDA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/30">
            <Clock size={12} className="mr-1.5" /> PENDENTE
          </span>
        );
    }
  };

  const tabs: { label: string; value: typeof filterStatus }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Pendentes', value: 'pending' },
    { label: 'Convertidas', value: 'converted' },
    { label: 'Perdidas', value: 'rejected' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="premium-label mb-2" style={{ color: accentHex }}>
            Meu Histórico
          </p>
          <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-1">
            Minhas Vendas
          </h1>
          <p className="text-slate-400 text-sm">
            Acompanhe o status de todas as suas cotações geradas.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchQuotes}
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

      {/* Filters */}
      <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center border border-white/5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, placa, modelo..."
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-white/30 transition-all font-medium"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center space-x-1 bg-black/40 rounded-lg p-1 border border-white/5">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterStatus(t.value)}
              className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all"
              style={
                filterStatus === t.value
                  ? {
                      backgroundColor: `${accentHex}18`,
                      color: accentHex,
                      border: `1px solid ${accentHex}40`,
                    }
                  : { color: '#71717a', border: '1px solid transparent' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="text-sm text-zinc-500 font-medium ml-auto">
          <span className="text-white font-bold">{filtered.length}</span> resultado{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Cotação</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Cliente / Veículo</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Plano Escolhido</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <FileText size={48} className="text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 font-bold text-lg mb-1">
                      {quotes.length === 0
                        ? 'Nenhuma cotação gerada ainda.'
                        : 'Nenhum resultado encontrado.'}
                    </p>
                    {quotes.length === 0 && (
                      <button
                        onClick={() => navigate('/consultor/cotacao')}
                        className="mt-4 text-sm font-bold uppercase tracking-wider"
                        style={{ color: accentHex }}
                      >
                        Gerar primeira cotação →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((quote, idx) => (
                  <motion.tr
                    key={quote.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-bold text-white flex items-center">
                        <FileText size={15} className="text-zinc-600 mr-2" />
                        #{quote.id.substring(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-zinc-600 font-medium mt-1">
                        {new Date(quote.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-200">{quote.cliente_nome || '—'}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        {quote.placa && <span className="mr-2">{quote.placa}</span>}
                        {quote.modelo}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white mb-0.5">
                        {quote.plano_selecionado || 'Opções Geradas'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {getStatusBadge(quote.status)}
                      {quote.status === 'converted' && quote.converted_at && (
                        <div className="text-xs text-zinc-700 mt-1">
                          {new Date(quote.converted_at).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ConsultorVendas;
