import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import Logo from '../../components/common/Logo';

const ConsultorLogin = () => {
  const { login } = useConsultorAuth();
  const { associationData } = useAssociation();
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
      navigate('/consultor');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-emerald-600/5 blur-[120px] rounded-full" />
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
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          {/* Header */}
          <div className="px-10 pt-12 pb-8 text-center border-b border-white/5">
            <div className="mb-8 flex justify-center">
              <Logo className="scale-150" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight mb-1">
              Portal do Consultor
            </h1>
            <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mt-2">
              {associationData?.nome || 'Cote AI'} — Área Restrita
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
                E-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="consultor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="username"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_0_1px_rgba(16,185,129,0.2)] transition-all font-medium"
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
                  id="consultor-senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_0_1px_rgba(16,185,129,0.2)] transition-all font-medium"
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
              id="consultor-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/40 text-black font-black rounded-xl transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-[0.98] flex items-center justify-center space-x-2 mt-2 text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Zap size={16} className="fill-black" />
                  <span>Entrar no Portal</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-zinc-700 pt-2">
              Problemas de acesso? Fale com o administrador.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ConsultorLogin;
