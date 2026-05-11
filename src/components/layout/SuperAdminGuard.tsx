import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';
import { Loader2 } from 'lucide-react';

const SuperAdminGuard = () => {
  const { superAdmin, loading } = useSuperAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="animate-spin text-blue-400 w-10 h-10" />
      </div>
    );
  }

  if (!superAdmin) {
    return <Navigate to="/dev/login" replace />;
  }

  return <Outlet />;
};

export default SuperAdminGuard;
