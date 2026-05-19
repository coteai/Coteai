export type ThemeId = 'blue' | 'red' | 'emerald' | 'violet' | 'amber' | 'slate' | 'viptruck';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    primary: string; // Used for text-
    bg: string;      // Used for bg-
    gradientFrom: string; // Used for from-
    border: string;  // Used for border-
    shadow: string;  // Used for shadow-[rgba...]
    glowHex: string; // Used for dynamic hex glows outside Tailwind
  };
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Safira (Azul)',
    colors: {
      primary: 'text-blue-500',
      bg: 'bg-blue-600',
      gradientFrom: 'from-blue-400',
      border: 'border-blue-500/50',
      shadow: 'rgba(59,130,246,0.25)', // Tailwind blue-500
      glowHex: '#3b82f6',
    }
  },
  red: {
    id: 'red',
    name: 'Rubi (Vermelho)',
    colors: {
      primary: 'text-red-500',
      bg: 'bg-red-600',
      gradientFrom: 'from-red-400',
      border: 'border-red-500/50',
      shadow: 'rgba(239,68,68,0.25)', // Tailwind red-500
      glowHex: '#ef4444',
    }
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda (Verde)',
    colors: {
      primary: 'text-emerald-500',
      bg: 'bg-emerald-600',
      gradientFrom: 'from-emerald-400',
      border: 'border-emerald-500/50',
      shadow: 'rgba(16,185,129,0.25)', // Tailwind emerald-500
      glowHex: '#10b981',
    }
  },
  violet: {
    id: 'violet',
    name: 'Ametista (Roxo)',
    colors: {
      primary: 'text-violet-500',
      bg: 'bg-violet-600',
      gradientFrom: 'from-violet-400',
      border: 'border-violet-500/50',
      shadow: 'rgba(139,92,246,0.25)', // Tailwind violet-500
      glowHex: '#8b5cf6',
    }
  },
  amber: {
    id: 'amber',
    name: 'Topázio (Laranja/Ouro)',
    colors: {
      primary: 'text-amber-500',
      bg: 'bg-amber-600',
      gradientFrom: 'from-amber-400',
      border: 'border-amber-500/50',
      shadow: 'rgba(245,158,11,0.25)', // Tailwind amber-500
      glowHex: '#f59e0b',
    }
  },
  slate: {
    id: 'slate',
    name: 'Ônix (Preto/Prata)',
    colors: {
      primary: 'text-slate-400',
      bg: 'bg-slate-700',
      gradientFrom: 'from-slate-300',
      border: 'border-slate-500/50',
      shadow: 'rgba(148,163,184,0.25)', // Tailwind slate-400
      glowHex: '#94a3b8',
    }
  },
  viptruck: {
    id: 'viptruck',
    name: 'Vip Truck (Vermelho)',
    colors: {
      primary: 'text-red-600',
      bg: 'bg-red-600',
      gradientFrom: 'from-red-500',
      border: 'border-red-600/50',
      shadow: 'rgba(255, 0, 0, 0.25)',
      glowHex: '#FF0000',
    }
  }
};

// Hook/helper para não quebrar caso a cor do banco seja inválida
export const getThemeConfig = (themeId?: string | null): ThemeConfig => {
  if (themeId && THEMES[themeId as ThemeId]) {
    return THEMES[themeId as ThemeId];
  }
  return THEMES.blue; // Default se falhar
};
