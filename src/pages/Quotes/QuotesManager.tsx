import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, Clock, FileText, User, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAssociation } from '../../contexts/AssociationContext';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const QuotesManager = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { associationData } = useAssociation();
  const associationId = associationData?.id;

  useEffect(() => {
    if (associationId) {
      fetchQuotes(associationId);
    }
  }, [associationId]);

  const fetchQuotes = async (assocId) => {
    setLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('*, consultants(nome)')
      .eq('association_id', assocId)
      .order('created_at', { ascending: false });
    if (data) setQuotes(data);
    setLoading(false);
  };

  const handleConvert = async (id) => {
    await supabase
      .from('quotes')
      .update({ status: 'converted', converted_at: new Date().toISOString(), converted_by: 'Backoffice' })
      .eq('id', id);
    if (associationId) await fetchQuotes(associationId);
  };

  const filtered = quotes.filter(q =>
    !search ||
    q.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
    q.placa?.toLowerCase().includes(search.toLowerCase()) ||
    q.consultants?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'converted': return (
        <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30 whitespace-nowrap">
          <CheckCircle2 size={10} className="mr-1" /> Convertida
        </span>
      );
      case 'rejected': return (
        <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/30 whitespace-nowrap">
          <XCircle size={10} className="mr-1" /> Perdida
        </span>
      );
      default: return (
        <span className="inline-flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30 whitespace-nowrap">
          <Clock size={10} className="mr-1" /> Pendente
        </span>
      );
    }
  };

  return (
    <div className="space-y-5 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h1 className="premium-title text-2xl md:text-4xl uppercase tracking-tighter mb-1">Central de Negócios</h1>
          <p className="text-slate-400 text-sm">Gerencie as cotações e aprove contratos.</p>
        </div>
        <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full sm:w-56 pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none text-sm font-medium transition-colors"
            />
          </div>
          <button
            onClick={() => associationId && fetchQuotes(associationId)}
            className="p-2 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all shrink-0"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={36} className="animate-spin text-zinc-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center text-zinc-500 font-medium">
          {quotes.length === 0 ? 'Nenhuma cotação gerada ainda. Use a Máquina de Cotação para criar a primeira!' : 'Nenhum resultado encontrado.'}
        </div>
      ) : (
        <>
          {/* ── Mobile: Cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map((quote, idx) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass-card p-4 flex flex-col gap-3 border ${
                  quote.status === 'pending' ? 'border-emerald-500/10' : 'border-white/5'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{quote.cliente_nome || '—'}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                      {quote.placa && <span className="mr-2 bg-white/5 px-1 rounded">{quote.placa}</span>}
                      {quote.modelo}
                    </p>
                  </div>
                  {getStatusBadge(quote.status)}
                </div>

                {/* Middle row */}
                <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-white/5 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-black text-[10px]">
                      {quote.consultants?.nome?.charAt(0) || '?'}
                    </div>
                    <span className="text-zinc-400 font-medium">{quote.consultants?.nome || '—'}</span>
                  </div>
                  <span className="font-mono">{new Date(quote.created_at).toLocaleDateString('pt-BR')}</span>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <div>
                    <p className="font-bold text-white text-sm">{quote.plano_selecionado || 'Cotação Multi-Plano'}</p>
                  </div>
                  {quote.status === 'pending' && (
                    <button
                      onClick={() => handleConvert(quote.id)}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 font-bold uppercase text-xs tracking-wider border border-emerald-500/40 rounded-xl transition-all hover:bg-emerald-500 hover:text-white active:scale-95"
                    >
                      ✓ Aprovar
                    </button>
                  )}
                  {quote.status === 'converted' && (
                    <span className="text-emerald-400 font-black text-xs uppercase tracking-wide">Finalizado</span>
                  )}
                  {quote.status === 'rejected' && (
                    <span className="text-red-500/60 font-bold text-xs uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-2 py-1 rounded-lg">Arquivado</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Desktop: Table ── */}
          <div className="hidden md:block glass-panel overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Cotação</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Cliente / Veículo</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Consultor</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Plano Sugerido</th>
                  <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Status / Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote, idx) => (
                  <motion.tr
                    key={quote.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`border-b border-white/5 group transition-colors ${
                      quote.status === 'pending' ? 'hover:bg-emerald-950/20' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-bold text-white flex items-center">
                        <FileText size={16} className="text-zinc-500 mr-2" />
                        #{quote.id.substring(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-zinc-500 font-medium mt-1">
                        {new Date(quote.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-300">{quote.cliente_nome || '—'}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        {quote.placa && <span className="mr-2">{quote.placa}</span>}
                        {quote.modelo}
                      </div>
                    </td>
                    <td className="p-4">
                      {quote.consultants ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-black text-xs">
                            {quote.consultants.nome.charAt(0)}
                          </div>
                          <span className="font-bold text-zinc-200 text-sm">{quote.consultants.nome}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-700 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white mb-2">
                        {quote.plano_selecionado || 'Cotação Multi-Plano'}
                      </div>
                      {getStatusBadge(quote.status)}
                    </td>
                    <td className="p-4 text-right">
                      {quote.status === 'pending' && (
                        <button
                          onClick={() => handleConvert(quote.id)}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 font-bold uppercase text-xs tracking-wider border border-emerald-500/40 rounded-xl transition-all hover:bg-emerald-500 hover:text-white hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.35)] active:scale-95"
                        >
                          ✓ Aprovar Contrato
                        </button>
                      )}
                      {quote.status === 'converted' && (
                        <div className="text-right">
                          <span className="text-emerald-400 font-black text-sm uppercase tracking-wide">Finalizado</span>
                          {quote.converted_at && <div className="text-xs text-zinc-600 mt-0.5">{new Date(quote.converted_at).toLocaleDateString('pt-BR')}</div>}
                        </div>
                      )}
                      {quote.status === 'rejected' && (
                        <span className="text-red-500/60 font-bold text-xs uppercase tracking-widest border border-red-500/20 bg-red-500/5 px-3 py-1.5 rounded-lg">Arquivado</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default QuotesManager;
