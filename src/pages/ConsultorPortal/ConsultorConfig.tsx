import React from 'react';
import { motion } from 'framer-motion';
import { Palette, Settings } from 'lucide-react';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { getThemeConfig, THEMES } from '../../utils/themePresets';
import { useAssociation } from '../../contexts/AssociationContext';

const ConsultorConfig = () => {
  const { consultor, updateTheme } = useConsultorAuth();
  const { theme: systemTheme } = useAssociation();
  
  // UI Theme (Standard Admin Blue)
  const accentHex = systemTheme.colors.glowHex;

  // Selected Theme for Quotes
  const selectedThemeConfig = getThemeConfig(consultor?.tema_cor || 'emerald');

  return (
    <div className="space-y-8 max-w-4xl mx-auto md:mx-0 w-full pb-20 md:pb-0">
      {/* Header */}
      <div>
        <p className="premium-label mb-2" style={{ color: accentHex }}>
          Minhas Preferências
        </p>
        <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-1">
          Configurações
        </h1>
        <p className="text-slate-400 text-sm">
          Ajuste a aparência e preferências da sua conta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Customization */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8 flex flex-col border border-white/5 bg-[#121212]"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <Palette size={24} style={{ color: accentHex }} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Cores da Cotação</h3>
              <p className="text-xs text-zinc-500">Escolha o tema visual das suas cotações geradas.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                onClick={() => updateTheme(t.id)}
                className={`flex flex-col items-center p-3 md:p-4 rounded-2xl border transition-all ${
                  selectedThemeConfig.id === t.id ? 'bg-white/5' : 'border-white/5 hover:border-white/20 bg-black/20'
                }`}
                style={selectedThemeConfig.id === t.id ? { borderColor: t.colors.glowHex, boxShadow: `0 0 20px ${t.colors.shadow}` } : {}}
              >
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full mb-2 md:mb-3 shadow-lg" style={{ backgroundColor: t.colors.glowHex }} />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-zinc-300 text-center">{t.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Future Settings Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 md:p-8 flex flex-col border border-white/5 bg-[#121212] opacity-50 grayscale"
        >
           <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <Settings size={24} className="text-zinc-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Perfil</h3>
              <p className="text-xs text-zinc-500">Em breve.</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 min-h-[150px]">
             <p className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-widest text-center">Mais opções disponíveis em atualizações futuras</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConsultorConfig;
