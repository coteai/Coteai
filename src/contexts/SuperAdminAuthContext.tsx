import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface SuperAdminSession {
  id: string;
  nome: string;
  email: string;
}

interface SuperAdminAuthContextType {
  superAdmin: SuperAdminSession | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

const SESSION_KEY = 'super_admin_session';

export const SuperAdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [superAdmin, setSuperAdmin] = useState<SuperAdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setSuperAdmin(JSON.parse(stored));
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
      .from('super_admins')
      .select('id, nome, email, senha')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !data) {
      return { error: 'E-mail não encontrado.' };
    }

    if (data.senha !== senha) {
      return { error: 'Senha incorreta.' };
    }

    const session: SuperAdminSession = { id: data.id, nome: data.nome, email: data.email };
    setSuperAdmin(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return {};
  };

  const logout = () => {
    setSuperAdmin(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <SuperAdminAuthContext.Provider value={{ superAdmin, loading, login, logout }}>
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (!context) throw new Error('useSuperAdminAuth must be used within SuperAdminAuthProvider');
  return context;
};
