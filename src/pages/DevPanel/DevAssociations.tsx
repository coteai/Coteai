import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Loader2, Search, Users, FileText, Settings,
  X, CheckCircle2, AlertTriangle, Edit3, Trash2, Power, Globe, Database
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { seedDemoData } from '../../utils/seedDemoData';

const DEV_ACCENT = '#6366f1';

const THEMES_OPTIONS = [
  { id: 'blue', name: 'Azul', hex: '#3B82F6' },
  { id: 'violet', name: 'Violeta', hex: '#8B5CF6' },
  { id: 'emerald', name: 'Esmeralda', hex: '#10B981' },
  { id: 'rose', name: 'Rosa', hex: '#F43F5E' },
  { id: 'amber', name: 'Ã‚mbar', hex: '#F59E0B' },
  { id: 'cyan', name: 'Ciano', hex: '#06B6D4' },
];

interface Association {
  id: string;
  nome: string;
  slug: string;
  nome_fantasia?: string;
  nome_proposta?: string;
  whatsapp_suporte?: string;
  admin_email?: string;
  admin_senha?: string;
  tema_cor?: string;
  status: string;
  created_at: string;
}

const emptyForm = {
  nome: '',
  slug: '',
  nome_fantasia: '',
  nome_proposta: '',
  whatsapp_suporte: '',
  admin_email: '',
  admin_senha: '',
  tema_cor: 'blue',
  status: 'active',
};

