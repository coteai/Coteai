import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CheckCircle2, ArrowRight, Smartphone, Loader2, AlertCircle, Bike, Truck, Zap, Car, FileText, ListTree, Share2, Download, Copy, Pencil, Plus, X, RotateCcw, FlaskConical, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAssociation } from '../../contexts/AssociationContext';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { getThemeConfig } from '../../utils/themePresets';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

// Logos Oficiais VipCar Brasil (embutidas em Base64 para integracao perfeita e sem falhas no PDF)
const VIPCAR_LOGO_LIGHT = 'data:image/png;base64,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';
const VIPCAR_LOGO_DARK = 'data:image/png;base64,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';

const QuoteGenerator = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);
  
  const [formData, setFormData] = useState<any>({ placa: '', tipo_veiculo: 'carro', modelo: '', fipe: 0 });
  const [fipeVariants, setFipeVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  // Modo manual (teste sem placa real)
  const [manualMode, setManualMode] = useState(false);
  const [manualModelo, setManualModelo] = useState('');
  const [manualFipe, setManualFipe] = useState('');

  // Modo manual (teste sem placa real)


  // Vehicle Groups
  const [vehicleGroups, setVehicleGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Supabase data
  const { associationData, proposalTheme } = useAssociation();
  const { consultor } = useConsultorAuth();
  const theme = consultor ? getThemeConfig(consultor.tema_cor || 'emerald') : proposalTheme;
  const associationId = associationData?.id;
  const [matchedCategory, setMatchedCategory] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);

  // ── Benefit Editing States ──
  const [editedCoberturas, setEditedCoberturas] = useState<Record<string, { label: string; param?: string }[]>>({});
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editedAdesao, setEditedAdesao] = useState<Record<string, string>>({});
  const [editedMensalidade, setEditedMensalidade] = useState<Record<string, string>>({});
  const [newBenefit, setNewBenefit] = useState<{ label: string; param: string }>({ label: '', param: '' });


  useEffect(() => {
    const init = async () => {
      if (associationId) {
        const { data: groups } = await supabase.from('vehicle_groups').select('*').eq('association_id', associationId).order('ordem');
        if (groups) setVehicleGroups(groups);
      }
    };
    init();
  }, [associationId]);

  const resetFlow = () => {
    setStep(1);
    setFormData({ placa: '', tipo_veiculo: 'carro', modelo: '', fipe: 0 });
    setFipeVariants([]);
    setSelectedVariant(null);
    setSelectedGroupId(null);
    setAvailablePlans([]);
    setMatchedCategory(null);
    setSelectedPlan(null);
    setSavedQuoteId(null);
    setError('');
    setEditedCoberturas({});
    setEditingPlanId(null);
    setNewBenefit({ label: '', param: '' });
    setEditedAdesao({});
    setEditedMensalidade({});
  };

  // ── Benefit Editing Helpers ──
  const getCoberturas = (planId: string, original: any[]) =>
    editedCoberturas[planId] ?? original ?? [];

  const getPlansWithEdits = () =>
    availablePlans.map(p => ({
      ...p,
      plans: {
        ...p.plans,
        coberturas: editedCoberturas[p.id] ?? p.plans?.coberturas ?? []
      }
    }));

  const getAdesao = (planId: string, original: number) => {
    if (editedAdesao[planId] !== undefined) {
      const parsed = parseFloat(editedAdesao[planId].replace(/\./g, '').replace(',', '.'));
      return isNaN(parsed) ? original : parsed;
    }
    return original;
  };

  const getMensalidade = (planId: string, original: number) => {
    if (editedMensalidade[planId] !== undefined) {
      const parsed = parseFloat(editedMensalidade[planId].replace(/\./g, '').replace(',', '.'));
      return isNaN(parsed) ? original : parsed;
    }
    return original;
  };

  const openEditMode = (planId: string, original: any[]) => {
    setEditedCoberturas(prev => ({ ...prev, [planId]: JSON.parse(JSON.stringify(original ?? [])) }));
    setEditingPlanId(planId);
    setNewBenefit({ label: '', param: '' });
  };

  const closeEditMode = () => setEditingPlanId(null);

  const restoreBenefits = (planId: string, original: any[]) => {
    setEditedCoberturas(prev => { const next = { ...prev }; delete next[planId]; return next; });
    setEditingPlanId(null);
  };

  const removeBenefit = (planId: string, index: number) => {
    setEditedCoberturas(prev => ({ ...prev, [planId]: prev[planId].filter((_, i) => i !== index) }));
  };

  const updateBenefit = (planId: string, index: number, field: 'label' | 'param', value: string) => {
    setEditedCoberturas(prev => ({
      ...prev,
      [planId]: prev[planId].map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const addBenefit = (planId: string) => {
    if (!newBenefit.label.trim()) return;
    setEditedCoberturas(prev => ({
      ...prev,
      [planId]: [...(prev[planId] ?? []), { label: newBenefit.label.trim(), param: newBenefit.param.trim() || undefined }]
    }));
    setNewBenefit({ label: '', param: '' });
  };

  // Modo manual: gerar cota��o sem buscar placa
  const handleManualCotacao = () => {
    const fipeVal = parseFloat(manualFipe.replace(/\./g, '').replace(',', '.'));
    if (!manualModelo.trim() || isNaN(fipeVal) || fipeVal <= 0) {
      setError('Preencha o modelo e o valor FIPE corretamente.');
      return;
    }
    const variant = { id: 0, modelo: manualModelo.trim(), fipe: fipeVal, codigo_fipe: 'MANUAL' };
    setFipeVariants([variant]);
    setFormData(prev => ({ ...prev, modelo: manualModelo.trim(), fipe: fipeVal, placa: 'TESTE' }));
    selectVariantAndShowGroups(variant);
  };

  // Step 1 -> Step 2: Fetch FIPE Variants from PlacaFipe
  const handleFipeSearch = async () => {
    if (formData.placa.length < 7) return;
    setLoading(true);
    setError('');
    
    try {
      const TOKEN_FIPE = '890A7A9B86A9955BBB3359D6E629DAC07164182704CBFB92A6B5ECAF54673167';
      const cleanPlaca = formData.placa.replace(/[^A-Za-z0-9]/g, '');
      
      const response = await fetch(`https://api.placafipe.com.br/getplacafipe/${cleanPlaca}/${TOKEN_FIPE}`);
      const data = await response.json();

      if (data.codigo !== 1 || !data.fipe || data.fipe.length === 0) {
        setError(data.msg || 'Nenhum veículo encontrado para esta placa.');
        setLoading(false);
        return;
      }

      // IMPORTANTE: Mapeamos o array inteiro (LIMITLESS) que a API da PlacaFipe envia.
      const variants = data.fipe.map((v, idx) => ({
        id: idx,
        modelo: `${v.marca} ${v.modelo} (${v.ano_modelo})`,
        fipe: parseFloat(v.valor), 
        codigo_fipe: v.codigo_fipe
      }));

      setFipeVariants(variants);
      
      if (data.informacoes_veiculo && data.informacoes_veiculo.modelo) {
        setFormData(prev => ({ ...prev, modelo_placa: data.informacoes_veiculo.modelo }));
      }
      
      setStep(2);
    } catch (err) {
      setError('Erro de conexão com a API da Placa Fipe. Tente novamente.');
      console.error("FIPE fetch erro:", err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 2.5: Store selected variant, show group selection
  const selectVariantAndShowGroups = (variant) => {
    setSelectedVariant(variant);
    setFormData(prev => ({ ...prev, fipe: variant.fipe, modelo: variant.modelo }));
    setError('');
    
    // Filter groups by selected vehicle type
    const relevantGroups = vehicleGroups.filter(g => g.base_type === formData.tipo_veiculo);
    
    if (relevantGroups.length === 1) {
      // Only one group -> skip selection, go straight to pricing
      fetchPricingForGroup(variant, relevantGroups[0].id);
    } else if (relevantGroups.length === 0) {
      setError(`Nenhum Grupo Tarifário configurado para ${formData.tipo_veiculo}. Configure na aba Precificação.`);
    } else {
      // Multiple groups -> show selection step
      setStep('2b');
    }
  };
  
  // Step 2.5 -> Step 3: Fetch pricing after group is selected by the consultant
  const fetchPricingForGroup = async (variant, groupId) => {
    if (!associationId) return;
    setLoading(true);
    setError('');
    setSelectedGroupId(groupId);
    
    const v = variant || selectedVariant;
    if (!v) return;

    const { data: categories } = await supabase
      .from('vehicle_categories')
      .select('*')
      .eq('association_id', associationId)
      .eq('group_id', groupId)
      .lte('fipe_min', v.fipe)
      .gte('fipe_max', v.fipe)
      .single();

    if (!categories) {
      const groupName = vehicleGroups.find(g => g.id === groupId)?.nome || 'grupo selecionado';
      setError(`Tabela "${groupName}" não cobre um veículo de ${formatCurrency(v.fipe)}. Verifique as faixas FIPE configuradas.`);
      setLoading(false);
      return;
    }
    setMatchedCategory(categories);

    // Verifica o modo de precificação do grupo
    const group = vehicleGroups.find(g => g.id === groupId);
    const isFipeTiers = group?.pricing_mode === 'fipe_tiers';

    if (isFipeTiers) {
      if (categories.mensalidade === null || categories.mensalidade === undefined) {
        setError('Essa faixa FIPE não tem um preço configurado.');
        setLoading(false);
        return;
      }
      
      const mockPlanPrice = {
        id: categories.id,
        mensalidade: categories.mensalidade,
        franquia_percentual: categories.franquia_percentual || 0,
        cobertura_maxima: categories.fipe_max,
        ativo: true,
        plans: {
          id: categories.id,
          nome: categories.nome,
          descricao: '',
          coberturas: categories.coberturas || []
        }
      };
      setAvailablePlans([mockPlanPrice]);
      setLoading(false);
      setStep(3);
      return;
    }

    // Modo "plans": Busca os planos disponíveis na tabela de preços
    const { data: prices } = await supabase
      .from('pricing_table')
      .select('*, plans(id, nome, descricao, coberturas)')
      .eq('category_id', categories.id)
      .eq('ativo', true);

    if (!prices || prices.length === 0) {
      setError('Nenhum plano ativo para essa faixa FIPE neste grupo.');
      setLoading(false);
      return;
    }
    setAvailablePlans(prices);

    setLoading(false);
    setStep(3);
  };

  // Step 3 -> Step 4: Save Quote
  const saveQuoteMulti = async () => {
    if (!associationId || !matchedCategory) return;
    setSaving(true);
    
    const minPrice = Math.min(...availablePlans.map(p => p.mensalidade));

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        association_id: associationId,
        consultant_id: consultor?.id || null,
        placa: formData.placa,
        modelo: formData.modelo,
        categoria_id: matchedCategory.id,
        valor_fipe: formData.fipe,
        plano_selecionado: getPlansWithEdits().length > 1 ? 'Múltiplas Opções' : getPlansWithEdits()[0]?.plans?.nome,
        mensalidade: minPrice,
        planos_cotados: getPlansWithEdits(),
        status: 'pending'
      })
      .select()
      .single();

    if (!quoteError && quote) {
      setSavedQuoteId(quote.id);
    }

    setSaving(false);
    setStep(4);
  };

  const getShareText = () => {
    let assocName = associationData?.nome ? associationData.nome.toUpperCase() : 'VIPCAR BRASIL';
    
    let anoMatch = formData.modelo.match(/\(([^)]+)\)/);
    let ano = anoMatch ? anoMatch[1] : 'N/A';
    let modeloNome = formData.modelo.replace(/\s*\([^)]+\)\s*/, '');

    let text = `🚗 *COTAÇÃO PARA SEU VEÍCULO*\n\n`;
    text += `📊 *Dados do Veículo:*\n\n`;
    text += `Modelo: ${modeloNome}\n`;
    text += `Ano: ${ano}\n`;
    text += `Valor FIPE: ${formatCurrency(formData.fipe)}\n\n`;
    
    text += `📋 *PLANOS DISPONÍVEIS:*\n\n`;

    const _plans = getPlansWithEdits();
    _plans.forEach(p => {
      const isVip = p.plans?.nome?.toLowerCase().includes('vip');
      const icon = isVip ? '🔴✨' : '🔴';
      
      text += `${icon} *Plano ${p.plans?.nome?.toUpperCase()}*\n\n`;
      text += `💰 Mensalidade: ${formatCurrency(p.mensalidade)}\n`;
      text += `✅ Adesão: ${formatCurrency(p.mensalidade)}\n`; 
      text += `🎯 Cota Participação: ${p.franquia_percentual}%\n\n`;
      
      text += `📋 *Benefícios:*\n\n`;
      const coberturas = p.plans?.coberturas || [];
      coberturas.forEach(c => {
        text += `• ${c.label}${c.param ? `: ${c.param}` : ''}\n`;
      });
      text += `\n`;
    });

    if (_plans.length > 1) {
      text += `*DIFERENCIAIS ENTRE OS PLANOS:*\n\n`;
      
      _plans.forEach(p1 => {
        const isVip = p1.plans?.nome?.toLowerCase().includes('vip');
        const icon = isVip ? '🔴✨' : '🔴';
        
        let diffs: string[] = [];
        const myCovs = p1.plans?.coberturas || [];
        
        myCovs.forEach(myC => {
          let isDifferent = false;
          _plans.forEach(p2 => {
             if(p1.id === p2.id) return;
             const theirCovs = p2.plans?.coberturas || [];
             const match = theirCovs.find(tC => tC.label === myC.label);
             if (!match) {
                 isDifferent = true; 
             } else if (match.param !== myC.param) {
                 isDifferent = true; 
             }
          });
          if (isDifferent) {
            diffs.push(`• ${myC.label}${myC.param ? `: ${myC.param}` : ''}`);
          }
        });

        if (diffs.length > 0) {
          text += `${icon} *PLANO ${p1.plans?.nome?.toUpperCase()}*\n\n`;
          diffs.forEach(d => {
            text += `${d}\n`;
          });
          text += `\n`;
        }
      });
    }

    text += `Qualquer dúvida, é só me chamar!`;
    return text;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getShareText());
    alert("Texto copiado!");
  };

  const generatePdfBlob = async () => {
    const input = pdfRef.current;
    if (!input) return null;
    
    setIsGeneratingPDF(true);
    try {
      await new Promise(r => setTimeout(r, 100)); // wait for rendering
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const childrenNodes = Array.from(input.children);
      for (let i = 0; i < childrenNodes.length; i++) {
        const pageElement = childrenNodes[i];
        if (i > 0) pdf.addPage();
        
        pdf.setFillColor(8, 15, 30); // Theme background #080F1E
        pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
        
        const imgData = await htmlToImage.toPng(pageElement, { backgroundColor: '#ffffff', pixelRatio: 2 });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        // Map perfectly to A4
        const rawPdfHeight = (imgProps.height * pageWidth) / imgProps.width;
        
        if (rawPdfHeight <= pageHeight) {
          pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, rawPdfHeight);
        } else {
          const scaleFactor = pageHeight / rawPdfHeight;
          const finalWidth = pageWidth * scaleFactor;
          const offsetX = (pageWidth - finalWidth) / 2;
          pdf.addImage(imgData, 'PNG', offsetX, 0, finalWidth, pageHeight);
        }
      }
      return pdf.output('blob');
    } catch (err) {
      console.error("Erro gerando PDF:", err);
      alert(`Houve um erro: ${err.message || err}`);
      return null;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleNativeShare = async () => {
    const blob = await generatePdfBlob();
    if (!blob) return;

    const fileName = `Cotacao_${formData.placa || 'Veiculo'}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Cotação ${formData.modelo}`,
          text: `Segue a proposta em PDF para o ${formData.modelo}.`
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      alert("Seu aparelho/navegador não suporta envio direto de documentos do sistema. O download do PDF começará agora, anexe manualmente onde preferir.");
      handleDownloadPDF(blob); // fallback
    }
  };

  const handleDownloadPDF = async (preGeneratedBlob = null) => {
    const blob = preGeneratedBlob || await generatePdfBlob();
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotacao_${formData.placa || 'Veiculo'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const renderStepIcon = (num, icon, label) => (
    <div className="flex flex-col items-center">
      <div className={`relative w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-[var(--color-surface)] ${
        step === num ? 'border-white text-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 
        step > num ? `${theme.colors.border} ${theme.colors.primary}` : 'border-white/10 text-zinc-600'
      }`} style={step > num ? { boxShadow: `0 0 15px ${theme.colors.shadow}` } : {}}>
        <div className={`absolute inset-0 rounded-full ${step === num ? 'bg-white/5' : ''}`} style={step > num ? { backgroundColor: `${theme.colors.glowHex}1A` } : {}}></div>
        <div className="relative z-10">{step > num ? <CheckCircle2 size={22} className={theme.colors.primary} /> : icon}</div>
      </div>
      <span className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${
        step === num ? 'text-white' : step > num ? theme.colors.primary : 'text-zinc-600'
      }`}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-8 flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-2">Máquina de Cotação</h1>
          <p className="text-slate-400">Gere propostas instantâneas. Precisão FIPE total.</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-8 py-5 relative">
        {/* Progress track */}
        <div className="absolute top-[42px] left-[10%] right-[10%] h-px bg-white/10 z-0"></div>
        <div className="absolute top-[42px] left-[10%] h-px z-0 transition-all duration-500" style={{ backgroundColor: theme.colors.glowHex, width: `${([1,'2b',3,4].indexOf(step)) * (80/3)}%` }}></div>
        <div className="flex justify-between relative z-10">
          {renderStepIcon(1, <Car size={18} />, "Placa")}
          {renderStepIcon(2, <ListTree size={18} />, "Versão")}
          {renderStepIcon(3, <Zap size={18} />, "Preços")}
          {renderStepIcon(4, <FileText size={18} />, "Resumo")}
        </div>
      </div>

      <div className="glass-panel flex-1 flex flex-col overflow-y-auto relative min-h-[400px] custom-scrollbar">
        <AnimatePresence mode="wait">

          {/* STEP 1: PLACA E TIPO */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-12 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full text-center">
              <h2 className="premium-title text-3xl uppercase tracking-tighter mb-2">Consulta de Veículo</h2>
              <p className="text-zinc-500 mb-8">Selecione o tipo e digite a placa.</p>

              <div className="flex justify-center mb-8 bg-[#141f38]/80 p-1.5 rounded-2xl border border-white/5 mx-auto max-w-sm">
                <button onClick={() => setFormData({...formData, tipo_veiculo: 'carro'})} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                  formData.tipo_veiculo === 'carro' ? `text-white border ${theme.colors.border}` : 'text-zinc-500 hover:text-zinc-300'
                }`} style={formData.tipo_veiculo === 'carro' ? { backgroundColor: `${theme.colors.glowHex}33`, boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}>
                  <Car size={28} className="mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Carro</span>
                </button>
                <button onClick={() => setFormData({...formData, tipo_veiculo: 'moto'})} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                  formData.tipo_veiculo === 'moto' ? `text-white border ${theme.colors.border}` : 'text-zinc-500 hover:text-zinc-300'
                }`} style={formData.tipo_veiculo === 'moto' ? { backgroundColor: `${theme.colors.glowHex}33`, boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}>
                  <Bike size={28} className="mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Moto</span>
                </button>
                <button onClick={() => setFormData({...formData, tipo_veiculo: 'caminhao'})} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                  formData.tipo_veiculo === 'caminhao' ? `text-white border ${theme.colors.border}` : 'text-zinc-500 hover:text-zinc-300'
                }`} style={formData.tipo_veiculo === 'caminhao' ? { backgroundColor: `${theme.colors.glowHex}33`, boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}>
                  <Truck size={28} className="mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">Caminhão</span>
                </button>
              </div>

              {!manualMode && (
                <div className="relative mb-8 mx-auto w-full max-w-sm">
                  <div className="absolute top-0 left-0 h-full w-4 bg-blue-700 rounded-l-xl flex flex-col items-center justify-between py-2 overflow-hidden border border-blue-900 border-r-0 z-10">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0"></div>
                  </div>
                  <input type="text"
                    value={formData.placa}
                    onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                    className="w-full bg-[#141f38] border-2 border-white/10 rounded-xl px-8 py-6 text-4xl text-center text-white focus:outline-none focus:border-blue-400 font-bold tracking-[0.2em] shadow-[0_0_30px_rgba(59,130,246,0.05)] font-mono uppercase"
                    placeholder="AAA0A00"
                    maxLength={7}
                  />
                </div>
              )}

              {!manualMode && (
                <div className="flex justify-center w-full max-w-sm mx-auto">
                  <button onClick={handleFipeSearch} disabled={formData.placa.length < 7 || loading} className={`w-full flex justify-center items-center py-4 rounded-xl text-white font-black uppercase tracking-widest transition-all ${
                    formData.placa.length >= 7 ? theme.colors.bg : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                  }`} style={formData.placa.length >= 7 ? { boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}>
                    {loading ? <Loader2 className="animate-spin" /> : <span>Buscar Variantes FIPE <ArrowRight className="inline-block ml-2 w-4" /></span>}
                  </button>
                </div>
              )}

              {/* Toggle modo manual de teste */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => { setManualMode(!manualMode); setError(''); }}
                  className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${
                    manualMode
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <FlaskConical size={13} />
                  {manualMode ? 'Modo Teste Ativo — Clique para voltar à placa' : 'Inserir valor manualmente (teste)'}
                </button>
              </div>

              {/* Formulario de entrada manual */}
              {manualMode && (
                <div className="mt-5 mx-auto w-full max-w-sm space-y-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <FlaskConical size={14} className="text-amber-400" />
                    <p className="text-xs text-amber-300 font-bold uppercase tracking-widest">Cotação de Teste — Sem Placa Real</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-1.5">Modelo / Descrição</label>
                    <input
                      type="text"
                      value={manualModelo}
                      onChange={e => setManualModelo(e.target.value)}
                      placeholder="Ex: Toyota Corolla 2023"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-1.5">Valor FIPE (R$)</label>
                    <div className="relative">
                      <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="number"
                        min={1000}
                        max={1000000}
                        step={1000}
                        value={manualFipe}
                        onChange={e => setManualFipe(e.target.value)}
                        placeholder="Ex: 85000"
                        className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white font-mono font-bold focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1">Suporta valores até R$ 1.000.000</p>
                  </div>
                  <button
                    onClick={handleManualCotacao}
                    disabled={!manualModelo.trim() || !manualFipe || loading}
                    className="w-full flex justify-center items-center gap-2 py-3 rounded-xl text-black font-black uppercase tracking-widest transition-all bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16} /><span>Gerar Cotação de Teste</span></>}
                  </button>
                </div>
              )}
              
              {error && (
                <div className="mt-6 flex items-center justify-center space-x-2 text-red-400 text-sm font-medium">
                  <AlertCircle size={16} /> <span>{error}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: VERSÕES FIPE */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 flex-1 flex flex-col max-w-3xl mx-auto w-full max-h-[80vh]">
              <div className="flex justify-between items-end mb-6">
                 <div>
                   <h2 className="premium-title text-3xl uppercase tracking-tighter mb-1">Selecione a versão correta</h2>
                   <p className="text-zinc-400">Variantes encontradas na FIPE para a placa <strong className="text-white bg-white/10 px-2 py-0.5 rounded font-mono">{formData.placa}</strong> <span className="ml-2 text-zinc-300 text-xs font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded-full">{fipeVariants.length} encontradas</span></p>
                 </div>
                 <button onClick={() => setStep(1)} className="text-zinc-300 text-sm hover:underline font-bold">Voltar</button>
              </div>

              {error && (
                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 font-medium">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Contêiner com altura máxima forçada e scroll claro */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-3 custom-scrollbar pb-4 max-h-[400px]">
                {fipeVariants.map((v) => (
                  <button 
                    key={v.id} 
                    onClick={() => selectVariantAndShowGroups(v)}
                    disabled={loading}
                    className="w-full bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 text-left group transition-all"
                  >
                     <div className="flex items-center">
                       <div className="w-10 h-10 rounded-full border flex items-center justify-center mr-4 transition-colors shrink-0" style={{ backgroundColor: `${theme.colors.glowHex}1A`, borderColor: `${theme.colors.glowHex}50`, boxShadow: `0 0 15px ${theme.colors.shadow}` }}>
                          {formData.tipo_veiculo === 'moto' ? <Bike className="text-white relative z-10" size={18}/> : formData.tipo_veiculo === 'caminhao' ? <Truck className="text-white relative z-10" size={18}/> : <Car className="text-white relative z-10" size={18}/>}
                       </div>
                       <div>
                         <h3 className="text-sm sm:text-base font-bold text-zinc-300 group-hover:text-white transition-colors uppercase leading-tight pr-2">{v.modelo}</h3>
                         <p className="text-[11px] text-zinc-400 font-bold bg-white/5 inline-block px-2 py-0.5 rounded mt-1.5 border border-white/5">Cód. {v.codigo_fipe}</p>
                       </div>
                     </div>
                     <div className="sm:text-right pl-[56px] sm:pl-4 shrink-0">
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">FIPE Hoje</p>
                       <span className="text-lg sm:text-xl font-black text-white">{formatCurrency(v.fipe)}</span>
                     </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-zinc-500 text-xs italic">Role para baixo para ver mais {fipeVariants.length > 3 ? `(${fipeVariants.length - 3} abaixo)` : ''} ↓</p>
              </div>
              
            </motion.div>
          )}

          {/* STEP 2B: SELEÇÃO DE GRUPO TARIFÁRIO */}
          {step === '2b' && (
            <motion.div key="step2b" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 flex-1 flex flex-col max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="premium-title text-3xl uppercase tracking-tighter mb-1">Categoria Tarifária</h2>
                  <p className="text-zinc-400">qual categoria se enquadra o <strong className="text-white">{formData.modelo}</strong>?</p>
                </div>
                <button onClick={() => setStep(2)} className="text-zinc-300 text-sm hover:underline font-bold">Voltar</button>
              </div>

              {error && (
                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 font-medium">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicleGroups.filter(g => g.base_type === formData.tipo_veiculo).map((group) => (
                  <button
                    key={group.id}
                    onClick={() => fetchPricingForGroup(selectedVariant, group.id)}
                    disabled={loading}
                    className="w-full bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between text-left group transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <div className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 mr-5 transition-colors" style={{ backgroundColor: `${theme.colors.glowHex}1A`, borderColor: `${theme.colors.glowHex}50`, boxShadow: `0 0 15px ${theme.colors.shadow}` }}>
                        {group.base_type === 'carro' ? <Car size={26} className="text-white" /> : group.base_type === 'moto' ? <Bike size={26} className="text-white" /> : <Truck size={26} className="text-white" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-zinc-300 group-hover:text-white transition-colors">{group.nome}</h3>
                        <p className="text-[11px] text-zinc-400 font-bold bg-white/5 inline-block px-2 py-0.5 rounded mt-1.5 border border-white/5">Selecionar esta categoria</p>
                      </div>
                    </div>
                    {loading && selectedGroupId === group.id && <Loader2 className="animate-spin text-white ml-auto mt-4 sm:mt-0" size={20} />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: PREÇO & PLANO */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 sm:p-8 flex flex-col w-full">
              <div className="flex justify-between items-start mb-4 sm:mb-6 gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="premium-title text-2xl sm:text-3xl uppercase tracking-tighter">Planos Disponíveis</h2>
                  <p className="text-zinc-500 flex flex-wrap items-center mt-1 text-xs sm:text-sm">
                    <CheckCircle2 className="text-white mr-1.5 w-3.5 shrink-0"/>
                    <span className="font-medium mr-2 truncate max-w-[160px] sm:max-w-none">{formData.modelo}</span>
                    <span className="bg-black/40 px-2 py-0.5 rounded text-xs border border-white/5">FIPE: {formatCurrency(formData.fipe)}</span>
                  </p>
                </div>
                <button onClick={() => setStep(2)} className="text-zinc-300 text-xs sm:text-sm hover:underline font-bold bg-white/5 px-3 py-2 rounded-lg shrink-0">Trocar Versão</button>
              </div>

              {/* Plan cards: single column on mobile with scroll, multi-column on desktop */}
              <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full pb-4">
                {availablePlans.map((planPrice) => {
                  const isVip = planPrice.plans?.nome?.toLowerCase().includes('vip');
                  return (
                    <div key={planPrice.id} className="relative overflow-hidden flex flex-col p-5 sm:p-6 rounded-2xl transition-all border border-zinc-800 bg-[#121212] hover:border-zinc-700" style={isVip ? { borderColor: theme.colors.glowHex, boxShadow: `0 0 40px ${theme.colors.shadow}` } : {}}>
                      {isVip && <div className="absolute top-0 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1 rounded-b-lg z-20" style={{ backgroundColor: theme.colors.glowHex, boxShadow: `0 0 15px ${theme.colors.shadow}` }}>Recomendado</div>}
                      {isVip && <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl z-0" style={{ backgroundColor: `${theme.colors.glowHex}1A` }}></div>}

                      <div className="mb-3 sm:mb-4 relative z-10 border-b border-white/5 pb-3 sm:pb-4 mt-4 text-center">
                        <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-widest ${isVip ? theme.colors.primary : 'text-zinc-200'}`}>
                          {planPrice.plans?.nome}
                        </h3>
                      </div>

                      <div className="mb-4 sm:mb-6 relative z-10 text-center">
                        {editingPlanId === planPrice.id ? (
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-zinc-500 text-lg font-bold">R$</span>
                            <input
                              type="text"
                              value={editedMensalidade[planPrice.id] ?? String(planPrice.mensalidade)}
                              onChange={e => setEditedMensalidade(prev => ({ ...prev, [planPrice.id]: e.target.value }))}
                              className="w-36 bg-black/60 border-b-2 border-white/30 text-white text-3xl sm:text-4xl font-black text-center outline-none focus:border-white transition-colors"
                              placeholder="0"
                            />
                            <span className="text-sm text-zinc-500 font-medium">/mês</span>
                          </div>
                        ) : (
                          <span className="text-3xl sm:text-4xl font-black text-white">{formatCurrency(getMensalidade(planPrice.id, planPrice.mensalidade))}<span className="text-sm text-zinc-500 font-medium">/mês</span></span>
                        )}
                        
                        <div className="flex flex-col space-y-2 mt-4 bg-black/60 p-3 sm:p-4 rounded-xl border border-white/5 text-left">
                          <div className="flex justify-between items-center">
                             <span className="text-xs text-zinc-500 font-bold">Cota Participação</span>
                             <span className="font-bold text-sm text-white">{planPrice.franquia_percentual}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-xs text-zinc-500 font-bold">Cobertura Máx.</span>
                             <span className="font-bold text-sm text-white">{formatCurrency(planPrice.cobertura_maxima)}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-600 font-black tracking-widest uppercase mb-3 text-center">BENEFÍCIOS DO PLANO</p>
                      
                      {/* Adesão editável */}
                      <div className="mb-3 bg-black/40 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Taxa de Adesão</span>
                          {editingPlanId === planPrice.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500 text-xs font-bold">R$</span>
                              <input
                                type="text"
                                value={editedAdesao[planPrice.id] ?? String(planPrice.mensalidade)}
                                onChange={e => setEditedAdesao(prev => ({ ...prev, [planPrice.id]: e.target.value }))}
                                className="w-24 bg-black/60 border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-bold text-right outline-none focus:border-white/40 transition-colors"
                                placeholder="0"
                              />
                            </div>
                          ) : (
                            <span className="text-white font-black text-sm">{formatCurrency(getAdesao(planPrice.id, planPrice.mensalidade))}</span>
                          )}
                        </div>
                      </div>

                      {/* Benefícios header with edit toggle */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Benefícios</p>
                        {editingPlanId === planPrice.id ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => restoreBenefits(planPrice.id, planPrice.plans?.coberturas || [])} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg transition-all">
                              <RotateCcw size={9}/> Restaurar
                            </button>
                            <button onClick={closeEditMode} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg transition-all">
                              Confirmar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => openEditMode(planPrice.id, planPrice.plans?.coberturas || [])} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg transition-all">
                            <Pencil size={9}/> Editar
                          </button>
                        )}
                      </div>

                      {editingPlanId === planPrice.id ? (
                        <div className="space-y-1.5 flex-1 relative z-10">
                          {(editedCoberturas[planPrice.id] ?? []).map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5">
                              <input
                                value={c.label}
                                onChange={e => updateBenefit(planPrice.id, i, 'label', e.target.value)}
                                placeholder="Benefício"
                                className="flex-1 bg-transparent text-white text-xs font-medium placeholder:text-zinc-600 outline-none"
                              />
                              <span className="text-zinc-600 text-xs">|</span>
                              <input
                                value={c.param || ''}
                                onChange={e => updateBenefit(planPrice.id, i, 'param', e.target.value)}
                                placeholder="Detalhe"
                                className="w-20 bg-transparent text-zinc-400 text-xs placeholder:text-zinc-700 outline-none"
                              />
                              <button onClick={() => removeBenefit(planPrice.id, i)} className="text-red-500/60 hover:text-red-400 transition-colors shrink-0">
                                <X size={12}/>
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5 bg-white/[0.02] border border-dashed border-white/10 rounded-lg px-2.5 py-1.5 mt-2">
                            <input
                              value={newBenefit.label}
                              onChange={e => setNewBenefit(prev => ({ ...prev, label: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addBenefit(planPrice.id)}
                              placeholder="Novo benefício..."
                              className="flex-1 bg-transparent text-white text-xs font-medium placeholder:text-zinc-600 outline-none"
                            />
                            <input
                              value={newBenefit.param}
                              onChange={e => setNewBenefit(prev => ({ ...prev, param: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addBenefit(planPrice.id)}
                              placeholder="Detalhe..."
                              className="w-20 bg-transparent text-zinc-400 text-xs placeholder:text-zinc-700 outline-none"
                            />
                            <button onClick={() => addBenefit(planPrice.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0">
                              <Plus size={12}/>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ul className="space-y-2.5 flex-1 text-zinc-300 relative z-10 text-xs font-medium">
                          {getCoberturas(planPrice.id, planPrice.plans?.coberturas || []).map((c, i) => (
                            <li key={i} className="flex items-start"><CheckCircle2 className={`w-3.5 mt-0.5 mr-2 shrink-0 ${isVip ? theme.colors.primary : 'text-cyan-500'}`}/> {c.label}{c.param ? `: ${c.param}` : ''}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="sticky bottom-0 mt-2 sm:mt-4 pt-4 sm:pt-6 border-t border-white/10 bg-[var(--color-surface)] pb-3 z-20">
                <button
                  onClick={() => saveQuoteMulti()}
                  disabled={saving}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all text-white disabled:opacity-60 flex justify-center items-center ${theme.colors.bg}`}
                  style={{ boxShadow: `0 0 25px ${theme.colors.shadow}` }}
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : `GERAR PROPOSTA`}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: COMPARTILHAMENTO */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 pb-4 flex-1 flex flex-col items-center justify-start text-center h-full min-h-0 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-md mx-auto flex flex-col items-center shrink-0">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center blur-sm absolute inset-0" style={{ backgroundColor: `${theme.colors.glowHex}1A` }}></div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-white/10 relative z-10 ${theme.colors.primary}`} style={{ backgroundColor: `${theme.colors.glowHex}33`, borderColor: `${theme.colors.glowHex}99`, boxShadow: `0 0 20px ${theme.colors.shadow}` }}>
                    <CheckCircle2 size={32} />
                  </div>
                </div>

                <h2 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-6">Proposta Gerada!</h2>
              
              <div className="absolute left-[-9999px] top-[-9999px]">
                <div ref={pdfRef}>
                  {availablePlans.map((planPrice, index) => {
                    const isFirst = index === 0;
                    const coberturas = getCoberturas(planPrice.id, planPrice.plans?.coberturas || []);
                    const anoMatch = formData.modelo?.match(/\(([^)]+)\)/);
                    const anoModelo = anoMatch ? anoMatch[1] : '—';
                    const modeloNome = formData.modelo?.replace(/\s*\([^)]+\)\s*/, '').trim() || formData.modelo;
                    const mensalidade = getMensalidade(planPrice.id, planPrice.mensalidade);
                    const adesao = getAdesao(planPrice.id, planPrice.mensalidade);
                    const halfLen = Math.ceil(coberturas.length / 2);
                    const colA = coberturas.slice(0, halfLen);
                    const colB = coberturas.slice(halfLen);
                    const logoUrl = associationData?.logo_url || associationData?.logo || null;

                    return (
                      <div key={planPrice.id} style={{ width:'800px', minHeight:'1131px', backgroundColor:'#ffffff', fontFamily:'Arial,sans-serif', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

                        {/* ── 1. HEADER ── */}
                        <div style={{ position:'relative', backgroundColor:'#ffffff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 28px 14px 22px', borderBottom:'1px solid #e4e4e4', overflow:'hidden' }}>
                          {/* diagonal vermelho externo */}
                          <div style={{ position:'absolute', top:0, right:0, width:0, height:0, borderStyle:'solid', borderWidth:'0 115px 115px 0', borderColor:'transparent #c0000e transparent transparent' }}/>
                          {/* diagonal preto interno */}
                          <div style={{ position:'absolute', top:0, right:0, width:0, height:0, borderStyle:'solid', borderWidth:'0 82px 82px 0', borderColor:'transparent #1a1a1a transparent transparent', zIndex:1 }}/>

                          {/* Logo Oficial da Associação */}
                          <div style={{ zIndex: 2 }}>
                            <img
                              src={VIPCAR_LOGO_LIGHT}
                              alt="Vipcar Brasil"
                              style={{ height: '62px', width: 'auto', display: 'block', objectFit: 'contain' }}
                            />
                          </div>

                          {/* Slogan */}
                          <div style={{ zIndex:2, display:'flex', alignItems:'center', gap:'14px', marginRight:'125px' }}>
                            <div style={{ width:'1px', height:'46px', background:'#ccc', flexShrink:0 }}/>
                            <div style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'2px', color:'#1a1a1a', textTransform:'uppercase', lineHeight:'1.75', textAlign:'right' }}>
                              MAIS QUE PROTEÇÃO,<br/>É TRANQUILIDADE<br/>PARA VOCÊ SEGUIR.
                            </div>
                          </div>
                        </div>

                        {/* ── 2. TITLE BLOCK ── */}
                        <div style={{ backgroundColor:'#ffffff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 0 0 28px', minHeight:'150px' }}>
                          <div style={{ maxWidth:'240px', flexShrink:0 }}>
                            <div style={{ fontSize:'12px', fontWeight:'600', letterSpacing:'3px', color:'#555', textTransform:'uppercase' }}>Cotação</div>
                            <div style={{ fontSize:'46px', fontWeight:'900', color:'#1a1a1a', textTransform:'uppercase', lineHeight:'0.95', letterSpacing:'-1px' }}>
                              PROTEÇÃO<br/><span style={{ color:'#c0000e' }}>VEICULAR</span>
                            </div>
                            <div style={{ fontSize:'13px', fontWeight:'500', color:'#444', marginTop:'10px', lineHeight:'1.5' }}>
                              Seu veículo seguro,<br/>você tranquilo.
                            </div>
                            <div style={{ width:'48px', height:'3px', background:'#c0000e', marginTop:'10px', borderRadius:'2px' }}/>
                          </div>
                          <div style={{ flex:1, display:'flex', justifyContent:'flex-end', alignItems:'flex-end', padding:'16px 28px 0 0' }}>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:'10px', fontWeight:'700', color:'#c0000e', letterSpacing:'2px', textTransform:'uppercase' }}>Veículo Cotado</div>
                              <div style={{ fontSize:'20px', fontWeight:'900', color:'#1a1a1a', textTransform:'uppercase', lineHeight:1.1, maxWidth:'320px' }}>{modeloNome}</div>
                              <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>Valor FIPE: {formatCurrency(formData.fipe)}</div>
                            </div>
                          </div>
                        </div>

                        {/* ── 3. CARD DADOS DO VEÍCULO ── */}
                        <div style={{ margin:'14px 20px 0', backgroundColor:'#f5f5f5', borderRadius:'12px', padding:'16px 20px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                            <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#fff', border:'2px solid #e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 17H3V12L5.5 6H18.5L21 12V17H19M5 17H19M5 17a2 2 0 1 0 4 0m10 0a2 2 0 1 0-4 0m-6 0h6" stroke="#c0000e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <div>
                              <div style={{ fontSize:'10px', fontWeight:'800', letterSpacing:'2px', color:'#c0000e', textTransform:'uppercase' }}>Dados do Veículo</div>
                              <div style={{ fontSize:'15px', fontWeight:'800', color:'#1a1a1a', textTransform:'uppercase', marginTop:'2px' }}>{modeloNome}</div>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid #ddd', paddingTop:'12px' }}>
                            {[
                              { label:'Ano Modelo', value: anoModelo },
                              { label:'Placa', value: formData.placa !== 'TESTE' ? formData.placa : '—' },
                              { label:'Valor FIPE', value: formatCurrency(formData.fipe) },
                              { label:'Plano', value: planPrice.plans?.nome }
                            ].map((col, ci) => (
                              <div key={ci} style={{ paddingLeft: ci===0?'0':'12px', paddingRight:'12px', borderRight: ci<3?'1px solid #ccc':'none' }}>
                                <div style={{ fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', color:'#999', textTransform:'uppercase' }}>{col.label}</div>
                                <div style={{ fontSize:'14px', fontWeight:'800', color:'#1a1a1a', marginTop:'3px', textTransform:'uppercase' }}>{col.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── 4. CARD COBERTURAS ── */}
                        <div style={{ margin:'12px 20px 0', backgroundColor:'#f5f5f5', borderRadius:'12px', padding:'16px 20px', flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                            <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#fff', border:'2px solid #e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6V12c0 4.97 4.02 9.66 9 10 4.98-.34 9-5.03 9-10V6L12 2Z" stroke="#c0000e" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#c0000e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <div>
                              <div style={{ fontSize:'10px', fontWeight:'800', letterSpacing:'2px', color:'#c0000e', textTransform:'uppercase' }}>Coberturas</div>
                              <div style={{ fontSize:'9px', fontWeight:'500', color:'#888', textTransform:'uppercase', letterSpacing:'1px', marginTop:'2px' }}>Proteção completa para o seu veículo</div>
                            </div>
                          </div>
                          {/* Grid 2 colunas */}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                            {coberturas.map((c: any, i: number) => {
                              const isOdd = i % 2 === 0;
                              const isLast = i >= coberturas.length - 2;
                              return (
                                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding: isOdd ? '8px 14px 8px 0' : '8px 0 8px 14px', borderBottom: isLast ? 'none' : '1px solid #e0e0e0', borderRight: isOdd ? '1px solid #e0e0e0' : 'none' }}>
                                  <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'#c0000e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'1px' }}>
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </div>
                                  <div style={{ fontSize:'9px', fontWeight:'600', color:'#1a1a1a', textTransform:'uppercase', letterSpacing:'0.3px', lineHeight:'1.45' }}>
                                    <strong style={{ fontWeight:'900' }}>{c.label}</strong>{c.param ? `: ${c.param}` : ''}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── PRICING ROW ── */}
                        <div style={{ margin:'12px 20px 0', backgroundColor:'#f0f0f0', borderRadius:'12px', padding:'14px 20px' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.4fr', gap:'0' }}>
                            <div style={{ paddingRight:'12px', borderRight:'1px solid #ddd' }}>
                              <div style={{ fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', color:'#999', textTransform:'uppercase' }}>Taxa de Adesão</div>
                              <div style={{ fontSize:'18px', fontWeight:'900', color:'#1a1a1a', marginTop:'2px' }}>{formatCurrency(adesao)}</div>
                            </div>
                            <div style={{ paddingLeft:'12px', paddingRight:'12px', borderRight:'1px solid #ddd' }}>
                              <div style={{ fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', color:'#999', textTransform:'uppercase' }}>Cota de Participação</div>
                              <div style={{ fontSize:'18px', fontWeight:'900', color:'#1a1a1a', marginTop:'2px' }}>{planPrice.franquia_percentual}%</div>
                            </div>
                            <div style={{ paddingLeft:'12px' }}>
                              <div style={{ fontSize:'8px', fontWeight:'700', letterSpacing:'1.5px', color:'#c0000e', textTransform:'uppercase' }}>Investimento Mensal</div>
                              <div style={{ fontSize:'24px', fontWeight:'900', color:'#1a1a1a', marginTop:'2px', lineHeight:1 }}>
                                {formatCurrency(mensalidade)}<span style={{ fontSize:'12px', color:'#888', fontWeight:'500' }}>/mês</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── 5. FOOTER ── */}
                        <div style={{ backgroundColor:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 28px', marginTop:'14px' }}>
                          <div>
                            <div style={{ fontSize:'11px', fontWeight:'600', letterSpacing:'3px', color:'#aaa', textTransform:'uppercase' }}>Juntos por</div>
                            <div style={{ fontSize:'22px', fontWeight:'900', color:'#fff', textTransform:'uppercase', letterSpacing:'0.5px', lineHeight:'1.05' }}>Mais Conquistas!</div>
                            <div style={{ width:'40px', height:'3px', background:'#c0000e', marginTop:'6px', borderRadius:'2px' }}/>
                          </div>
                          {/* Logo Oficial no Rodapé */}
                          <div>
                            <img
                              src={VIPCAR_LOGO_DARK}
                              alt="Vipcar Brasil"
                              style={{ height: '46px', width: 'auto', display: 'block', objectFit: 'contain' }}
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {/* COMPARISON PAGE – mantida sem alteração */}
                  {availablePlans.length > 1 && (
                      <div className="bg-[#080F1E] text-[#E2E8F0] w-[800px] min-h-[1131px] p-8 font-sans relative overflow-hidden flex flex-col pt-12 shrink-0">
                        <div className="absolute top-[20%] right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] translate-x-1/3"></div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6 shrink-0 relative z-10 w-full">
                          <h2 className="premium-title text-xl uppercase tracking-tighter text-zinc-300">{associationData?.nome ? associationData.nome : 'VIPCAR BRASIL'}</h2>
                          <p className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border flex items-center ${theme.colors.primary}`} style={{ backgroundColor: `${theme.colors.glowHex}1A`, borderColor: `${theme.colors.glowHex}33` }}>
                            <Zap className="w-3 h-3 mr-1.5 inline" /> Comparativo de Planos
                          </p>
                        </div>
                        <p className="text-sm font-medium text-zinc-400 mb-8 shrink-0">
                          Entenda abaixo, de forma transparente, as diferenças exatas entre as coberturas de cada plano oferecido para o <strong className="text-white">{formData.modelo}</strong>.
                        </p>
                        <div className="relative z-10 flex-col flex bg-[#0E1629]/90 rounded-2xl border border-white/5 shadow-[0_0_50px_rgba(255,255,255,0.02)] overflow-hidden w-full max-w-[700px] mx-auto h-auto">
                            <div className={`grid bg-[#080F1E]/80 border-b border-white/5 p-5 shrink-0 ${getPlansWithEdits().length === 2 ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-4`}>
                               <div className="font-black text-zinc-500 uppercase tracking-widest text-[11px] self-end pb-2">Benefício Estrutural</div>
                               {availablePlans.map((plan, i) => (
                                 <div key={i} className="text-center font-black uppercase text-xl border-l border-white/5 pl-4 flex flex-col justify-end">
                                    <span className={`premium-title text-xl uppercase tracking-tighter ${plan.plans?.nome?.toLowerCase().includes('vip') ? `text-transparent bg-clip-text bg-gradient-to-r ${theme.colors.gradientFrom} to-white` : 'text-white'}`}>
                                      {plan.plans?.nome}
                                    </span>
                                    <p className="text-[12px] font-medium text-zinc-400 mt-1">{formatCurrency(plan.mensalidade)}/mês</p>
                                 </div>
                               ))}
                            </div>
                            <div className="p-5 flex flex-col space-y-2.5">
                               {(() => {
                                  const allBenefits = new Map();
                                  const _plans = getPlansWithEdits();
                                  _plans.forEach(p => { (p.plans?.coberturas || []).forEach(c => { allBenefits.set(c.label, true); }); });
                                  return Array.from(allBenefits.keys()).map((benefitLabel, idx) => (
                                     <div key={idx} className={`grid ${getPlansWithEdits().length === 2 ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-4 py-2 border-b border-white/5 items-center bg-white/[0.01] rounded-lg px-3`}>
                                        <div className="text-zinc-300 font-medium text-xs pr-4">{benefitLabel}</div>
                                        {getPlansWithEdits().map((plan, pIdx) => {
                                           const hasBenefit = (plan.plans?.coberturas || []).find(c => c.label === benefitLabel);
                                           return (
                                              <div key={pIdx} className="flex justify-center text-[11px] font-bold text-zinc-400 border-l border-white/5 pl-4 text-center">
                                                 {hasBenefit ? (
                                                    hasBenefit.param ? <span className="text-white font-medium">{hasBenefit.param}</span> : <div className="text-white bg-white/10 px-2.5 py-0.5 rounded-md border border-white/20">INCLUSO</div>
                                                 ) : (
                                                    <span className="text-zinc-600 font-black">—</span>
                                                 )}
                                              </div>
                                           );
                                        })}
                                     </div>
                                  ));
                               })()}
                            </div>
                            <div className="bg-[#080F1E]/80 border-t border-white/5 p-4 text-center">
                               <p className="text-[10px] text-zinc-500 font-medium tracking-wide">
                                  Franquia base de {availablePlans[0]?.franquia_percentual}% para todos os planos padrão listados acima.
                               </p>
                            </div>
                        </div>
                        <div className="text-center text-zinc-600 text-[10px] mt-8 relative z-10 border-t border-indigo-500/10 pt-5 shrink-0 flex-1 flex items-end justify-center pb-4">
                          Resumo comparativo autogerado. Em caso de discrepância, prevalecem as condições gerais regulamentares da Associação.
                        </div>
                      </div>
                  )}
                </div>
              </div>


              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 w-full max-w-md mx-auto mb-6 text-left shrink-0">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                     <div className="h-4 w-1 bg-white rounded-full"></div>
                    <span className="text-white font-black tracking-widest text-sm">PROPOSTA DE PROTEÇÃO</span>
                  </div>
                  <span className="text-zinc-500 text-xs font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>

                <p className="text-xs text-blue-400/80 uppercase font-black tracking-widest mb-1">Veículo Selecionado</p>
                <p className="text-white font-bold mb-4 uppercase">{formData.modelo}</p>
                
                <p className="text-xs text-zinc-500 uppercase font-black tracking-widest mb-3">Opções de Planos</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availablePlans.map((planPrice) => {
                    const isVip = planPrice.plans?.nome?.toLowerCase().includes('vip');
                    return (
                      <div key={planPrice.id} className={`p-4 rounded-xl border ${isVip ? 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(37,99,235,0.15)]' : 'border-white/10 bg-white/5'}`}>
                        <p className={`font-black uppercase mb-1 flex items-center ${isVip ? 'text-blue-400' : 'text-white'}`}>
                          {isVip && <Zap size={14} className="mr-1 inline" />} {planPrice.plans?.nome}
                        </p>
                        <p className="text-xl text-white font-black mb-2">{formatCurrency(getMensalidade(planPrice.id, planPrice.mensalidade))}<span className="text-[10px] font-normal text-zinc-500">/mês</span></p>
                        <div className="space-y-1 mt-2">
                          <p className="text-[11px] text-zinc-400"><span className="text-zinc-500">Franquia:</span> {planPrice.franquia_percentual}%</p>
                          <p className="text-[11px] text-zinc-400"><span className="text-zinc-500">Cobertura:</span> {formatCurrency(planPrice.cobertura_maxima)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md mx-auto shrink-0 mb-6">
                <button onClick={handleNativeShare} disabled={isGeneratingPDF} className={`flex flex-col items-center justify-center bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 py-3 rounded-xl font-bold transition-all group h-20 ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : 'shadow-[0_0_15px_rgba(37,211,102,0.15)]'}`}>
                  {isGeneratingPDF ? <Loader2 className="w-6 h-6 mb-1.5 animate-spin" /> : <Smartphone className="w-6 h-6 mb-1.5" />}
                  <span className="text-[10px] uppercase tracking-wider">WhatsApp</span>
                </button>
                <button onClick={handleNativeShare} disabled={isGeneratingPDF} className={`flex flex-col items-center justify-center bg-white/5 hover:bg-blue-600 hover:border-blue-600 hover:text-white text-zinc-300 border border-white/10 py-3 rounded-xl font-bold transition-all group h-20 ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isGeneratingPDF ? <Loader2 className="w-6 h-6 mb-1.5 animate-spin" /> : <Share2 className="w-6 h-6 mb-1.5 text-zinc-400 group-hover:text-white" />}
                  <span className="text-[10px] uppercase tracking-wider">Compartilhar</span>
                </button>
                <button onClick={() => handleDownloadPDF()} disabled={isGeneratingPDF} className={`flex flex-col items-center justify-center bg-white/5 hover:bg-white hover:text-black hover:border-white text-zinc-300 border border-white/10 py-3 rounded-xl font-bold transition-all group h-20 ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isGeneratingPDF ? <Loader2 className="w-6 h-6 mb-1.5 animate-spin" /> : <Download className="w-6 h-6 mb-1.5 text-zinc-400 group-hover:text-black" />}
                  <span className="text-[10px] uppercase tracking-wider">PDF Direto</span>
                </button>
              </div>

              <button
                onClick={resetFlow}
                className="text-zinc-500 text-[11px] shrink-0 mb-4 font-bold hover:text-white bg-black/40 px-6 py-2 rounded-full border border-white/5 transition-colors uppercase tracking-widest flex items-center space-x-2 mx-auto"
              >
                <span>Nova Cotação</span>
              </button>
              
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuoteGenerator;









