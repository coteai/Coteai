import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAssociation } from './AssociationContext';

export interface ConsultorSession {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string;
  tema_cor?: string;
  association_id: string;
}

interface ConsultorAuthContextType {
  consultor: ConsultorSession | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ error?: string }>;
  logout: () => void;
  updateTheme: (themeId: string) => Promise<void>;
}

const ConsultorAuthContext = createContext<ConsultorAuthContextType | undefined>(undefined);

const SESSION_KEY = 'consultor_session';

export const ConsultorAuthProvider = ({ children }: { children: ReactNode }) => {
  const [consultor, setConsultor] = useState<ConsultorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshAssociation } = useAssociation();

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setConsultor(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, senha: string): Promise<{ error?: string }> => {
    if (!email.trim() || !senha.trim()) {
      return { error: 'Preencha e-mail e senha.' };
    }

    const { data, error } = await supabase
      .from('consultants')
      .select('id, nome, email, whatsapp, ativo, senha, tema_cor, association_id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !data) {
      return { error: 'E-mail não encontrado.' };
    }

    if (!data.ativo) {
      return { error: 'Acesso bloqueado. Entre em contato com o administrador.' };
    }

    if (data.senha !== senha) {
      return { error: 'Senha incorreta.' };
    }

    const session: ConsultorSession = {
      id: data.id,
      nome: data.nome,
      email: data.email,
      whatsapp: data.whatsapp,
      tema_cor: data.tema_cor,
      association_id: data.association_id,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setConsultor(session);
    await refreshAssociation(data.association_id);
    return {};
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setConsultor(null);
  };

  const updateTheme = async (themeId: string) => {
    if (!consultor) return;
    
    // Update local state and localStorage immediately
    const updatedSession = { ...consultor, tema_cor: themeId };
    setConsultor(updatedSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    
    // Persist to Supabase
    await supabase
      .from('consultants')
      .update({ tema_cor: themeId })
      .eq('id', consultor.id);
  };

  return (
    <ConsultorAuthContext.Provider value={{ consultor, loading, login, logout, updateTheme }}>
      {children}
    </ConsultorAuthContext.Provider>
  );
};

export const useConsultorAuth = () => {
  const context = useContext(ConsultorAuthContext);
  if (!context) throw new Error('useConsultorAuth must be used within ConsultorAuthProvider');
  return context;
};
