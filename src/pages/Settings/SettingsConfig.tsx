import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings as SettingsIcon, Palette, Loader2, CheckCircle2 } from 'lucide-react';
import { THEMES, type ThemeId } from '../../utils/themePresets';
import { useAssociation } from '../../contexts/AssociationContext';

const SettingsConfig = () => {
  const { associationData, loading, refreshAssociation } = useAssociation();
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>((associationData?.tema_cor as ThemeId) || 'blue');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (associationData?.tema_cor) {
      setSelectedTheme(associationData.tema_cor as ThemeId);
    }
  }, [associationData]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      if (associationData?.id) {
        const { error } = await supabase
          .from('associations')
          .update({ tema_cor: selectedTheme })
          .eq('id', associationData.id);
        
        if (error) throw error;
        
        await refreshAssociation();
        setSuccessMsg('Configurações visuais salvas com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar tema:', err);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-white w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-2">Configurações Gerais</h1>
          <p className="text-slate-400">Personalize a identidade visual e dados da sua Associação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Identidade Visual Card */}
        <div className="md:col-span-2 glass-card p-8">
          <div className="flex items-center space-x-3 mb-6 border-b border-white/5 pb-4">
             <Palette className="text-white" size={24} />
             <h2 className="premium-title text-xl tracking-tighter uppercase">Identidade Visual (Temas)</h2>
          </div>
          
          <p className="text-zinc-400 text-sm mb-8">
            Escolha um tema padrão para as propostas em PDF e para o funil de cotação. 
            Isso garante que seu material estará adequado as cores da sua Associação <strong className="text-white">{associationData?.nome}</strong>.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
             {Object.values(THEMES).map(theme => (
               <button 
                 key={theme.id}
                 onClick={() => setSelectedTheme(theme.id)}
                 className={`relative flex flex-col p-4 rounded-xl border transition-all text-left ${
                   selectedTheme === theme.id 
                     ? `bg-[${theme.colors.glowHex}]/10 border-[${theme.colors.glowHex}] shadow-[0_0_20px_rgba(255,255,255,0.05)]` 
                     : 'bg-white/5 border-white/10 hover:border-white/30'
                 }`}
                 style={{
                   borderColor: selectedTheme === theme.id ? theme.colors.glowHex : 'rgba(255,255,255,0.1)'
                 }}
               >
                 {selectedTheme === theme.id && (
                   <div className="absolute top-3 right-3 text-white" style={{ color: theme.colors.glowHex }}>
                     <CheckCircle2 size={18} />
                   </div>
                 )}
                 <div className="w-8 h-8 rounded-full mb-3 shadow-lg" style={{ backgroundColor: theme.colors.glowHex }}></div>
                 <span className="font-bold text-white text-sm">{theme.name}</span>
               </button>
             ))}
          </div>

          {successMsg && (
             <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center">
                <CheckCircle2 size={18} className="mr-2" />
                {successMsg}
             </div>
          )}

          <div className="flex justify-end">
             <button
                onClick={handleSave}
                disabled={saving}
                className="premium-button flex items-center space-x-2"
             >
                {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><SettingsIcon size={18} /> <span>Salvar Tema</span></>}
             </button>
          </div>
        </div>

        {/* Info Card Exemplo */}
        <div className="glass-card p-8 flex flex-col h-max">
           <h3 className="premium-label mb-4">Preview do Tema</h3>
           <div className="flex-1 bg-[#0E1629] border border-white/5 rounded-xl p-6 flex flex-col justify-center items-center relative overflow-hidden">
             
             {/* Glow decorativo de fundo pra mostrar o tema */}
             <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" 
                  style={{ backgroundColor: THEMES[selectedTheme].colors.glowHex, opacity: 0.2 }}></div>

             <h4 
               className="premium-title text-2xl uppercase tracking-tighter mb-2 z-10" 
               style={{
                 background: `linear-gradient(to right, ${THEMES[selectedTheme].colors.glowHex}, #fff)`,
                 WebkitBackgroundClip: 'text',
                 WebkitTextFillColor: 'transparent'
               }}>
               {associationData?.nome || 'Sua Associação'}
             </h4>
             <p className="text-xs text-zinc-500 z-10 text-center">Este esquema de cor será aplicado nas cotações e propostas PDF geradas pela equipe.</p>
             
             <div className="mt-8 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white shadow-lg w-full text-center z-10"
                  style={{ backgroundColor: THEMES[selectedTheme].colors.glowHex }}>
               Botão Exemplo
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsConfig;
