import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Edit3, CheckCircle,
  Loader2, ChevronDown, ChevronUp, AlertCircle, DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Catálogo de coberturas (mesma lista do PlansManager) ─────────────────────
const COVERAGE_CATALOG = [
  { key: 'roubo',              label: 'Roubo',                  hasParam: false },
  { key: 'furto',              label: 'Furto',                  hasParam: false },
  { key: 'colisao',            label: 'Colisão',                hasParam: false },
  { key: 'incendio',           label: 'Incêndio',               hasParam: false },
  { key: 'perca_total',        label: 'Perca Total',            hasParam: false },
  { key: 'fenomeno_natural',   label: 'Fenômeno da Natureza',   hasParam: false },
  { key: 'reboque_panes',      label: 'Reboque / Panes',        hasParam: true, unit: '', placeholder: '300KM (150KM ida e volta)' },
  { key: 'reboque_acidente',   label: 'Reboque / Acidentes',    hasParam: true, unit: '', placeholder: '500KM (250KM ida e volta)' },
  { key: 'carro_reserva',      label: 'Carro Reserva',          hasParam: true, unit: '', placeholder: 'Não tem' },
  { key: 'terceiros',          label: 'Terceiros',              hasParam: true, unit: '', placeholder: 'R$ 20.000,00' },
  { key: 'retorno_domicilio',  label: 'Retorno a Domicílio',    hasParam: true, unit: '', placeholder: 'Até 30KM' },
  { key: 'chaveiro_hospedagem',label: 'Chaveiro e Hospedagem',  hasParam: true, unit: '', placeholder: 'R$ 90,00' },
  { key: 'vidros_farois',      label: 'Vidros e Faróis',        hasParam: true, unit: '', placeholder: '50% (1x ao ano)' },
  { key: 'pequenos_reparos',   label: 'Pequenos Reparos',       hasParam: true, unit: '', placeholder: 'Não tem' },
  { key: 'acidente',           label: 'Acidente',               hasParam: false },
  { key: 'guincho_24h',        label: 'Guincho 24h',            hasParam: true, unit: '', placeholder: '300KM' },
  { key: 'rastreamento',       label: 'Rastreamento 24h',       hasParam: false },
  { key: 'protecao_carga',     label: 'Proteção de Carga',      hasParam: false },
  { key: 'capacete',           label: 'Indenização de Capacete',hasParam: false },
];

