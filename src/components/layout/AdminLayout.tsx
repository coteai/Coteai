import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Settings, LogOut, Bell, Briefcase, Zap,
  Users, ListTree, Calculator, MoreHorizontal, X, Sparkles,
  ShieldAlert, TrendingUp
} from 'lucide-react';
import Logo from '../common/Logo';
import InstallAppButton from '../common/InstallAppButton';
import { useAssociation } from '../../contexts/AssociationContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { CoteAiAssistantModal } from '../assistant/CoteAiAssistantModal';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { associationData, theme } = useAssociation();
  const { admin, logout } = useAdminAuth();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const accentHex = theme.colors.glowHex;
  const accentShadow = theme.colors.shadow;
  const bgClass = theme.colors.bg;

  const mainNavItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', end: true },
    { name: 'CRM & Vendas', icon: <Briefcase size={20} />, path: '/sales' },
    { name: 'Eventos', icon: <ShieldAlert size={20} />, path: '/events' },
    { name: 'Indicadores', icon: <TrendingUp size={20} />, path: '/indicators' },
    { name: 'Equipe', icon: <Users size={20} />, path: '/consultants' },
    { name: 'Planos', icon: <ListTree size={20} />, path: '/plans' },
    { name: 'Precificação', icon: <Calculator size={20} />, path: '/pricing' },
    { name: 'Configurações', icon: <Settings size={20} />, path: '/config' },
  ];

  // LEFT of FAB (2 items)
  const bottomLeft = [
    { name: 'Painel', icon: <LayoutDashboard size={22} />, path: '/', end: true },
    { name: 'Vendas', icon: <Briefcase size={22} />, path: '/sales' },
  ];

  // RIGHT of FAB (1 visible + More button = 2 slots)
  const bottomRight = [
    { name: 'Equipe', icon: <Users size={22} />, path: '/consultants' },
  ];

  // Inside "..." menu
  const moreItems = [
    { name: 'Eventos', icon: <ShieldAlert size={18} />, path: '/events' },
    { name: 'Indicadores', icon: <TrendingUp size={18} />, path: '/indicators' },
    { name: 'Planos', icon: <ListTree size={18} />, path: '/plans' },
    { name: 'Precificação', icon: <Calculator size={18} />, path: '/pricing' },
    { name: 'Configurações', icon: <Settings size={18} />, path: '/config' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenAssistant = (e: any) => {
      setAssistantOpen(true);
    };
    window.addEventListener('open-coteai-assistant', handleOpenAssistant);
    return () => window.removeEventListener('open-coteai-assistant', handleOpenAssistant);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* ── Sidebar (Desktop) ─────────────────────────────────── */}
      <aside className="w-64 m-4 flex-col justify-between hidden md:flex relative z-20 glass-panel rounded-3xl overflow-hidden shrink-0">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accentHex}60, transparent)` }}
        />
        <div>
          <div className="p-8 flex items-center justify-start border-b border-white/5">
            <Logo size="lg" />
          </div>
          <div className="px-4 mb-4 mt-4">
            <NavLink
              to="/quote/new"
              className={({ isActive }) =>
                `group flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-black transition-all ${
                  isActive ? `${bgClass} text-white` : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                }`
              }
              style={location.pathname === '/quote/new' ? { boxShadow: `0 0 20px ${accentShadow}` } : {}}
            >
              {({ isActive }) => (
                <>
                  <Zap size={18} className={isActive ? 'fill-white text-white' : 'fill-black text-black'} />
                  <span>Nova Cotação</span>
                </>
              )}
            </NavLink>
          </div>
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)] styled-scrollbar">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    isActive
                      ? 'text-white border'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: `${accentHex}14`,
                        borderColor: `${accentHex}30`,
                        boxShadow: `0 0 20px ${accentShadow}`,
                        color: '#fff',
                      }
                    : {}
                }
              >
                {({ isActive }) => (
                  <>
                    <span style={isActive ? { color: accentHex } : {}}>{item.icon}</span>
                    <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center justify-between p-2 rounded-xl">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border"
                style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                {admin?.nome?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate max-w-[100px]">{admin?.nome || 'Admin'}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Gestor</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main View Area ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-white/5 bg-[#0a0f1d]/50 backdrop-blur-xl shrink-0 z-10 relative">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${accentHex}40, transparent)` }}
          />
          <div className="flex items-center space-x-3 relative z-10">
            <Logo className="md:hidden" size="md" />
            <div className="hidden md:flex items-center space-x-4">
              <h2 className="text-xl premium-title uppercase">{associationData?.nome || 'Cote AI'}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 relative z-10">
            {/* Widget Superior do Assistente */}
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md"
              style={{
                backgroundColor: `${accentHex}18`,
                borderColor: `${accentHex}50`,
                color: accentHex,
              }}
              title="Abrir Cote AI Manager"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span className="font-extrabold text-[11px] sm:text-xs">Cote AI Manager</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                IA
              </span>
            </button>

            <InstallAppButton accentColor={accentHex} />
            <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[#0E1629]" style={{ backgroundColor: accentHex }} />
            </button>
            <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{admin?.nome || 'Admin'}</p>
                <p className="text-xs text-zinc-500 truncate max-w-[130px]">{admin?.admin_email}</p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border shrink-0"
                style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                {admin?.nome?.charAt(0) || 'A'}
              </div>
              <button onClick={handleLogout} className="hidden md:flex ml-1 p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5" title="Sair">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div
          className="flex-1 rounded-2xl overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-transparent styled-scrollbar"
          style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 90px), 100px)' }}
        >
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* More popup */}
        {moreMenuOpen && (
          <div
            ref={moreMenuRef}
            className="absolute bottom-full right-4 mb-2 glass-panel rounded-2xl overflow-hidden border border-white/10 w-52"
            style={{ boxShadow: `0 -8px 40px rgba(0,0,0,0.5)` }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Menu</span>
              <button onClick={() => setMoreMenuOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
            </div>
            {moreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  style={isActive ? { color: accentHex } : { color: '#94a3b8' }}
                >
                  {item.icon}
                  <span className="text-sm font-semibold">{item.name}</span>
                </NavLink>
              );
            })}
            <button
              onClick={() => { handleLogout(); setMoreMenuOpen(false); }}
              className="flex items-center space-x-3 px-4 py-3 text-zinc-500 hover:text-red-400 transition-colors w-full border-t border-white/5"
            >
              <LogOut size={18} />
              <span className="text-sm font-semibold">Sair</span>
            </button>
          </div>
        )}

        {/* Bar */}
        <div
          className="flex items-end justify-around px-2 pt-2"
          style={{
            background: 'rgba(10, 15, 28, 0.97)',
            backdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
          }}
        >
          {/* LEFT: 2 items */}
          {bottomLeft.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              className="flex flex-col items-center justify-center py-2 px-2 transition-all flex-1"
              style={({ isActive }) => isActive ? { color: accentHex } : { color: '#71717a' }}
            >
              {item.icon}
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{item.name}</span>
            </NavLink>
          ))}

          {/* CENTER: FAB */}
          <div className="flex flex-col items-center justify-end pb-1 flex-1" style={{ marginTop: '-18px' }}>
            <NavLink
              to="/quote/new"
              className="flex items-center justify-center w-16 h-16 rounded-full text-white border-4 transition-transform active:scale-90"
              style={{
                backgroundColor: accentHex,
                borderColor: 'rgba(10,15,28,1)',
                boxShadow: `0 4px 24px ${accentShadow}, 0 0 0 1px ${accentHex}30`,
              }}
            >
              <Zap size={26} className="fill-white" />
            </NavLink>
            <span className="text-[9px] font-bold mt-1.5 uppercase tracking-wider" style={{ color: accentHex }}>
              Cotação
            </span>
          </div>

          {/* RIGHT: Equipe */}
          {bottomRight.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className="flex flex-col items-center justify-center py-2 px-2 transition-all flex-1"
              style={({ isActive }) => isActive ? { color: accentHex } : { color: '#71717a' }}
            >
              {item.icon}
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{item.name}</span>
            </NavLink>
          ))}

          {/* More */}
          <button
            onClick={() => setMoreMenuOpen((v) => !v)}
            className="flex flex-col items-center justify-center py-2 px-2 transition-all flex-1"
            style={{
              color: moreMenuOpen || moreItems.some((i) => location.pathname === i.path)
                ? accentHex
                : '#71717a',
            }}
          >
            <MoreHorizontal size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Mais</span>
          </button>
        </div>
      </nav>

      {/* Assistente Flutuante Cote AI Manager */}
      <CoteAiAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        context={{
          role: 'manager',
          associationId: associationData?.id || '',
        }}
        accentHex={accentHex}
      />
    </div>
  );
};

export default AdminLayout;
