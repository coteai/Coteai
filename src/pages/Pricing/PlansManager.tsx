import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Save, Trash2, Edit3, CheckCircle,
  ShieldCheck, Loader2, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Catálogo de coberturas padrão do mercado ────────────────────────────────
const COVERAGE_CATALOG = [
  { key: 'roubo',           label: 'Roubo',                hasParam: false },
  { key: 'furto',           label: 'Furto',                hasParam: false },
  { key: 'colisao',         label: 'Colisão',              hasParam: false },
  { key: 'incendio',        label: 'Incêndio',             hasParam: false },
  { key: 'perca_total',     label: 'Perca Total',          hasParam: false },
  { key: 'fenomeno_natural',label: 'Fenômeno da Natureza', hasParam: false },
  { key: 'reboque_panes',   label: 'Reboque / Panes',      hasParam: true, unit: '', placeholder: '300KM (150KM ida e volta)' },
  { key: 'reboque_acidente',label: 'Reboque / Acidentes',  hasParam: true, unit: '', placeholder: '500KM (250KM ida e volta)' },
  { key: 'carro_reserva',   label: 'Carro Reserva',        hasParam: true, unit: '', placeholder: 'Não tem' },
  { key: 'terceiros',       label: 'Terceiros',            hasParam: true, unit: '', placeholder: 'R$ 20.000,00' },
  { key: 'retorno_domicilio',label: 'Retorno a Domicílio', hasParam: true, unit: '', placeholder: 'Até 30KM' },
  { key: 'chaveiro_hospedagem',label: 'Chaveiro e Hospedagem',hasParam: true, unit: '', placeholder: 'R$ 90,00' },
  { key: 'vidros_farois',   label: 'Vidros e Faróis',      hasParam: true, unit: '', placeholder: '50% (1x ao ano)' },
  { key: 'pequenos_reparos',label: 'Pequenos Reparos',     hasParam: true, unit: '', placeholder: 'Não tem' },
  // Coberturas específicas que já existiam (garantindo retrocompatibilidade p/ motos e caminhões)
  { key: 'acidente',        label: 'Acidente',             hasParam: false },
  { key: 'guincho_24h',     label: 'Guincho 24h',          hasParam: true, unit: '', placeholder: '300KM' },
  { key: 'rastreamento',    label: 'Rastreamento 24h',     hasParam: false },
  { key: 'protecao_carga',  label: 'Proteção de Carga',    hasParam: false },  // Caminhão
  { key: 'capacete',        label: 'Indenização de Capacete', hasParam: false }, // Moto
];

const vehicleLabels = { carro: '🚗 Carros', moto: '🏍️ Motos', caminhao: '🚛 Caminhões' };

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Coverage = { key: string; label: string; param?: string; custom?: boolean };
type Plan = {
  id?: string;
  association_id: string;
  tipo_veiculo: string;
  nome: string;
  descricao: string;
  coberturas: Coverage[];
  ativo: boolean;
  franquia_percentual?: number | string | null;
};

