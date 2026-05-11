import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Loader2 } from 'lucide-react';

const AdminGuard = () => {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="animate-spin text-blue-400 w-10 h-10" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default AdminGuard;