type Coverage = { key: string; label: string; param?: string };
type Tier = {
  id: string;
  nome: string;
  fipe_min: number;
  fipe_max: number;
  mensalidade: number | null;
  franquia_percentual: number | null;
  coberturas: Coverage[];
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const FipeTiersManager = ({ associationId, groupId }: { associationId: string; groupId: string }) => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  useEffect(() => {
    if (associationId && groupId) fetchTiers();
  }, [associationId, groupId]);

  const fetchTiers = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('association_id', associationId)
      .eq('group_id', groupId)
      .order('fipe_min');
    if (data) setTiers(data as Tier[]);
    if (err) setError(err.message);
    setLoading(false);
  };

  const openEdit = (tier: Tier) => {
    setEditingTier({
      ...tier,
      coberturas: Array.isArray(tier.coberturas) ? [...tier.coberturas] : [],
      mensalidade: tier.mensalidade ?? '',
      franquia_percentual: tier.franquia_percentual ?? '',
    } as any);
  };

  const handleSave = async () => {
    if (!editingTier) return;
    setSaving(true);
    setError('');
    try {
      const mensalidade = editingTier.mensalidade !== '' && editingTier.mensalidade !== null
        ? parseFloat(String(editingTier.mensalidade).replace(',', '.')) || null
        : null;
      const franquia_percentual = editingTier.franquia_percentual !== '' && editingTier.franquia_percentual !== null
        ? parseFloat(String(editingTier.franquia_percentual).replace(',', '.')) || null
        : null;
      const fipe_min = parseFloat(String((editingTier as any).fipe_min || '0').replace(',', '.')) || 0;
      const fipe_max = parseFloat(String((editingTier as any).fipe_max || '0').replace(',', '.')) || 0;

      // Gera o nome automaticamente a partir do intervalo
      const nomeFmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
      const nomeGerado = fipe_min <= 0
        ? `Até ${nomeFmt(fipe_max)}`
        : `${nomeFmt(fipe_min)} a ${nomeFmt(fipe_max)}`;

      const { error: err } = await supabase
        .from('vehicle_categories')
        .update({ mensalidade, franquia_percentual, coberturas: editingTier.coberturas, fipe_min, fipe_max, nome: nomeGerado })
        .eq('id', editingTier.id);

      if (err) { setError(err.message); }
      else { setEditingTier(null); await fetchTiers(); }
    } catch (e: any) {
      setError(e.message || 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  // ─── Coverage Helpers ──────────────────────────────────────────────────────
  const hasCoverage = (key: string) => editingTier?.coberturas?.some(c => c.key === key);

  const toggleCoverage = (item: typeof COVERAGE_CATALOG[0]) => {
    if (!editingTier) return;
    const has = hasCoverage(item.key);
    const updated = has
      ? editingTier.coberturas.filter(c => c.key !== item.key)
      : [...editingTier.coberturas, { key: item.key, label: item.label, param: item.hasParam ? item.placeholder : undefined }];
    setEditingTier({ ...editingTier, coberturas: updated });
  };

  const updateParam = (key: string, param: string) => {
    if (!editingTier) return;
    setEditingTier({ ...editingTier, coberturas: editingTier.coberturas.map(c => c.key === key ? { ...c, param } : c) });
  };

  const getCoverageDisplay = (cov: Coverage) => {
    const cat = COVERAGE_CATALOG.find(c => c.key === cov.key);
    if (cat?.hasParam && cov.param) return `${cov.label}: ${cov.param}`.trim();
    return cov.label;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-zinc-400 text-sm">
          Cada faixa FIPE define diretamente o preço, franquia e coberturas incluídas.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={36} className="animate-spin text-zinc-300" />
        </div>
      ) : tiers.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <DollarSign size={48} className="text-zinc-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Nenhuma faixa FIPE configurada</h3>
          <p className="text-zinc-500">Use a aba <strong className="text-white">Importação Mágica</strong> para criar as faixas deste grupo primeiro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <motion.div key={tier.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card transition-all">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/10 border border-indigo-500/20">
                    <DollarSign size={18} className="text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-base">{tier.nome}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {tier.mensalidade ? (
                        <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {formatCurrency(tier.mensalidade)}/mês
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Sem preço definido</span>
                      )}
                      {tier.franquia_percentual && (
                        <span className="text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                          Franquia: {tier.franquia_percentual}%
                        </span>
                      )}
                      <span className="text-xs text-zinc-600">{tier.coberturas?.length || 0} cobertura(s)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => setExpandedTier(expandedTier === tier.id ? null : tier.id)}
                    className="p-2 text-zinc-500 hover:text-white bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                    {expandedTier === tier.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => openEdit(tier)}
                    className="p-2 text-zinc-300 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>

              {/* Coberturas expandidas */}
              <AnimatePresence>
                {expandedTier === tier.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 px-5 pb-5 pt-4 overflow-hidden">
                    {!tier.coberturas || tier.coberturas.length === 0 ? (
                      <p className="text-zinc-600 text-sm">Nenhuma cobertura configurada. Clique em Editar para adicionar.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(tier.coberturas as Coverage[]).map((cov) => (
                          <span key={cov.key} className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-300 font-medium">
                            <CheckCircle size={13} className="text-indigo-300" />
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

      {/* ─── Modal Editor ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingTier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-950 border border-white/10 shadow-[0_0_60px_rgba(99,102,241,0.12)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>

              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-black text-white">Editar Faixa FIPE</h3>
                  <p className="text-sm text-indigo-300 font-medium">{editingTier.nome}</p>
                </div>
                <button onClick={() => setEditingTier(null)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full hover:bg-red-500/20 transition-all">
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

                {/* Intervalo FIPE ─ campo crítico para encaixe correto */}
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300 font-semibold">
                      Intervalo FIPE — define quais veículos se enquadram nesta faixa. Corrija se o valor máx estiver errado.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-amber-400 uppercase tracking-widest mb-2">FIPE Mín (R$)</label>
                      <input
                        type="number" inputMode="numeric"
                        value={(editingTier as any).fipe_min ?? ''}
                        onChange={e => setEditingTier({ ...editingTier, fipe_min: Number(e.target.value) } as any)}
                        placeholder="Ex: 7000"
                        className="w-full bg-black/60 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400 transition-colors text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-amber-400 uppercase tracking-widest mb-2">FIPE Máx (R$)</label>
                      <input
                        type="number" inputMode="numeric"
                        value={(editingTier as any).fipe_max ?? ''}
                        onChange={e => setEditingTier({ ...editingTier, fipe_max: Number(e.target.value) } as any)}
                        placeholder="Ex: 15000"
                        className="w-full bg-black/60 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400 transition-colors text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Preço e Franquia */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div>
                    <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Mensalidade (R$)</label>
                    <input
                      type="text" inputMode="decimal"
                      value={(editingTier as any).mensalidade ?? ''}
                      onChange={e => setEditingTier({ ...editingTier, mensalidade: e.target.value } as any)}
                      placeholder="Ex: 89,90"
                      className="w-full bg-black/60 border border-indigo-500/30 rounded-xl px-4 py-3 text-white font-mono font-bold focus:outline-none focus:border-indigo-400 transition-colors text-lg text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-rose-400 uppercase tracking-widest mb-2">Franquia (%)</label>
                    <p className="text-[10px] text-zinc-600 mb-1">Propagada para todas as linhas desta faixa na Matriz.</p>
                    <input
                      type="text" inputMode="decimal"
                      value={(editingTier as any).franquia_percentual ?? ''}
                      onChange={e => setEditingTier({ ...editingTier, franquia_percentual: e.target.value } as any)}
                      placeholder="Ex: 4"
                      className="w-full bg-black/60 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-400 transition-colors text-lg text-center"
                    />
                  </div>
                </div>

                {/* Coberturas */}
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Coberturas Incluídas</label>
                  <div className="space-y-2">
                    {COVERAGE_CATALOG.map((item) => {
                      const active = hasCoverage(item.key);
                      const covData = editingTier.coberturas.find(c => c.key === item.key);
                      return (
                        <div key={item.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/15'}`}>
                          <button onClick={() => toggleCoverage(item)} className="flex items-center space-x-3 flex-1 text-left">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${active ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                              {active && <CheckCircle size={12} className="text-white" />}
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
                <span className="text-zinc-500 text-sm">{editingTier.coberturas.length} cobertura(s) selecionada(s)</span>
                <button onClick={handleSave} disabled={saving} className="premium-button flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? 'Salvando...' : 'Salvar Faixa'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FipeTiersManager;