// ─── Componente Principal ────────────────────────────────────────────────────
const PlansManager = ({ associationId, groupId, baseType = 'carro' }: { associationId: string; groupId: string; baseType?: string }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (associationId && groupId) fetchPlans();
  }, [associationId, groupId]);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('plans')
      .select('*')
      .eq('association_id', associationId)
      .eq('group_id', groupId)
      .order('created_at');
    if (data) setPlans(data as Plan[]);
    if (err) setError(err.message);
    setLoading(false);
  };

  const openNew = () => {
    setEditingPlan({
      association_id: associationId,
      group_id: groupId,
      tipo_veiculo: baseType,
      nome: '',
      descricao: '',
      coberturas: [],
      ativo: true,
      franquia_percentual: '',
    });
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan({ ...plan, coberturas: Array.isArray(plan.coberturas) ? [...plan.coberturas] : [] });
  };

  const handleSave = async () => {
    try {
      if (!editingPlan || !(editingPlan.nome || '').trim()) return;
      setSaving(true);
      setError('');

      const franqVal = editingPlan.franquia_percentual;
      const franquia_percentual = franqVal !== '' && franqVal !== null && franqVal !== undefined
        ? parseFloat(String(franqVal).replace(',', '.')) || null
        : null;

      const payload = {
        association_id: editingPlan.association_id,
        group_id: groupId,
        tipo_veiculo: baseType || 'carro',
        nome: (editingPlan.nome || '').trim(),
        descricao: (editingPlan.descricao || '').trim(),
        coberturas: editingPlan.coberturas,
        ativo: editingPlan.ativo,
        franquia_percentual,
      };

      let err;
      let planId = editingPlan.id;
      if (editingPlan.id) {
        ({ error: err } = await supabase.from('plans').update(payload).eq('id', editingPlan.id));
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('plans').insert(payload).select('id').single();
        err = insertErr;
        if (inserted) planId = inserted.id;
      }

      if (err) {
        console.error("Supabase Error:", err);
        setError(err.message);
      } else {
        // ── Propagar a franquia para TODAS as linhas da pricing_table deste plano ──
        if (planId && franquia_percentual !== null) {
          await supabase
            .from('pricing_table')
            .update({ franquia_percentual })
            .eq('plan_id', planId);
        }
        setEditingPlan(null);
        await fetchPlans();
      }
    } catch (e: any) {
      console.error("JS Error:", e);
      setError(e.message || "Erro desconhecido na aplicação");
      alert("Erro ao salvar: " + (e.message || "Verifique o console"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso removerá o plano e todos os preços vinculados.')) return;
    await supabase.from('plans').delete().eq('id', id);
    await fetchPlans();
  };

  const toggleActive = async (plan: Plan) => {
    await supabase.from('plans').update({ ativo: !plan.ativo }).eq('id', plan.id!);
    await fetchPlans();
  };

  // ─── Coverage Editor Helpers ─────────────────────────────────────────────
  const hasCoverage = (key: string) => editingPlan?.coberturas.some(c => c.key === key);

  const toggleCoverage = (catalogItem: typeof COVERAGE_CATALOG[0]) => {
    if (!editingPlan) return;
    const has = hasCoverage(catalogItem.key);
    const updated = has
      ? editingPlan.coberturas.filter(c => c.key !== catalogItem.key)
      : [...editingPlan.coberturas, { key: catalogItem.key, label: catalogItem.label, param: catalogItem.hasParam ? catalogItem.placeholder : undefined }];
    setEditingPlan({ ...editingPlan, coberturas: updated });
  };

  const updateParam = (key: string, param: string) => {
    if (!editingPlan) return;
    const updated = editingPlan.coberturas.map(c => c.key === key ? { ...c, param } : c);
    setEditingPlan({ ...editingPlan, coberturas: updated });
  };

  const getCoverageDisplay = (cov: Coverage) => {
    const cat = COVERAGE_CATALOG.find(c => c.key === cov.key);
    if (cat?.hasParam && cov.param) return `${cov.label}: ${cov.param} ${cat.unit}`.trim();
    return cov.label;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-zinc-400 text-sm">
            Planos configurados para o grupo selecionado. Cada plano pode ter coberturas exclusivas.
          </p>
        </div>
        <button onClick={openNew} className="premium-button flex items-center space-x-2 shrink-0">
          <Plus size={18} /> <span>Novo Plano</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={36} className="animate-spin text-zinc-300" />
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <ShieldCheck size={48} className="text-zinc-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Nenhum plano criado</h3>
          <p className="text-zinc-500 mb-6">Crie os planos desta categoria para que apareçam na Importação e no Gerador de Cotações.</p>
          <button onClick={openNew} className="premium-button flex items-center space-x-2 mx-auto">
            <Plus size={18} /> <span>Criar Primeiro Plano</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`glass-card transition-all ${!plan.ativo ? 'opacity-50' : ''}`}
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${plan.ativo ? 'bg-white/500/20 border border-white/500/40' : 'bg-white/5 border border-white/10'}`}>
                    <ShieldCheck size={18} className={plan.ativo ? 'text-zinc-300' : 'text-zinc-600'} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-black text-base">{plan.nome}</h3>
                      {!plan.ativo && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold">INATIVO</span>}
                    </div>
                    <p className="text-sm text-zinc-500">{plan.descricao || 'Sem descrição'}</p>
                    <p className="text-xs text-zinc-600 mt-1">{plan.coberturas?.length || 0} cobertura(s)</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id!)}
                    className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                    {expandedPlan === plan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => toggleActive(plan)}
                    className={`p-2 rounded-lg transition-all ${plan.ativo ? 'text-zinc-300 bg-white/500/10 hover:bg-red-500/10 hover:text-red-400' : 'text-zinc-500 bg-white/5 hover:bg-white/500/10 hover:text-zinc-300'}`}
                    title={plan.ativo ? 'Desativar' : 'Ativar'}>
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => openEdit(plan)}
                    className="p-2 text-zinc-300 bg-white/500/10 rounded-lg hover:bg-white/500/20 transition-all">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(plan.id!)}
                    className="p-2 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Coberturas expandidas */}
              <AnimatePresence>
                {expandedPlan === plan.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 px-5 pb-5 pt-4 overflow-hidden">
                    {plan.coberturas?.length === 0 ? (
                      <p className="text-zinc-600 text-sm">Nenhuma cobertura configurada neste plano.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(plan.coberturas as Coverage[]).map((cov) => (
                          <span key={cov.key} className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-300 font-medium">
                            <CheckCircle size={13} className="text-zinc-300" />
                            <span>{getCoverageDisplay(cov)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Modal Editor ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-950 border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.1)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-indigo-500"></div>

              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-black text-white">{editingPlan.id ? 'Editar Plano' : 'Novo Plano'}</h3>
                  <p className="text-sm text-zinc-300 font-medium">Novo Plano</p>
                </div>
                <button onClick={() => setEditingPlan(null)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full hover:bg-red-500/20 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {error && (
                  <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
                  </div>
                )}

                {/* Nome, Descrição e Franquia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Plano *</label>
                    <input type="text" value={editingPlan.nome}
                      onChange={e => setEditingPlan({ ...editingPlan, nome: e.target.value })}
                      placeholder="Ex: Moto VIP, Básico, Ouro..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Descrição</label>
                    <input type="text" value={editingPlan.descricao}
                      onChange={e => setEditingPlan({ ...editingPlan, descricao: e.target.value })}
                      placeholder="Ex: Proteção completa com assistência"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>

                {/* Franquia */}
                <div className="flex items-end gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <div className="flex-1">
                    <label className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Franquia (%)</label>
                    <p className="text-xs text-zinc-500 mb-2">Ao salvar, este valor será aplicado automaticamente em <span className="text-zinc-300 font-bold">todas</span> as faixas de preço deste plano na Matriz.</p>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingPlan.franquia_percentual ?? ''}
                      onChange={e => setEditingPlan({ ...editingPlan, franquia_percentual: e.target.value })}
                      placeholder="Ex: 4 ou 8.5"
                      className="w-40 bg-black/60 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-400 transition-colors text-center text-lg"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-rose-300 font-black text-3xl">{editingPlan.franquia_percentual || '—'}<span className="text-lg text-rose-500">%</span></span>
                  </div>
                </div>

                {/* Coberturas */}
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Coberturas Incluídas</label>
                  <div className="space-y-2">
                    {COVERAGE_CATALOG.map((item) => {
                      const active = hasCoverage(item.key);
                      const covData = editingPlan.coberturas.find(c => c.key === item.key);
                      return (
                        <div key={item.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-white/500/5 border-white/500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/15'}`}>
                          <button onClick={() => toggleCoverage(item)} className="flex items-center space-x-3 flex-1 text-left">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${active ? 'bg-white/500 border-white/500' : 'border-white/20'}`}>
                              {active && <CheckCircle size={12} className="text-black" />}
                            </div>
                            <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-zinc-400'}`}>{item.label}</span>
                          </button>
                          {active && item.hasParam && (
                            <div className="flex items-center space-x-2 ml-4 shrink-0 w-1/2">
                              <input
                                type="text"
                                value={covData?.param || ''}
                                onChange={e => updateParam(item.key, e.target.value)}
                                placeholder={item.placeholder}
                                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-white/30 font-mono text-center"
                              />
                              {item.unit && <span className="text-zinc-500 text-xs font-bold uppercase">{item.unit}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-black/30 shrink-0 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-zinc-500 text-sm">{editingPlan.coberturas.length} cobertura(s) selecionada(s)</span>
                </div>
                <button onClick={handleSave} disabled={saving || !editingPlan.nome.trim()} className="premium-button flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? 'Salvando...' : 'Salvar Plano'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlansManager;


