import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CheckCircle2, ArrowRight, Smartphone, Loader2, AlertCircle, Bike, Truck, Zap, Car, FileText, ListTree, Share2, Download, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAssociation } from '../../contexts/AssociationContext';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { getThemeConfig } from '../../utils/themePresets';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);

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

    // Busca os planos disponíveis para esta faixa FIPE
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
        plano_selecionado: availablePlans.length > 1 ? 'Múltiplas Opções' : availablePlans[0]?.plans?.nome,
        mensalidade: minPrice,
        planos_cotados: availablePlans,
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

    availablePlans.forEach(p => {
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

    if (availablePlans.length > 1) {
      text += `*DIFERENCIAIS ENTRE OS PLANOS:*\n\n`;
      
      availablePlans.forEach(p1 => {
        const isVip = p1.plans?.nome?.toLowerCase().includes('vip');
        const icon = isVip ? '🔴✨' : '🔴';
        
        let diffs = [];
        const myCovs = p1.plans?.coberturas || [];
        
        myCovs.forEach(myC => {
          let isDifferent = false;
          availablePlans.forEach(p2 => {
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
        
        const imgData = await htmlToImage.toPng(pageElement, { backgroundColor: '#080F1E', pixelRatio: 2 });
        
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
      <div className={`relative w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-[var(--color-surface)] ${
        step === num ? 'border-white text-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 
        step > num ? `${theme.colors.border} ${theme.colors.primary}` : 'border-white/10 text-zinc-600'
      }`} style={step > num ? { boxShadow: `0 0 15px ${theme.colors.shadow}` } : {}}>
        <div className={`absolute inset-0 rounded-full ${step === num ? 'bg-white/5' : ''}`} style={step > num ? { backgroundColor: `${theme.colors.glowHex}1A` } : {}}></div>
        <div className="relative z-10">{step > num ? <CheckCircle2 size={18} className={theme.colors.primary} /> : icon}</div>
      </div>
      <span className={`mt-1.5 text-[9px] font-bold uppercase tracking-widest ${
        step === num ? 'text-white' : step > num ? theme.colors.primary : 'text-zinc-600'
      }`}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-8 flex flex-col h-full max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="premium-title text-2xl md:text-4xl uppercase tracking-tighter mb-1">Máquina de Cotação</h1>
          <p className="text-slate-400 text-sm">Gere propostas instantâneas. Precisão FIPE total.</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-4 md:px-8 py-4 md:py-5 relative">
        {/* Progress track */}
        <div className="absolute top-[38px] left-[10%] right-[10%] h-px bg-white/10 z-0"></div>
        <div className="absolute top-[38px] left-[10%] h-px z-0 transition-all duration-500" style={{ backgroundColor: theme.colors.glowHex, width: `${([1,'2b',3,4].indexOf(step)) * (80/3)}%` }}></div>
        <div className="flex justify-between relative z-10">
          {renderStepIcon(1, <Car size={16} />, "Placa")}
          {renderStepIcon(2, <ListTree size={16} />, "Versão")}
          {renderStepIcon(3, <Zap size={16} />, "Preços")}
          {renderStepIcon(4, <FileText size={16} />, "Resumo")}
        </div>
      </div>

      <div className="glass-panel flex-1 flex flex-col overflow-hidden relative min-h-[400px]">
        <AnimatePresence mode="wait">

          {/* STEP 1: PLACA E TIPO */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-5 md:p-12 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full text-center">
              <h2 className="premium-title text-2xl md:text-3xl uppercase tracking-tighter mb-2">Consulta de Veículo</h2>
              <p className="text-zinc-500 text-sm mb-5 md:mb-8">Selecione o tipo e digite a placa.</p>

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

              <div className="flex justify-center w-full max-w-sm mx-auto">
                <button onClick={handleFipeSearch} disabled={formData.placa.length < 7 || loading} className={`w-full flex justify-center items-center py-4 rounded-xl text-white font-black uppercase tracking-widest transition-all ${
                  formData.placa.length >= 7 ? theme.colors.bg : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                }`} style={formData.placa.length >= 7 ? { boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}>
                  {loading ? <Loader2 className="animate-spin" /> : <span>Buscar Variantes FIPE <ArrowRight className="inline-block ml-2 w-4" /></span>}
                </button>
              </div>
              
              {error && (
                <div className="mt-6 flex items-center justify-center space-x-2 text-red-400 text-sm font-medium">
                  <AlertCircle size={16} /> <span>{error}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: VERSÕES FIPE */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 md:p-8 flex-1 flex flex-col max-w-3xl mx-auto w-full">
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
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 md:p-8 flex-1 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <div>
                  <h2 className="premium-title text-xl md:text-3xl uppercase tracking-tighter">Planos Disponíveis</h2>
                  <p className="text-zinc-500 flex flex-wrap items-center mt-1 text-sm">
                    <CheckCircle2 className="text-white mr-2 w-4 shrink-0"/>
                    <span className="font-medium mr-2">{formData.modelo}</span> 
                  <span className="bg-black/40 px-2 py-0.5 rounded text-xs border border-white/5 inline-block mt-1">FIPE: {formatCurrency(formData.fipe)}</span>
                  </p>
                </div>
                <button onClick={() => setStep(2)} className="text-zinc-300 text-sm hover:underline font-bold bg-white/5 px-4 py-2 rounded-lg">Trocar Versão</button>
              </div>

              {/* Mobile: lista compacta (portrait) */}
              <div className="md:hidden space-y-3 mb-4">
                {availablePlans.map((planPrice) => {
                  const isVip = planPrice.plans?.nome?.toLowerCase().includes('vip');
                  return (
                    <div key={planPrice.id} className="relative rounded-2xl overflow-hidden border" style={isVip ? { borderColor: theme.colors.glowHex, boxShadow: `0 0 20px ${theme.colors.shadow}` } : { borderColor: '#27272a' }}>
                      {isVip && <div className="w-full text-center text-white text-[9px] font-black uppercase tracking-widest py-1" style={{ backgroundColor: theme.colors.glowHex }}>⭐ Recomendado</div>}
                      <div className="bg-[#121212] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-base font-black uppercase tracking-wider ${isVip ? theme.colors.primary : 'text-zinc-200'}`}>{planPrice.plans?.nome}</h3>
                          <div className="text-right">
                            <span className="text-xl font-black text-white">{formatCurrency(planPrice.mensalidade)}</span>
                            <span className="text-xs text-zinc-500">/mês</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-black/50 rounded-xl px-3 py-2 mb-2">
                          <div className="text-center">
                            <p className="text-[10px] text-zinc-600 font-bold uppercase">Cota Partic.</p>
                            <p className="text-sm font-black text-white">{planPrice.franquia_percentual}%</p>
                          </div>
                          <div className="w-px h-8 bg-white/10" />
                          <div className="text-center">
                            <p className="text-[10px] text-zinc-600 font-bold uppercase">Cobertura Máx.</p>
                            <p className="text-sm font-black text-white">{formatCurrency(planPrice.cobertura_maxima)}</p>
                          </div>
                        </div>
                        {(planPrice.plans?.coberturas || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(planPrice.plans?.coberturas || []).map((c, i) => (
                              <span key={i} className="text-[10px] text-zinc-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md">
                                {c.label}{c.param ? ` (${c.param})` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: grid de cards */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pb-4 pr-1 min-h-0 items-start content-start">
                {availablePlans.map((planPrice) => {
                  const isVip = planPrice.plans?.nome?.toLowerCase().includes('vip');
                  return (
                    <div key={planPrice.id} className="relative overflow-hidden flex flex-col p-6 rounded-2xl transition-all border border-zinc-800 bg-[#121212] hover:border-zinc-700" style={isVip ? { borderColor: theme.colors.glowHex, boxShadow: `0 0 40px ${theme.colors.shadow}` } : {}}>
                      {isVip && <div className="absolute top-0 left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1 rounded-b-lg z-20" style={{ backgroundColor: theme.colors.glowHex, boxShadow: `0 0 15px ${theme.colors.shadow}` }}>Recomendado</div>}
                      {isVip && <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl z-0" style={{ backgroundColor: `${theme.colors.glowHex}1A` }}></div>}
                      <div className="mb-4 relative z-10 border-b border-white/5 pb-4 mt-4 text-center">
                        <h3 className={`text-2xl font-black uppercase tracking-widest ${isVip ? theme.colors.primary : 'text-zinc-200'}`}>{planPrice.plans?.nome}</h3>
                      </div>
                      <div className="mb-6 relative z-10 text-center">
                        <span className="text-4xl font-black text-white">{formatCurrency(planPrice.mensalidade)}<span className="text-sm text-zinc-500 font-medium">/mês</span></span>
                        <div className="flex flex-col space-y-2 mt-5 bg-black/60 p-4 rounded-xl border border-white/5 text-left">
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
                      <p className="text-[10px] text-zinc-600 font-black tracking-widest uppercase mb-4 text-center">BENEFÍCIOS DO PLANO</p>
                      <ul className="space-y-3 flex-1 text-zinc-300 relative z-10 text-xs font-medium">
                        {(planPrice.plans?.coberturas || []).map((c, i) => (
                          <li key={i} className="flex items-center"><CheckCircle2 className={`w-4 mr-2 shrink-0 ${isVip ? theme.colors.primary : 'text-cyan-500'}`}/> {c.label}{c.param ? `: ${c.param}` : ''}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-6 border-t border-white/10">
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
                     const isVip = planPrice.plans?.nome?.toLowerCase().includes('vip');
                     const isFirst = index === 0;
                     const isLast = index === availablePlans.length - 1;

                     return (
                      <div key={planPrice.id} className="bg-[#080F1E] text-[#E2E8F0] w-[800px] h-[1131px] p-8 font-sans relative overflow-hidden flex flex-col pt-12">
                        {/* Background effects */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
                        {isLast && <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>}

                        {/* HEADERS & VEHICLE INFO (ONLY ON FIRST PAGE) */}
                        {isFirst && (
                          <div className="shrink-0 mb-6">
                            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-6 relative z-10">
                              <div>
                                <h1 className={`premium-title text-4xl uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${isVip ? `${theme.colors.gradientFrom} to-white` : 'from-zinc-100 to-zinc-400'}`}>
                                  {associationData?.nome ? associationData.nome : 'VIPCAR BRASIL'}
                                </h1>
                                <p className="text-zinc-400 mt-1 uppercase tracking-widest text-[12px] font-bold">Proposta de Proteção Veicular</p>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold text-sm ${theme.colors.primary}`}>Data da Cotação</p>
                                <p className="text-zinc-400 text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>

                            <div className="bg-[#0E1629] border border-white/5 rounded-2xl p-6 relative z-10 flex justify-between items-center shadow-[0_0_20px_rgba(37,99,235,0.05)]">
                              <div>
                                <p className={`text-[12px] font-black tracking-widest uppercase mb-1 ${theme.colors.primary}`}>Veículo Selecionado</p>
                                <p className="text-xl font-bold text-white uppercase">{formData.modelo}</p>
                                <div className="flex space-x-4 mt-2 text-sm text-zinc-400">
                                  <span><strong className="text-zinc-300">Placa:</strong> {formData.placa || 'Não informada'}</span>
                                </div>
                              </div>
                              <div className="text-right bg-[#080F1E]/80 border border-white/5 px-6 py-4 rounded-xl">
                                <p className={`text-[12px] font-black tracking-widest uppercase mb-1 ${theme.colors.primary}`}>Valor FIPE</p>
                                <p className="text-3xl font-black text-white">{formatCurrency(formData.fipe)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MINI HEADER FOR CONTINUATION PAGES */}
                        {!isFirst && (
                          <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 shrink-0 relative z-10">
                            <h2 className="premium-title text-xl uppercase tracking-tighter text-zinc-300">{associationData?.nome ? associationData.nome : 'VIPCAR BRASIL'}</h2>
                            <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">Continuação - Opções de Plano</p>
                          </div>
                        )}

                        {/* PLAN DETAILS (Only This Plan) - Content Area */}
                         <div className="relative z-10 flex-1 flex flex-col min-h-0 items-center mt-4">
                             <div className={`pt-10 pb-6 px-10 rounded-3xl w-full max-w-[720px] mx-auto border flex flex-col h-auto max-h-max bg-[#0E1629]/90 shadow-2xl`} style={isVip ? { borderColor: theme.colors.glowHex, backgroundColor: '#0B101E', boxShadow: `0 0 50px ${theme.colors.shadow}` } : { borderColor: 'rgba(255,255,255,0.1)' }}>
                              <div className="shrink-0 text-center mb-8">
                                  {isVip && <div className={`inline-block text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${theme.colors.bg}`} style={{ boxShadow: `0 0 15px ${theme.colors.shadow}` }}>Plano Recomendado</div>}
                                  <h3 className={`premium-title text-4xl uppercase tracking-tighter mb-3 ${isVip ? `text-transparent bg-clip-text bg-gradient-to-r ${theme.colors.gradientFrom} to-white` : 'text-white'}`}>{planPrice.plans?.nome}</h3>
                                  <div className="w-12 h-1 mx-auto rounded-full mb-6" style={{ backgroundColor: theme.colors.glowHex, opacity: 0.5 }}></div>
                                  
                                  <p className="text-[13px] text-zinc-500 font-black tracking-widest uppercase mb-6 text-left border-b border-white/5 pb-2">Benefícios Inclusos</p>
                              </div>
                              
                               <div className="flex-1 pr-2 mb-6">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                                  {(planPrice.plans?.coberturas || []).map((c, i) => (
                                    <div key={i} className="flex items-start text-[14px] text-zinc-300 leading-tight">
                                      <CheckCircle2 className={`w-5 h-5 mr-3 shrink-0 mt-0.5 ${isVip ? theme.colors.primary : 'text-white'}`}/> 
                                      <span className="mt-0.5"><strong className="text-white font-medium">{c.label}</strong>{c.param ? `: ${c.param}` : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                               {/* CLOSING / PRICING CARD AT THE BOTTOM */}
                              <div className="mt-auto space-y-3 p-6 bg-[#080F1E]/60 rounded-3xl border border-white/5 shadow-inner">
                                 <div className="flex justify-between items-center px-4">
                                    <div className="text-left">
                                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Taxa de Adesão</p>
                                      <p className="text-xl font-black text-white">{formatCurrency(planPrice.mensalidade)}</p>
                                    </div>
                                    <div className="h-10 w-px bg-white/5 mx-6"></div>
                                    <div className="text-left">
                                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Cota de Participação</p>
                                      <p className={`text-xl font-black ${isVip ? theme.colors.primary : 'text-white'}`}>{planPrice.franquia_percentual}%</p>
                                    </div>
                                    <div className="flex-1"></div>
                                    <div className="text-right">
                                      <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${theme.colors.primary}`}>Investimento Mensal</p>
                                      <div className="flex items-baseline justify-end space-x-2">
                                        <span className="text-4xl font-black text-white">{formatCurrency(planPrice.mensalidade)}</span>
                                        <span className="text-base text-zinc-500 font-medium">/mês</span>
                                      </div>
                                    </div>
                                 </div>
                              </div>
                            </div>
                        </div>

                        {/* SALES PITCH SECTION (ONLY ON LAST PAGE) */}
                        {isLast && (
                          <div className="mt-6 pt-4 border-t border-indigo-500/20 shrink-0 relative z-10">
                            <h3 className="text-[12px] font-black text-zinc-300 uppercase tracking-widest mb-5">Por que escolher a {associationData?.nome ? associationData.nome.split(' ')[0] : 'Nossa Associação'}?</h3>
                            <div className="grid grid-cols-3 gap-6">
                              <div className="bg-gradient-to-r from-cyan-500/10 to-transparent p-5 rounded-2xl border border-cyan-500/20 flex items-center space-x-4">
                                 <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                   <Smartphone size={24} />
                                 </div>
                                 <div>
                                   <p className="text-base font-black text-white mb-1 leading-tight">Digital 24h</p>
                                   <p className="text-[10px] text-zinc-400 leading-snug">Assistência e guincho direto pelo celular na hora que precisar.</p>
                                 </div>
                              </div>
                              <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-5 rounded-2xl border border-indigo-500/20 flex items-center space-x-4">
                                 <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                   <CheckCircle2 size={24} /> 
                                 </div>
                                 <div>
                                   <p className="text-base font-black text-white mb-1 leading-tight">Zero Burocracia</p>
                                   <p className="text-[10px] text-zinc-400 leading-snug">Sinistros resolvidos com agilidade, sem letrinhas miúdas.</p>
                                 </div>
                              </div>
                              <div className="bg-gradient-to-r from-emerald-500/10 to-transparent p-5 rounded-2xl border border-emerald-500/20 flex items-center space-x-4">
                                 <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                                   <Car size={24} /> 
                                 </div>
                                 <div>
                                   <p className="text-base font-black text-white mb-1 leading-tight">Garantia 100%</p>
                                   <p className="text-[10px] text-zinc-400 leading-snug">Indenização integral assegurada conforme tabela FIPE nacional.</p>
                                 </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="text-center text-zinc-600 text-[11px] mt-6 relative z-10 border-t border-indigo-500/10 pt-4 shrink-0">
                          Proposta gerada através do sistema inteligente Cote.ai. Valores sujeitos a análise de perfil e vistoria do veículo. Validade de 5 dias.
                        </div>
                      </div>
                     );
                  })}

                  {/* COMPARISON PAGE */}
                  {availablePlans.length > 1 && (
                      <div className="bg-[#080F1E] text-[#E2E8F0] w-[800px] min-h-[1131px] p-8 font-sans relative overflow-hidden flex flex-col pt-12 shrink-0">
                        {/* Background effects */}
                        <div className="absolute top-[20%] right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] translate-x-1/3"></div>

                        {/* HEADERS */}
                        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6 shrink-0 relative z-10 w-full">
                          <h2 className="premium-title text-xl uppercase tracking-tighter text-zinc-300">{associationData?.nome ? associationData.nome : 'VIPCAR BRASIL'}</h2>
                          <p className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border flex items-center ${theme.colors.primary}`} style={{ backgroundColor: `${theme.colors.glowHex}1A`, borderColor: `${theme.colors.glowHex}33` }}>
                            <Zap className="w-3 h-3 mr-1.5 inline" /> Comparativo de Planos
                          </p>
                        </div>

                        <p className="text-sm font-medium text-zinc-400 mb-8 shrink-0">
                          Entenda abaixo, de forma transparente, as diferenças exatas entre as coberturas de cada plano oferecido para o <strong className="text-white">{formData.modelo}</strong>.
                        </p>

                        {/* TABLE */}
                        <div className="relative z-10 flex-col flex bg-[#0E1629]/90 rounded-2xl border border-white/5 shadow-[0_0_50px_rgba(255,255,255,0.02)] overflow-hidden w-full max-w-[700px] mx-auto h-auto">
                            <div className={`grid bg-[#080F1E]/80 border-b border-white/5 p-5 shrink-0 ${availablePlans.length === 2 ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-4`}>
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
                                  // Extract all unique benefits
                                  const allBenefits = new Map();
                                  availablePlans.forEach(p => {
                                    (p.plans?.coberturas || []).forEach(c => {
                                       allBenefits.set(c.label, true);
                                    });
                                  });
                                  
                                  return Array.from(allBenefits.keys()).map((benefitLabel, idx) => (
                                     <div key={idx} className={`grid ${availablePlans.length === 2 ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-4 py-2 border-b border-white/5 items-center bg-white/[0.01] rounded-lg px-3`}>
                                        <div className="text-zinc-300 font-medium text-xs pr-4">{benefitLabel}</div>
                                        {availablePlans.map((plan, pIdx) => {
                                           const hasBenefit = (plan.plans?.coberturas || []).find(c => c.label === benefitLabel);
                                           const isVip = plan.plans?.nome?.toLowerCase().includes('vip');
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
                        <p className="text-xl text-white font-black mb-2">{formatCurrency(planPrice.mensalidade)}<span className="text-[10px] font-normal text-zinc-500">/mês</span></p>
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


