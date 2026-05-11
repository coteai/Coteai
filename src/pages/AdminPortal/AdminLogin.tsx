import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import Logo from '../../components/common/Logo';

const AdminLogin = () => {
  const { login } = useAdminAuth();
  const { associationData, theme } = useAssociation(); // Uses the default or mapped association context theme for the login page design
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accentHex = theme?.colors?.glowHex || '#3B82F6';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, senha);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Successfully logged in, navigate to dashboard
      // Note: In a fully tenant-isolated app, we would reload the AssociationContext using the new admin.id (association_id)
      // Since AssociationContext currently loads based on slug, we just redirect.
      window.location.href = '/'; 
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] blur-[140px] rounded-full" style={{ backgroundColor: `${accentHex}0F` }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] blur-[120px] rounded-full" style={{ backgroundColor: `${accentHex}0A` }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          {/* Top accent line */}
          <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${accentHex}90, transparent)` }} />

          {/* Header */}
          <div className="px-10 pt-12 pb-8 text-center border-b border-white/5">
            <div className="mb-8 flex justify-center">
              <Logo className="scale-150" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight mb-1">
              Portal do Administrador
            </h1>
            <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mt-2">
              Gestão da Associação
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-10 py-8 space-y-5">
            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{error}</span>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                E-mail do Admin
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  required
                  autoComplete="username"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none transition-all font-medium"
                  onFocus={(e) => e.target.style.borderColor = `${accentHex}50`}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="admin-senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-zinc-700 focus:outline-none transition-all font-medium"
                  onFocus={(e) => e.target.style.borderColor = `${accentHex}50`}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 text-sm uppercase tracking-wider text-black"
              style={{
                backgroundColor: accentHex,
                boxShadow: loading ? 'none' : `0 0 30px ${accentHex}60`,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <Shield size={16} className="fill-black" />
                  <span>Acessar Painel</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-700 pt-2">
              Problemas de acesso? Contate o suporte.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
