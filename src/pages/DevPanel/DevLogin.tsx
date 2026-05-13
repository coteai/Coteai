import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';
import Logo from '../../components/common/Logo';
import InstallAppButton from '../../components/common/InstallAppButton';

const DEV_ACCENT = '#6366f1'; // Indigo

const DevLogin = () => {
  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, senha);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate('/dev');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute right-4 top-4 z-20">
        <InstallAppButton accentColor={DEV_ACCENT} />
      </div>

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] blur-[160px] rounded-full" style={{ background: `radial-gradient(circle, ${DEV_ACCENT}15 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] blur-[120px] rounded-full" style={{ backgroundColor: `${DEV_ACCENT}08` }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.7)]">
          {/* Top accent line */}
          <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${DEV_ACCENT}80, transparent)` }} />

          {/* Header */}
          <div className="px-10 pt-12 pb-8 text-center border-b border-white/5">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <Logo className="scale-150" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight mb-1">
              Dev Console
            </h1>
            <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mt-2">
              Acesso restrito
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-10 py-8 space-y-5">
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
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="dev-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@coteai.com"
                  required
                  autoComplete="username"
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none transition-all font-medium"
                  style={{ '--tw-ring-color': `${DEV_ACCENT}30` } as any}
                  onFocus={(e) => e.target.style.borderColor = `${DEV_ACCENT}50`}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="dev-senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-zinc-700 focus:outline-none transition-all font-medium"
                  onFocus={(e) => e.target.style.borderColor = `${DEV_ACCENT}50`}
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
              id="dev-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 text-sm uppercase tracking-wider text-white border"
              style={{
                backgroundColor: DEV_ACCENT,
                borderColor: `${DEV_ACCENT}60`,
                boxShadow: loading ? 'none' : `0 0 30px ${DEV_ACCENT}40`,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Acessar Painel Dev</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-700 pt-2">
              Cote AI — Sistema Multi-Tenant v1.0
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default DevLogin;
