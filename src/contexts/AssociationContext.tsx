import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { THEMES, getThemeConfig, type ThemeConfig } from '../utils/themePresets';

interface AssociationData {
  id: string;
  nome: string;
  slug: string;
  tema_cor: string | null;
  [key: string]: any;
}

interface AssociationContextType {
  associationData: AssociationData | null;
  theme: ThemeConfig;
  proposalTheme: ThemeConfig;
  loading: boolean;
  refreshAssociation: (id?: string) => Promise<void>;
}

const AssociationContext = createContext<AssociationContextType | undefined>(undefined);

export const AssociationProvider = ({ children }: { children: ReactNode }) => {
  const [associationData, setAssociationData] = useState<AssociationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAssociation = async (overrideId?: string) => {
    try {
      let loggedInAssocId = overrideId;
      if (!loggedInAssocId) {
        try {
          const adminSession = localStorage.getItem('admin_session');
          if (adminSession) {
            loggedInAssocId = JSON.parse(adminSession).id;
          } else {
            const consultorSession = localStorage.getItem('consultor_session');
            if (consultorSession) {
              loggedInAssocId = JSON.parse(consultorSession).association_id;
            }
          }
        } catch (e) {}
      }

      let query = supabase.from('associations').select('*');
      if (loggedInAssocId) {
        query = query.eq('id', loggedInAssocId);
      } else {
        const defaultSlug = import.meta.env.VITE_DEFAULT_ASSOCIATION_SLUG || 'protemax';
        query = query.eq('slug', defaultSlug);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      if (data) {
        setAssociationData(data);
      }
    } catch (err) {
      console.error('Error fetching association context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociation();
  }, []);

  const proposalTheme = getThemeConfig(associationData?.tema_cor);
  const theme = THEMES.blue;

  // Fixar o tema do sistema sempre em Azul (padrão) para o dashboard, 
  // enquanto exportamos o 'theme' selecionado para ser usado apenas na proposta.
  useEffect(() => {
    // Valores fixos do tema Azul (Safira) para evitar qualquer problema de importação circular ou estado (TELA AZUL)
    const glowHex = '#3b82f6';
    const shadow = 'rgba(59,130,246,0.25)';

    try {
      const root = document.documentElement;
      if (root && root.style) {
        root.style.setProperty('--color-primary-theme', glowHex);
        root.style.setProperty('--color-shadow-theme', shadow);
        
        // Criar versões com opacidade para o background e glows
        root.style.setProperty('--color-glow-low', `${glowHex}1A`);
        root.style.setProperty('--color-glow-mid', `${glowHex}33`);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <AssociationContext.Provider 
      value={{ 
        associationData, 
        theme, 
        proposalTheme,
        loading, 
        refreshAssociation: fetchAssociation 
      }}
    >
      {children}
    </AssociationContext.Provider>
  );
};

export const useAssociation = () => {
  const context = useContext(AssociationContext);
  if (context === undefined) {
    throw new Error('useAssociation must be used within an AssociationProvider');
  }
  return context;
};
