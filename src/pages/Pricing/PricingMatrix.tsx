import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Save, UploadCloud, CheckCircle, ArrowRight, Loader2, Car, Bike, Truck, ShieldCheck, AlertCircle, Plus, Trash2, RefreshCw, ChevronDown, FolderPlus, DollarSign, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAssociation } from '../../contexts/AssociationContext';
import PlansManager from './PlansManager';
import FipeTiersManager from './FipeTiersManager';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

const PricingPage = () => {
  const [activeTab, setActiveTab] = useState('import'); 
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({});
  const [editing, setEditing] = useState(null);
  const { associationData } = useAssociation();
  const associationId = associationData?.id;
  const [isLoading, setIsLoading] = useState(true);
  
  // Groups State
  const [vehicleGroups, setVehicleGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupState, setNewGroupState] = useState({ nome: '', base_type: 'carro', pricing_mode: 'plans' });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editGroupState, setEditGroupState] = useState<any>(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);

  // Computed helpers
  const activeGroup = vehicleGroups.find(g => g.id === activeGroupId);
  
  // States for Builder
  const [builderPlans, setBuilderPlans] = useState([{ name: 'Básico', franchise: '' }, { name: 'VIP', franchise: '' }]);
  const [builderSegments, setBuilderSegments] = useState([
    { min: 0, max: 100000, step: 5000 }
  ]);
  const [builderPrices, setBuilderPrices] = useState({});
  const [builderError, setBuilderError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load association and initial data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const defaultSlug = import.meta.env.VITE_DEFAULT_ASSOCIATION_SLUG || 'protemax';
      const { data: assoc } = await supabase.from('associations').select('id').eq('slug', defaultSlug).single();
      
      if (assoc) {
        setAssociationId(assoc.id);
        await fetchGroups(assoc.id);
      } else {
        console.error(`Associação com slug '${defaultSlug}' não encontrada no banco!`);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchGroups = async (assocId) => {
    const { data } = await supabase.from('vehicle_groups').select('*').eq('association_id', assocId).order('ordem');
    if (data && data.length > 0) {
      setVehicleGroups(data);
      if (!activeGroupId) setActiveGroupId(data[0].id);
    }
  };

  useEffect(() => {
    if (associationId && activeGroupId) {
      refreshData(associationId, activeGroupId);
    }
  }, [activeGroupId]);

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Tem certeza? Isso excluirá o grupo, TODAS as faixas FIPE, planos e preços atrelados a ele. Essa ação não pode ser desfeita.')) return;
    try {
      setIsLoading(true);
      // Tentativa de deletar filhos caso não haja ON DELETE CASCADE configurado
      await supabase.from('vehicle_categories').delete().eq('group_id', groupId);
      await supabase.from('plans').delete().eq('group_id', groupId);
      
      const { error } = await supabase.from('vehicle_groups').delete().eq('id', groupId);
      if (error) throw error;
      
      const newGroups = vehicleGroups.filter(g => g.id !== groupId);
      setVehicleGroups(newGroups);
      if (newGroups.length > 0) {
        setActiveGroupId(newGroups[0].id);
      } else {
        setActiveGroupId('');
        setCategories([]);
        setPlans([]);
        setData({});
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir grupo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async (assocId, groupId) => {
    const [plansRes, catsRes, pricesRes] = await Promise.all([
      supabase.from('plans').select('*').eq('association_id', assocId).eq('group_id', groupId),
      supabase.from('vehicle_categories').select('*').eq('association_id', assocId).eq('group_id', groupId).order('fipe_min'),
      supabase.from('pricing_table').select('*').eq('association_id', assocId)
    ]);

    if (plansRes.data) setPlans(plansRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    
    if (pricesRes.data) {
      const formattedData = {};
      pricesRes.data.forEach(p => {
        if (!formattedData[p.category_id]) formattedData[p.category_id] = {};
        formattedData[p.category_id][p.plan_id] = {
          id: p.id,
          price: p.mensalidade,
          franchise: p.franquia_percentual,
          max_coverage: p.cobertura_maxima
        };
      });
      setData(formattedData);
    }
  };

  const openEditor = (catId, planId) => {
    setEditing({ catId, planId, ...data[catId][planId] });
  };

  const handleSave = async () => {
    if (editing && associationId) {
      const { error } = await supabase
        .from('pricing_table')
        .upsert({
          id: editing.id,
          association_id: associationId,
          category_id: editing.catId,
          plan_id: editing.planId,
          mensalidade: Number(editing.price),
          franquia_percentual: Number(editing.franchise),
          cobertura_maxima: Number(editing.max_coverage)
        });

      if (!error) {
        await refreshData(associationId, activeGroupId);
        setEditing(null);
      }
    }
  };

  // --- BUILDER HELPERS ---

  // Generate FIPE rows from all builder segments
  const getBuilderRows = () => {
    const rows = [];
    // Sort segments by min to ensure correct ordering
    const sorted = [...builderSegments].sort((a, b) => a.min - b.min);
    
    for (const seg of sorted) {
      const step = Number(seg.step) || 5000;
      const min = Number(seg.min) || 0;
      const max = Number(seg.max);
      if (max <= min || step <= 0) continue;
      
      for (let from = min; from < max; from += step) {
        const to = Math.min(from + step - 1, max);
        const label = from === 0
          ? `Até ${formatCurrency(to)}`
          : `${formatCurrency(from + 1)} a ${formatCurrency(to)}`;
        rows.push({ label, fipe_min: from === 0 ? 0 : from + 1, fipe_max: to });
      }
    }
    return rows;
  };

  const addSegment = () => {
    // Suggest next segment starting where the last one ended
    const lastMax = builderSegments.length > 0
      ? Math.max(...builderSegments.map(s => Number(s.max)))
      : 0;
    setBuilderSegments(prev => [...prev, { min: lastMax, max: lastMax + 500000, step: 50000 }]);
    setBuilderPrices({});
    setBuilderFranchises({});
  };

  const removeSegment = (idx) => {
    if (builderSegments.length <= 1) return;
    setBuilderSegments(prev => prev.filter((_, i) => i !== idx));
    setBuilderPrices({});
    setBuilderFranchises({});
  };

  const updateSegment = (idx, field, value) => {
    setBuilderSegments(prev => prev.map((s, i) => i === idx ? { ...s, [field]: Number(value) } : s));
    setBuilderPrices({});
    setBuilderFranchises({});
  };

  const updatePlanName = (idx, name) => {
    setBuilderPlans(prev => prev.map((p, i) => i === idx ? { ...p, name } : p));
  };

  const updatePlanFranchise = (idx, franchise) => {
    setBuilderPlans(prev => prev.map((p, i) => i === idx ? { ...p, franchise } : p));
  };

  const addPlan = () => {
    setBuilderPlans(prev => [...prev, { name: `Plano ${prev.length + 1}`, franchise: '' }]);
  };

  const removePlan = (idx) => {
    if (builderPlans.length <= 1) return;
    setBuilderPlans(prev => prev.filter((_, i) => i !== idx));
  };

  const setPrice = (rowIdx, planIdx, value) => {
    setBuilderPrices(prev => ({
      ...prev,
      [`${rowIdx}_${planIdx}`]: value
    }));
  };

  const resetBuilder = () => {
    setBuilderPrices({});
    setBuilderPlans([{ name: 'Básico', franchise: '' }, { name: 'VIP', franchise: '' }]);
    setBuilderSegments([{ min: 0, max: 100000, step: 5000 }]);
    setBuilderError('');
  };

  const handleSaveEditGroup = async () => {
    if (!editGroupState) return;
    const { id, nome, base_type, pricing_mode } = editGroupState;
    const { error } = await supabase
      .from('vehicle_groups')
      .update({ nome, base_type, pricing_mode })
      .eq('id', id);
    if (!error) {
      setVehicleGroups(prev => prev.map(g => g.id === id ? { ...g, nome, base_type, pricing_mode } : g));
      setEditGroupState(null);
      // Se mudou para fipe_tiers, ir para a aba certa
      if (pricing_mode === 'fipe_tiers') setActiveTab('plans');
    }
  };

  const commitBuilder = async () => {
    if (!associationId) return;
    setBuilderError('');
    
    const rows = getBuilderRows();
    if (rows.length === 0) {
      setBuilderError('Configure um intervalo de faixas FIPE válido.');
      return;
    }
    
    // --- VALIDAÇÃO REMOVIDA PARA TESTES ---
    // O sistema agora permite salvar mesmo com campos vazios (eles serão salvos como 0)
    /*
    const missing = [];
    rows.forEach((_, rIdx) => {
      builderPlans.forEach((_, pIdx) => {
        const val = builderPrices[`${rIdx}_${pIdx}`];
        if (!val || isNaN(Number(String(val).replace(',', '.')))) {
          missing.push(`${rIdx}_${pIdx}`);
        }
      });
    });
    
    if (missing.length > 0) {
      setBuilderError(`Preencha todos os ${missing.length} campos de preço antes de salvar.`);
      return;
    }
    */

    setIsUploading(true);
    setUploadProgress(10);

    const activeGroup = vehicleGroups.find(g => g.id === activeGroupId);
    if(!activeGroup) return;

    // 1. Upsert plans
    const { data: existingPlans } = await supabase
      .from('plans').select('id, nome')
      .eq('association_id', associationId).eq('group_id', activeGroupId);

    const existingMap = {};
    (existingPlans || []).forEach(p => { existingMap[p.nome] = p.id; });

    const plansToCreate = builderPlans.filter(p => !existingMap[p.name])
      .map(p => ({ association_id: associationId, group_id: activeGroupId, tipo_veiculo: activeGroup.base_type, nome: p.name, descricao: '', coberturas: [], ativo: true }));

    if (plansToCreate.length > 0) {
      const { data: created } = await supabase.from('plans').insert(plansToCreate).select('id, nome');
      (created || []).forEach(p => { existingMap[p.nome] = p.id; });
    }
    setUploadProgress(30);

    // 2. Clear old categories (Watch out for RLS delete block or Foreign Key constraint)
    const { error: delErr } = await supabase.from('vehicle_categories').delete()
      .eq('association_id', associationId).eq('group_id', activeGroupId);
      
    if (delErr) {
      console.warn("Aviso: Falha ao deletar faixas antigas (possivelmente bloqueio por RLS ou Cotação atrelada):", delErr);
      // We proceed but inform the console. To actually delete, RLS and Constraints must be fixed.
    }
    setUploadProgress(50);

    // 3. Insert new categories
    const catInserts = rows.map((row, idx) => ({
      association_id: associationId, group_id: activeGroupId, tipo_veiculo: activeGroup.base_type,
      nome: row.label, fipe_min: row.fipe_min, fipe_max: row.fipe_max, ordem: idx + 1
    }));

    const { data: insertedCats, error: catErr } = await supabase
      .from('vehicle_categories').insert(catInserts).select();

    if (catErr || !insertedCats) {
      setBuilderError('Erro ao salvar faixas: ' + catErr?.message);
      setIsUploading(false);
      return;
    }
    setUploadProgress(75);

    // 4. Insert prices
    const priceInserts = [];
    insertedCats.forEach((cat) => {
      // Find original rowIdx using math (ordem - 1) because PostgreSQL return order is not guaranteed.
      const rowIdx = cat.ordem - 1;

      builderPlans.forEach((plan, planIdx) => {
        const planId = existingMap[plan.name];
        if (!planId) return;
        const rawVal = builderPrices[`${rowIdx}_${planIdx}`] || 0;
        const mensalidade = parseFloat(String(rawVal).replace(',', '.')) || 0;
        
        const franquia_percentual = plan.franchise !== '' && plan.franchise !== undefined
          ? parseFloat(String(plan.franchise).replace(',', '.')) || null
          : null;
        
        priceInserts.push({
          association_id: associationId, category_id: cat.id, plan_id: planId,
          mensalidade, franquia_percentual, cobertura_maxima: cat.fipe_max, ativo: true
        });
      });
    });

    const { error: priceErr } = await supabase.from('pricing_table').insert(priceInserts);
    setUploadProgress(100);
    await refreshData(associationId, activeGroupId);

    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      setActiveTab('matrix');
    }, 800);
  };

  return (
    <div className="space-y-8 relative">
      <div>
        <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-2">Tabela de Precificação</h1>
        <p className="text-slate-400">Gerencie valores cruzando o Plano e o Valor do Veículo.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${activeTab === 'import' ? 'bg-white/10/20 text-zinc-300 border border-white/10/50' : 'bg-transparent text-zinc-500 hover:text-white'}`}
          >
            <UploadCloud size={20} />
            <span className="font-bold">Importação Mágica</span>
          </button>
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${activeTab === 'matrix' ? 'bg-white/10/20 text-zinc-400 border border-white/10/50' : 'bg-transparent text-zinc-500 hover:text-white'}`}
          >
            <Settings2 size={20} />
            <span className="font-bold">Matriz Detalhada</span>
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${activeTab === 'plans' ? 'bg-white/10/20 text-zinc-300 border border-white/10/50' : 'bg-transparent text-zinc-500 hover:text-white'}`}
          >
            <ShieldCheck size={20} />
            <span className="font-bold">Planos</span>
          </button>
        </div>

        {/* Grupos de Veículo Selector */}
        <div className="flex items-center space-x-2">
          {vehicleGroups.length > 0 && (
            <div className="relative" ref={groupDropdownRef}>
              <button
                onClick={() => setGroupDropdownOpen(v => !v)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-bold hover:bg-white/5 transition-all"
              >
                {vehicleGroups.find(g => g.id === activeGroupId)?.base_type === 'moto'
                  ? <Bike size={16} className="text-zinc-300" />
                  : vehicleGroups.find(g => g.id === activeGroupId)?.base_type === 'caminhao'
                  ? <Truck size={16} className="text-zinc-300" />
                  : <Car size={16} className="text-zinc-300" />}
                <span>{vehicleGroups.find(g => g.id === activeGroupId)?.nome || 'Grupo...'}</span>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${groupDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {groupDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                  {vehicleGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setActiveGroupId(g.id); setGroupDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-white/5 transition-colors border-l-2 ${
                        activeGroupId === g.id ? 'bg-white/10 text-white font-bold border-white/30' : 'text-zinc-300 border-transparent'
                      }`}
                    >
                      {g.base_type === 'moto' ? <Bike size={16} /> : g.base_type === 'caminhao' ? <Truck size={16} /> : <Car size={16} />}
                      <span>{g.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <button onClick={() => setIsGroupModalOpen(true)} className="flex items-center justify-center p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-inner" title="Criar Novo Grupo Tarifário">
            <FolderPlus size={20} />
          </button>
          {activeGroupId && (
            <button
              onClick={() => {
                const g = vehicleGroups.find(g => g.id === activeGroupId);
                if (g) setEditGroupState({ id: g.id, nome: g.nome, base_type: g.base_type, pricing_mode: g.pricing_mode || 'plans' });
              }}
              className="flex items-center justify-center p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-inner"
              title="Editar Grupo Atual"
            >
              <Edit3 size={20} />
            </button>
          )}
          {activeGroupId && (
            <button onClick={() => handleDeleteGroup(activeGroupId)} className="flex items-center justify-center p-2.5 rounded-xl bg-white/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-white/5 shadow-inner" title="Excluir Grupo Atual">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Table Builder Tab */}
      {activeTab === 'import' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Error */}
          {builderError && (
            <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-5 py-4 font-medium">
              <AlertCircle size={20} className="shrink-0" />
              <span>{builderError}</span>
            </div>
          )}

          {/* Uploading overlay */}
          {isUploading && (
            <div className="w-full glass-card rounded-2xl p-12 flex flex-col items-center justify-center">
              {uploadProgress < 100 ? (
                <>
                  <Loader2 size={48} className="text-zinc-300 animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-white mb-4">Salvando no banco de dados...</h3>
                  <div className="w-64 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-gradient-to-r from-white to-zinc-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </>
              ) : (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/10/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={40} className="text-zinc-300" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Tabela Salva!</h3>
                  <p className="text-zinc-400 flex items-center mt-2 font-medium">Redirecionando <ArrowRight size={16} className="ml-2 animate-pulse" /></p>
                </motion.div>
              )}
            </div>
          )}

          {!isUploading && (
            <>
              {/* Config Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Plans */}
                <div className="glass-card p-5 rounded-2xl col-span-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Planos</h3>
                    <button onClick={addPlan} className="flex items-center space-x-1 text-xs text-zinc-300 font-bold hover:text-cyan-300 bg-cyan-400/10 px-2 py-1 rounded-lg transition-all">
                      <Plus size={12} /> <span>Adicionar</span>
                    </button>
                  </div>
                  {builderPlans.map((plan, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <input
                          value={plan.name}
                          onChange={(e) => updatePlanName(idx, e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-white/30/50 transition-all"
                          placeholder={`Plano ${idx + 1}`}
                        />
                        {builderPlans.length > 1 && (
                          <button onClick={() => removePlan(idx)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 pl-1">
                        <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Franquia %</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={plan.franchise}
                          onChange={(e) => updatePlanFranchise(idx, e.target.value)}
                          placeholder="Ex: 4"
                          className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-rose-300 text-xs font-mono font-bold focus:outline-none focus:border-rose-400/40 transition-all text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* FIPE Segments Config */}
                <div className="glass-card p-5 rounded-2xl col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Faixas FIPE</h3>
                    <button onClick={addSegment} className="flex items-center space-x-1 text-xs text-zinc-400 font-bold hover:text-indigo-300 bg-indigo-400/10 px-2 py-1 rounded-lg transition-all">
                      <Plus size={12} /> <span>+ Segmento</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest text-center">De (R$)</span>
                      <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest text-center">Até (R$)</span>
                      <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest text-center">Intervalo (R$)</span>
                    </div>
                    {builderSegments.map((seg, idx) => (
                      <div key={idx} className="flex items-center gap-2 group">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <input
                            type="number" value={seg.min}
                            onChange={(e) => updateSegment(idx, 'min', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-white/10/50 transition-all text-center"
                          />
                          <input
                            type="number" value={seg.max}
                            onChange={(e) => updateSegment(idx, 'max', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-white/10/50 transition-all text-center"
                          />
                          <input
                            type="number" value={seg.step}
                            onChange={(e) => updateSegment(idx, 'step', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-white/10/50 transition-all text-center"
                          />
                        </div>
                        {builderSegments.length > 1 && (
                          <button onClick={() => removeSegment(idx)} className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-zinc-600 font-medium pt-1 border-t border-white/5">
                    → Gerará <span className="text-zinc-300 font-bold">{getBuilderRows().length}</span> faixas no total
                    {getBuilderRows().length > 0 && (
                      <span className="text-zinc-500"> · cobrindo até <span className="text-zinc-400 font-bold">{formatCurrency(Math.max(...getBuilderRows().map(r => r.fipe_max)))}</span></span>
                    )}
                  </p>
                </div>
              </div>

              {/* Price Grid */}
              <div className="glass-panel overflow-x-auto rounded-2xl p-1">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="p-3 border-b border-r border-white/5 bg-white/5 text-zinc-500 uppercase tracking-widest text-xs font-black whitespace-nowrap min-w-[200px]">
                        Faixa FIPE
                      </th>
                      {builderPlans.map((plan, pIdx) => (
                        <th key={pIdx} className="p-3 border-b border-white/5 text-center text-cyan-300 font-bold uppercase tracking-wider text-xs min-w-[150px]">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getBuilderRows().map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 border-b border-r border-white/5 text-white font-semibold whitespace-nowrap text-sm">
                          {row.label}
                        </td>
                        {builderPlans.map((_, pIdx) => {
                          const val = builderPrices[`${rIdx}_${pIdx}`] ?? '';
                          const isFilled = val !== '' && !isNaN(parseFloat(String(val).replace(',', '.')));
                          return (
                            <td key={pIdx} className="p-2 border-b border-white/5">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={val}
                                onChange={(e) => setPrice(rIdx, pIdx, e.target.value)}
                                placeholder="0,00"
                                className={`w-full text-center bg-transparent border rounded-xl px-3 py-2 font-mono font-bold text-sm focus:outline-none transition-all
                                  ${isFilled 
                                    ? 'text-zinc-300 border-white/10/20 focus:border-emerald-400/50' 
                                    : 'text-zinc-500 border-white/10 focus:border-white/30/40 focus:text-white'
                                  }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={resetBuilder}
                  className="flex items-center space-x-2 text-sm text-zinc-500 hover:text-white font-bold px-5 py-3 bg-white/5 rounded-xl border border-white/10 transition-all"
                >
                  <RefreshCw size={16} />
                  <span>Resetar</span>
                </button>
                <button
                  onClick={commitBuilder}
                  className="premium-button flex-1 flex items-center justify-center space-x-3 text-lg py-4"
                >
                  <Save size={20} />
                  <span>Salvar Tabela no Banco de Dados</span>
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Plans Manager Tab */}
      {activeTab === 'plans' && associationId && activeGroupId && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {vehicleGroups.find(g => g.id === activeGroupId)?.pricing_mode === 'fipe_tiers' ? (
            <FipeTiersManager 
              associationId={associationId} 
              groupId={activeGroupId} 
            />
          ) : (
            <PlansManager 
              associationId={associationId} 
              groupId={activeGroupId} 
              baseType={vehicleGroups.find(g => g.id === activeGroupId)?.base_type} 
            />
          )}
        </motion.div>
      )}

      {/* Editor Matrix View */}
      {activeTab === 'matrix' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="flex justify-end mb-4">
            <span className="flex items-center text-zinc-300 bg-emerald-400/10 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-400/20">
              <CheckCircle size={16} className="mr-2" /> Preços lidos da tabela
            </span>
          </div>
          <div className="glass-panel overflow-x-auto p-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-r border-white/5 bg-white/5 rounded-tl-xl w-48 font-black text-zinc-500 uppercase tracking-widest text-xs">
                    Categoria \ Plano
                  </th>
                  {plans.map(plan => (
                    <th key={plan.id} className="p-4 border-b border-white/5 text-center w-64">
                      <div className="inline-block px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-white/10/30 text-cyan-300 font-bold uppercase tracking-wider text-sm">
                        {plan.nome}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={plans.length + 1} className="p-12 text-center text-zinc-500 font-medium">
                      Nenhuma planilha importada. Puxe uma tabela FIPE na aba lado primeiro.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, rowIndex) => (
                    <tr key={cat.id} className="group transition-colors">
                      <td className="p-4 py-6 border-b border-r border-white/5 bg-white/[0.02] font-bold text-white whitespace-nowrap">
                        {cat.nome}
                      </td>
                      {plans.map(plan => {
                        const cellData = data[cat.id]?.[plan.id];
                        return (
                          <td key={plan.id} className="p-4 border-b border-white/5 items-center relative h-full">
                            <div 
                              onClick={() => openEditor(cat.id, plan.id)}
                              className="mx-auto w-48 glass-card cursor-pointer group-hover:border-white/10/50 transition-all p-4 flex flex-col items-center gap-1 hover:-translate-y-1 relative"
                            >
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Settings2 size={16} className="text-zinc-300" />
                              </div>
                              <span className="text-2xl font-black text-white">{formatCurrency(cellData?.price)}<span className="text-sm font-normal text-zinc-500">/mês</span></span>
                              <div className="flex space-x-3 text-xs font-semibold mt-2 px-3 py-1 bg-black/40 rounded-md border border-white/10">
                                <span className="text-rose-400">Fran: {cellData?.franchise}%</span>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.15)] rounded-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-white to-zinc-400"></div>
              
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Precificação</h3>
                  <p className="text-sm text-zinc-300 font-medium mt-1">
                    {categories.find(c => c.id === editing.catId)?.nome} + plano {plans.find(p => p.id === editing.planId)?.nome}
                  </p>
                </div>
                <button onClick={() => setEditing(null)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full hover:bg-red-500/20 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Mensalidade (R$)</label>
                  <input 
                    type="number"
                    value={editing.price}
                    onChange={(e) => setEditing({...editing, price: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Franquia (%)</label>
                    <input 
                      type="number"
                      value={editing.franchise}
                      onChange={(e) => setEditing({...editing, franchise: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Cobertura Máx.</label>
                    <input 
                      type="number"
                      value={editing.max_coverage}
                      onChange={(e) => setEditing({...editing, max_coverage: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end">
                <button onClick={handleSave} className="premium-button flex items-center space-x-2 w-full">
                  <Save size={20} />
                  <span>Salvar Regra</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    {/* Modal para Novo Grupo */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-zinc-900 border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.15)] rounded-2xl w-full max-w-sm overflow-hidden relative">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-500"></div>
              
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Criar Novo Grupo</h3>
                <button onClick={() => setIsGroupModalOpen(false)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full hover:bg-red-500/20 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nome do Grupo</label>
                  <input type="text" value={newGroupState.nome} onChange={e => setNewGroupState({...newGroupState, nome: e.target.value})} placeholder="Ex: Carros SUV, Uber..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Modo de Precificação</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewGroupState({...newGroupState, pricing_mode: 'plans'})}
                      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all text-left gap-1 ${newGroupState.pricing_mode === 'plans' ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                    >
                      <ShieldCheck size={18} />
                      <span className="text-xs font-black uppercase tracking-wide">Por Planos</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">Básico, VIP...</span>
                    </button>
                    <button
                      onClick={() => setNewGroupState({...newGroupState, pricing_mode: 'fipe_tiers'})}
                      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border transition-all text-left gap-1 ${newGroupState.pricing_mode === 'fipe_tiers' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'}`}
                    >
                      <Bike size={18} />
                      <span className="text-xs font-black uppercase tracking-wide">Por Faixa FIPE</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">Preço e benefícios por faixa</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Ícone / Base FIPE</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setNewGroupState({...newGroupState, base_type: 'carro'})} className={`flex items-center justify-center py-2 rounded-lg border ${newGroupState.base_type === 'carro' ? 'bg-white/10/20 border-white/10/50 text-zinc-300' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                      <Car size={20} />
                    </button>
                    <button onClick={() => setNewGroupState({...newGroupState, base_type: 'moto'})} className={`flex items-center justify-center py-2 rounded-lg border ${newGroupState.base_type === 'moto' ? 'bg-white/10/20 border-white/10/50 text-zinc-300' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                      <Bike size={20} />
                    </button>
                    <button onClick={() => setNewGroupState({...newGroupState, base_type: 'caminhao'})} className={`flex items-center justify-center py-2 rounded-lg border ${newGroupState.base_type === 'caminhao' ? 'bg-white/10/20 border-white/10/50 text-zinc-300' : 'bg-white/5 border-white/10 text-zinc-400'}`}>
                      <Truck size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20">
                <button 
                  onClick={async () => {
                    try {
                      if(!newGroupState.nome.trim()) return;
                      
                      if (!associationId) {
                        alert("Erro: associationId está nulo. Verifique se o slug da associação no .env bate com o do banco de dados.");
                        return;
                      }

                      setIsCreatingGroup(true);
                      const { data, error } = await supabase.from('vehicle_groups').insert({
                        association_id: associationId,
                        nome: newGroupState.nome,
                        base_type: newGroupState.base_type,
                        pricing_mode: newGroupState.pricing_mode,
                        ordem: vehicleGroups.length + 1
                      }).select();
                      
                      if (error) {
                        console.error("Erro banco:", error);
                        alert("Erro ao criar no banco: " + error.message);
                      } else if (data && data.length > 0) {
                        await fetchGroups(associationId);
                        setActiveGroupId(data[0].id);
                        setIsGroupModalOpen(false);
                        setNewGroupState({nome: '', base_type: 'carro', pricing_mode: 'plans'});
                      } else {
                        alert("Erro desconhecido: Banco de Dados não retornou nenhum registro. Verifique se rodou a migration_vehicle_groups.sql.");
                      }
                    } catch (err: any) {
                      console.error("Erro JS:", err);
                      alert("Erro inesperado na aplicação: " + err.message);
                    } finally {
                      setIsCreatingGroup(false);
                    }
                  }} 
                  disabled={isCreatingGroup || !newGroupState.nome.trim()} 
                  className="w-full premium-button flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isCreatingGroup ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>Criar Grupo</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Editar Grupo ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editGroupState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setEditGroupState(null); }}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-950 border border-white/10 shadow-[0_0_60px_rgba(99,102,241,0.15)] rounded-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500" />

              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2"><Edit3 size={18} /> Editar Grupo</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Altere o nome, tipo ou modo de precificação.</p>
                </div>
                <button onClick={() => setEditGroupState(null)} className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full hover:bg-red-500/20 transition-all"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Grupo</label>
                  <input
                    value={editGroupState.nome}
                    onChange={e => setEditGroupState({ ...editGroupState, nome: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>

                {/* Tipo de Veículo */}
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Tipo de Veículo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['carro','moto','caminhao'] as const).map(t => (
                      <button key={t} onClick={() => setEditGroupState({ ...editGroupState, base_type: t })}
                        className={`flex flex-col items-center py-3 rounded-xl border transition-all ${
                          editGroupState.base_type === t ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        {t === 'carro' ? <Car size={18}/> : t === 'moto' ? <Bike size={18}/> : <Truck size={18}/>}
                        <span className="text-[10px] font-bold uppercase mt-1">{t === 'caminhao' ? 'Caminhão' : t === 'moto' ? 'Moto' : 'Carro'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modo de Precificação */}
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Modo de Precificação</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setEditGroupState({ ...editGroupState, pricing_mode: 'plans' })}
                      className={`flex flex-col items-center py-4 rounded-xl border transition-all gap-1 ${
                        editGroupState.pricing_mode === 'plans' ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <ShieldCheck size={20}/>
                      <span className="text-xs font-black uppercase">Planos</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">Básico, VIP etc.</span>
                    </button>
                    <button onClick={() => setEditGroupState({ ...editGroupState, pricing_mode: 'fipe_tiers' })}
                      className={`flex flex-col items-center py-4 rounded-xl border transition-all gap-1 ${
                        editGroupState.pricing_mode === 'fipe_tiers' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <Bike size={20}/>
                      <span className="text-xs font-black uppercase">Por Faixa FIPE</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">Preço e benefícios por faixa</span>
                    </button>
                  </div>
                  {editGroupState.pricing_mode === 'fipe_tiers' && (
                    <div className="mt-3 flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-4 py-3">
                      <AlertCircle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-300">Neste modo, cada faixa FIPE terá seu próprio preço e benefícios. Configure em <strong>Benefícios por Faixa</strong> após salvar.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSaveEditGroup}
                  disabled={!editGroupState.nome.trim()}
                  className="w-full premium-button flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Save size={18} /><span>Salvar Alterações</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PricingPage;


