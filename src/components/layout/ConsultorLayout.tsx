import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Zap, LogOut, Bell, Settings, MoreHorizontal, X } from 'lucide-react';
import Logo from '../common/Logo';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';

const ConsultorLayout = () => {
  const { consultor, logout } = useConsultorAuth();
  const { associationData } = useAssociation();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/consultor/login');
  };

  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;
  const accentShadow = theme.colors.shadow;
  const bgClass = theme.colors.bg;

  const sidebarItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/consultor', end: true },
    { name: 'Minhas Vendas', icon: <Briefcase size={20} />, path: '/consultor/vendas' },
    { name: 'Configurações', icon: <Settings size={20} />, path: '/consultor/config' },
  ];

  // 2 items on LEFT of FAB
  const bottomLeft = [
    { name: 'Painel', icon: <LayoutDashboard size={22} />, path: '/consultor', end: true },
    { name: 'Vendas', icon: <Briefcase size={22} />, path: '/consultor/vendas' },
  ];

  // 2 items on RIGHT of FAB
  const bottomRight = [
    { name: 'Config', icon: <Settings size={22} />, path: '/consultor/config' },
    // "More" button replaces 4th slot
  ];

  // Items inside "..." menu
  const moreItems: { name: string; icon: JSX.Element; path: string }[] = [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* ── Sidebar (Desktop) ───────────────────────────────── */}
      <aside className="w-64 m-4 flex-col justify-between hidden md:flex relative z-20 glass-panel rounded-3xl overflow-hidden shrink-0">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accentHex}60, transparent)` }}
        />
        <div>
          <div className="p-8 flex items-center justify-start border-b border-white/5">
            <Logo className="scale-110" />
          </div>
          <div className="px-4 mb-4 mt-4">
            <NavLink
              to="/consultor/cotacao"
              className={({ isActive }) =>
                `group flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-black transition-all ${
                  isActive ? `${bgClass} text-white` : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                }`
              }
              style={location.pathname === '/consultor/cotacao' ? { boxShadow: `0 0 20px ${accentShadow}` } : {}}
            >
              {({ isActive }) => (
                <>
                  <Zap size={18} className={isActive ? 'fill-white text-white' : 'fill-black text-black'} />
                  <span>Nova Cotação</span>
                </>
              )}
            </NavLink>
          </div>
          <nav className="mt-8 space-y-2">
            {sidebarItems.map((item) => (
              <NavLink key={item.name} to={item.path} end={item.end}>
                {({ isActive }) => (
                  <div
                    className={`mx-4 px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 group border ${
                      isActive ? 'bg-white/5 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                    style={isActive ? { borderColor: `${accentHex}33`, boxShadow: `0 0 20px ${accentShadow}` } : {}}
                  >
                    <div className={isActive ? '' : 'text-slate-500 group-hover:text-slate-300'} style={isActive ? { color: accentHex } : {}}>
                      {item.icon}
                    </div>
                    <span className="font-sans font-semibold text-sm tracking-wide">{item.name}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border shrink-0"
              style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
            >
              {consultor?.nome?.charAt(0) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{consultor?.nome}</p>
              <p className="text-xs text-zinc-600 truncate">{consultor?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-zinc-600 hover:text-red-400 transition-all text-xs font-bold uppercase tracking-widest group"
          >
            <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 p-4 md:pl-0">
        {/* Header */}
        <header className="h-14 md:h-16 mb-4 flex items-center justify-between px-4 md:px-8 glass-panel rounded-2xl relative overflow-hidden shrink-0">
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ background: `linear-gradient(to right, ${accentHex}10, transparent, ${accentHex}10)` }}
          />
          <div className="flex items-center space-x-3 relative z-10">
            <Logo className="md:hidden scale-75 origin-left" />
            <div className="hidden md:flex items-center space-x-4">
              <h2 className="text-xl premium-title uppercase">{associationData?.nome || 'Cote AI'}</h2>
              <span
                className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border"
                style={{ color: accentHex, borderColor: `${accentHex}40`, backgroundColor: `${accentHex}12` }}
              >
                Consultor
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3 relative z-10">
            <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[#0E1629]" style={{ backgroundColor: accentHex }} />
            </button>
            <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{consultor?.nome}</p>
                <p className="text-xs text-zinc-500">Consultor</p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border shrink-0"
                style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                {consultor?.nome?.charAt(0) ?? '?'}
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

      {/* ── Mobile Bottom Navigation ────────────────────────── */}
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
            {moreItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-colors"
                style={location.pathname === item.path ? { color: accentHex } : { color: '#94a3b8' }}
              >
                {item.icon}
                <span className="text-sm font-semibold">{item.name}</span>
              </NavLink>
            ))}
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
              className="flex flex-col items-center justify-center py-2 px-3 transition-all flex-1"
              style={({ isActive }) => isActive ? { color: accentHex } : { color: '#71717a' }}
            >
              {item.icon}
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{item.name}</span>
            </NavLink>
          ))}

          {/* CENTER: FAB */}
          <div className="flex flex-col items-center justify-end pb-1 flex-1" style={{ marginTop: '-18px' }}>
            <NavLink
              to="/consultor/cotacao"
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

          {/* RIGHT: Config */}
          {bottomRight.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className="flex flex-col items-center justify-center py-2 px-3 transition-all flex-1"
              style={({ isActive }) => isActive ? { color: accentHex } : { color: '#71717a' }}
            >
              {item.icon}
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">{item.name}</span>
            </NavLink>
          ))}

          {/* RIGHT: More button */}
          <button
            onClick={() => setMoreMenuOpen((v) => !v)}
            className="flex flex-col items-center justify-center py-2 px-3 transition-all flex-1"
            style={{ color: moreMenuOpen ? accentHex : '#71717a' }}
          >
            <MoreHorizontal size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Mais</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ConsultorLayout;