const DevAssociations = () => {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Association | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [consultantCounts, setConsultantCounts] = useState<Record<string, number>>({});
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});
  const [seedingId, setSeedingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: assocs } = await supabase.from('associations').select('*').order('created_at', { ascending: false });
      const { data: consultants } = await supabase.from('consultants').select('id, association_id');
      const { data: quotes } = await supabase.from('quotes').select('id, association_id');

      setAssociations(assocs || []);

      const cc: Record<string, number> = {};
      (consultants || []).forEach(c => { cc[c.association_id] = (cc[c.association_id] || 0) + 1; });
      setConsultantCounts(cc);

      const qc: Record<string, number> = {};
      (quotes || []).forEach(q => { qc[q.association_id] = (qc[q.association_id] || 0) + 1; });
      setQuoteCounts(qc);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (a: Association) => {
    setEditTarget(a);
    setForm({
      nome: a.nome,
      slug: a.slug,
      nome_fantasia: a.nome_fantasia || '',
      nome_proposta: a.nome_proposta || '',
      whatsapp_suporte: a.whatsapp_suporte || '',
      admin_email: a.admin_email || '',
      admin_senha: a.admin_senha || '',
      tema_cor: a.tema_cor || 'blue',
      status: a.status,
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      if (editTarget) {
        const { error } = await supabase.from('associations').update({ ...form }).eq('id', editTarget.id);
        if (error) throw error;
        setSuccessMsg('AssociaÃ§Ã£o atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('associations').insert([{ ...form }]);
        if (error) throw error;
        setSuccessMsg('AssociaÃ§Ã£o criada com sucesso!');
      }
      setShowModal(false);
      await fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

    const handleSeed = async (associationId: string, nome: string) => {
    if (!confirm(`Deseja preencher dados de demonstração (planos genéricos) para ${nome}? Isso apagará os planos e preços existentes nesta associação.`)) return;
    
    setSeedingId(associationId);
    try {
      const res = await seedDemoData(associationId);
      if (res.success) {
        alert('Dados genéricos inseridos com sucesso!');
        await fetchData();
      } else {
        alert('Erro ao popular dados: ' + res.error);
      }
    } catch (e: any) {
      alert('Erro inesperado: ' + e.message);
    } finally {
      setSeedingId(null);
    }
  };

  const toggleStatus = async (a: Association) => {
    const newStatus = a.status === 'active' ? 'suspended' : 'active';
    await supabase.from('associations').update({ status: newStatus }).eq('id', a.id);
    await fetchData();
  };

  const filtered = associations.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.slug.toLowerCase().includes(search.toLowerCase())
  );

  const themeColor = (id: string) => THEMES_OPTIONS.find(t => t.id === id)?.hex || DEV_ACCENT;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] mb-2" style={{ color: `${DEV_ACCENT}90` }}>GestÃ£o de Clientes</p>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">AssociaÃ§Ãµes</h1>
          <p className="text-slate-500 text-sm mt-1">{associations.length} cliente(s) cadastrado(s) na plataforma.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95 border"
          style={{ backgroundColor: DEV_ACCENT, borderColor: `${DEV_ACCENT}60`, boxShadow: `0 0 20px ${DEV_ACCENT}30` }}
        >
          <Plus size={16} />
          <span>Nova AssociaÃ§Ã£o</span>
        </button>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center space-x-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-5 py-3 text-sm font-bold">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou slug..."
          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-700 focus:outline-none transition-all text-sm max-w-sm"
          onFocus={(e) => e.target.style.borderColor = `${DEV_ACCENT}50`}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin w-8 h-8" style={{ color: DEV_ACCENT }} />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: `${DEV_ACCENT}18`, background: 'rgba(10,10,30,0.8)' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Building2 size={40} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold">Nenhuma associaÃ§Ã£o encontrada.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: `${DEV_ACCENT}12` }}>
                  {['AssociaÃ§Ã£o', 'Slug', 'Tema', 'Consultores', 'CotaÃ§Ãµes', 'Status', 'AÃ§Ãµes'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: `${DEV_ACCENT}08` }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border" style={{ backgroundColor: `${themeColor(a.tema_cor || 'blue')}15`, borderColor: `${themeColor(a.tema_cor || 'blue')}30`, color: themeColor(a.tema_cor || 'blue') }}>
                          {a.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{a.nome}</p>
                          {a.admin_email && <p className="text-xs text-slate-600">{a.admin_email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-sm font-mono">{a.slug}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColor(a.tema_cor || 'blue') }} />
                        <span className="text-xs text-slate-500 capitalize">{a.tema_cor || 'blue'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1 text-slate-400 text-sm">
                        <Users size={13} />
                        <span>{consultantCounts[a.id] || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1 text-slate-400 text-sm">
                        <FileText size={13} />
                        <span>{quoteCounts[a.id] || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${a.status === 'active' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>
                        {a.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleSeed(a.id, a.nome)} className={`p-1.5 rounded-lg transition-all text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10`} title="Popular Dados Demo">
                          {seedingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                        </button>
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all" title="Editar">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => toggleStatus(a)} className={`p-1.5 rounded-lg transition-all ${a.status === 'active' ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`} title={a.status === 'active' ? 'Suspender' : 'Reativar'}>
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-3xl overflow-hidden border max-h-[90vh] overflow-y-auto"
              style={{ background: '#0A0A1E', borderColor: `${DEV_ACCENT}30` }}
            >
              <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${DEV_ACCENT}70, transparent)` }} />
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-white">{editTarget ? 'Editar AssociaÃ§Ã£o' : 'Nova AssociaÃ§Ã£o'}</h2>
                  <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                    <X size={20} />
                  </button>
                </div>

                {errorMsg && (
                  <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
                    <AlertTriangle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { label: 'Nome Oficial *', key: 'nome', placeholder: 'Ex: Vipcar Brasil', required: true },
                      { label: 'Slug (URL) *', key: 'slug', placeholder: 'Ex: vipcar', required: true },
                      { label: 'Nome Fantasia', key: 'nome_fantasia', placeholder: 'Ex: VIPCAR' },
                      { label: 'Nome na Proposta PDF', key: 'nome_proposta', placeholder: 'Ex: Vipcar Brasil' },
                      { label: 'WhatsApp Suporte', key: 'whatsapp_suporte', placeholder: 'Ex: 5511999999999' },
                      { label: 'E-mail do Admin', key: 'admin_email', placeholder: 'admin@empresa.com' },
                      { label: 'Senha do Admin', key: 'admin_senha', placeholder: 'Senha de acesso' },
                    ].map(({ label, key, placeholder, required }) => (
                      <div key={key} className={key === 'nome' || key === 'slug' ? '' : ''}>
                        <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">{label}</label>
                        <input
                          type={key === 'admin_senha' ? 'password' : 'text'}
                          value={(form as any)[key]}
                          onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          required={required}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-700 focus:outline-none text-sm transition-all"
                          onFocus={(e) => e.target.style.borderColor = `${DEV_ACCENT}50`}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Theme picker */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 mb-3">Tema de Cor</label>
                    <div className="flex flex-wrap gap-3">
                      {THEMES_OPTIONS.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, tema_cor: t.id }))}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm"
                          style={{
                            borderColor: form.tema_cor === t.id ? t.hex : 'rgba(255,255,255,0.1)',
                            backgroundColor: form.tema_cor === t.id ? `${t.hex}15` : 'transparent',
                            color: form.tema_cor === t.id ? t.hex : 'rgba(148,163,184,0.7)',
                          }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.hex }} />
                          <span className="font-semibold">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors border border-white/10 hover:border-white/20">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl text-sm font-black text-white flex items-center space-x-2 border transition-all"
                      style={{ backgroundColor: DEV_ACCENT, borderColor: `${DEV_ACCENT}60`, opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      <span>{editTarget ? 'Salvar AlteraÃ§Ãµes' : 'Criar AssociaÃ§Ã£o'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevAssociations;


