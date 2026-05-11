import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAssociation } from './AssociationContext';

export interface AdminSession {
  id: string; // association_id
  nome: string;
  admin_email: string;
  slug: string;
}

interface AdminAuthContextType {
  admin: AdminSession | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const SESSION_KEY = 'admin_session';

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const { associationData } = useAssociation(); // We need this to ensure they are logging into the right association, or we can just log them in globally based on association_id

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setAdmin(JSON.parse(stored));
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

    // Busca a associação por admin_email
    const { data, error } = await supabase
      .from('associations')
      .select('id, nome, slug, admin_email, admin_senha, status')
      .eq('admin_email', email.trim().toLowerCase())
      .single();

    if (error || !data) {
      return { error: 'Administrador não encontrado.' };
    }

    if (data.status !== 'active') {
      return { error: 'Associação suspensa. Contate o suporte.' };
    }

    if (data.admin_senha !== senha) {
      return { error: 'Senha incorreta.' };
    }

    const session: AdminSession = { id: data.id, nome: data.nome, admin_email: data.admin_email, slug: data.slug };
    setAdmin(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return {};
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
};
