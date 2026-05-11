import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit3, Trash2, CheckCircle, X, Save, AlertCircle, Loader2, Search, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Consultant = {
  id: string;
  association_id: string;
  nome: string;
  whatsapp: string;
  email: string;
  senha?: string;
  ativo: boolean;
  created_at: string;
};

const ConsultantsManager = () => {
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConsultant, setEditingConsultant] = useState<Partial<Consultant> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Busca ID da associação
  useEffect(() => {
    const init = async () => {
      const defaultSlug = import.meta.env.VITE_DEFAULT_ASSOCIATION_SLUG || 'protemax';
      const { data: assoc } = await supabase.from('associations').select('id').eq('slug', defaultSlug).single();
      if (assoc) setAssociationId(assoc.id);
    };
    init();
  }, []);

  // Fetch Consultores
  useEffect(() => {
    if (associationId) {
      fetchConsultants();
    }
  }, [associationId]);

  const fetchConsultants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('consultants')
      .select('*')
      .eq('association_id', associationId)
      .order('created_at', { ascending: false });
    
    if (data) setConsultants(data as Consultant[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditingConsultant({
      nome: '',
      whatsapp: '',
      email: '',
      senha: '',
      ativo: true
    });
    setError('');
  };

  const handleSave = async () => {
    if (!associationId || !editingConsultant || !editingConsultant.nome?.trim()) {
      setError('O nome é obrigatório.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      association_id: associationId,
      nome: editingConsultant.nome.trim(),
      whatsapp: editingConsultant.whatsapp?.trim() || null,
      email: editingConsultant.email?.trim() || null,
      senha: editingConsultant.senha?.trim() || null,
      ativo: editingConsultant.ativo ?? true
    };

    let err;
    if (editingConsultant.id) {
      ({ error: err } = await supabase.from('consultants').update(payload).eq('id', editingConsultant.id));
    } else {
      ({ error: err } = await supabase.from('consultants').insert(payload));
    }

    if (err) {
      setError(err.message);
    } else {
      setEditingConsultant(null);
      await fetchConsultants();
    }
    setSaving(false);
  };

  const toggleActive = async (consultant: Consultant) => {
    await supabase.from('consultants').update({ ativo: !consultant.ativo }).eq('id', consultant.id);
    await fetchConsultants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este consultor? O histórico de vendas pode ser afetado.')) return;
    await supabase.from('consultants').delete().eq('id', id);
    await fetchConsultants();
  };

  const filteredConsultants = consultants.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 md:space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h1 className="premium-title text-2xl md:text-4xl uppercase tracking-tighter mb-1">Gestão de Equipe</h1>
          <p className="text-slate-400 text-sm">Cadastre consultores e controle o acesso deles à plataforma.</p>
        </div>
        <button onClick={openNew} className="premium-button flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-center">
          <Plus size={18} />
          <span>+ Novo Consultor</span>
        </button>
      </div>

      {/* FILTER TRAY */}
      <div className="glass-card p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border border-white/5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-white/30 transition-all font-medium"
          />
        </div>
        <div className="text-sm text-zinc-500 font-medium">
          Total: <span className="text-white">{filteredConsultants.length}</span>
        </div>
      </div>

      {/* LIST/TABLE */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[480px]">
          <thead>
            <tr>
              <th className="p-3 border-b border-white/5 bg-white/5 text-xs font-black text-zinc-500 uppercase tracking-widest">Consultor</th>
              <th className="p-3 border-b border-white/5 bg-white/5 text-xs font-black text-zinc-500 uppercase tracking-widest hidden md:table-cell">Contato</th>
              <th className="p-3 border-b border-white/5 bg-white/5 text-xs font-black text-zinc-500 uppercase tracking-widest">Status</th>
              <th className="p-3 border-b border-white/5 bg-white/5 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <Loader2 size={32} className="animate-spin text-zinc-400 mx-auto" />
                </td>
              </tr>
            ) : filteredConsultants.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <Users size={40} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-white font-bold">Nenhum consultor encontrado</p>
                  <p className="text-zinc-500 text-sm">Cadastre sua equipe para que eles gerem cotações.</p>
                </td>
              </tr>
            ) : (
              filteredConsultants.map((consultant) => (
                <tr key={consultant.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 group">
                  <td className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border uppercase font-black text-xs
                        ${consultant.ativo ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-zinc-500'}`}>
                        {consultant.nome.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-sm truncate">{consultant.nome}</span>
                        <span className="text-xs text-zinc-500">{new Date(consultant.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-300">{consultant.whatsapp || '—'}</span>
                      <span className="text-xs text-zinc-500 font-mono">{consultant.email || '—'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {consultant.ativo ? (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span>Ativo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg border border-zinc-700/50 bg-white/5 text-xs font-bold text-zinc-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                        <span>Inativo</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end items-center space-x-1">
                      <button 
                        onClick={() => toggleActive(consultant)}
                        className={`p-1.5 rounded-lg transition-all ${
                          consultant.ativo
                            ? 'text-zinc-500 hover:bg-red-500/10 hover:text-red-400'
                            : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        }`}
                        title={consultant.ativo ? 'Bloquear' : 'Liberar'}
                      >
                        <CheckCircle size={15} />
                      </button>
                      <button 
                        onClick={() => setEditingConsultant(consultant)}
                        className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(consultant.id)}
                        className="p-1.5 text-red-500/50 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* ─── Modal Novo/Editar Consultor ──────────────────────────────────────── */}
      <AnimatePresence>
        {editingConsultant && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-2xl w-full max-w-lg flex flex-col overflow-hidden relative">
              <div className="absolute top-0 w-full h-px bg-white/20"></div>

              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-white">{editingConsultant.id ? 'Editar Consultor' : 'Novo Consultor'}</h3>
                <button onClick={() => setEditingConsultant(null)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full hover:bg-red-500/20 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {error && (
                  <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome Completo *</label>
                  <input type="text" value={editingConsultant.nome}
                    onChange={e => setEditingConsultant({ ...editingConsultant, nome: e.target.value })}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Login / E-mail</label>
                  <input type="email" value={editingConsultant.email || ''}
                    onChange={e => setEditingConsultant({ ...editingConsultant, email: e.target.value })}
                    placeholder="E-mail de acesso ao CRM"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                  <p className="text-xs text-zinc-600 mt-1">Este e-mail será usado para o consultor logar na plataforma.</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">WhatsApp</label>
                  <input type="text" value={editingConsultant.whatsapp || ''}
                    onChange={e => setEditingConsultant({ ...editingConsultant, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Senha de Acesso</label>
                  <div className="flex space-x-2">
                    <input type="text" value={editingConsultant.senha || ''}
                      onChange={e => setEditingConsultant({ ...editingConsultant, senha: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setEditingConsultant({ ...editingConsultant, senha: Math.random().toString(36).slice(-8) })}
                      className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors flex items-center justify-center shrink-0"
                      title="Gerar Senha"
                    >
                      <Zap size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">Senha que o consultor usará para logar no portal.</p>
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked={editingConsultant.ativo}
                      onChange={e => setEditingConsultant({ ...editingConsultant, ativo: e.target.checked })}
                      className="hidden"
                    />
                    <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${editingConsultant.ativo ? 'bg-white/80' : 'bg-white/10'}`}>
                      <div className={`w-4 h-4 rounded-full transition-transform ${editingConsultant.ativo ? 'translate-x-6 bg-black' : 'bg-white/50'}`}></div>
                    </div>
                    <span className="text-sm font-bold text-white">Acesso Ativo</span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-2">
                    {editingConsultant.ativo ? 'Consultor poderá logar e gerar novas cotações.' : 'Acesso bloqueado. O consultor não poderá logar na plataforma.'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-black/30 flex justify-end space-x-3">
                <button onClick={() => setEditingConsultant(null)} className="px-5 py-3 text-zinc-400 font-bold hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="premium-button flex items-center space-x-2 disabled:opacity-50 min-w-[140px] justify-center">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? 'Salvando...' : 'Salvar Dados'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConsultantsManager;

