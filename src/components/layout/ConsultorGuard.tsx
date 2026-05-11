import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { Loader2 } from 'lucide-react';

const ConsultorGuard = () => {
  const { consultor, loading } = useConsultorAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!consultor) {
    return <Navigate to="/consultor/login" replace />;
  }

  return <Outlet />;
};

export default ConsultorGuard;
