import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Zap, LogOut, Bell, Settings } from 'lucide-react';
import Logo from '../common/Logo';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';

const ConsultorLayout = () => {
  const { consultor, logout } = useConsultorAuth();
  const { associationData } = useAssociation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/consultor/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/consultor' },
    { name: 'Minhas Vendas', icon: <Briefcase size={20} />, path: '/consultor/vendas' },
    { name: 'Configurações', icon: <Settings size={20} />, path: '/consultor/config' },
  ];

  // Dynamic theme colors from consultor preferences (defaults to emerald)
  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;
  const accentShadow = theme.colors.shadow;
  const bgClass = theme.colors.bg;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Sidebar (Desktop/Tablet) */}
      <aside className="w-64 m-4 flex-col justify-between hidden md:flex relative z-20 glass-panel rounded-3xl overflow-hidden shrink-0">
        {/* Top glow accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accentHex}60, transparent)` }}
        />

        <div>
          {/* Logo */}
          <div className="p-8 flex items-center justify-start border-b border-white/5">
            <Logo className="scale-110" />
          </div>

          {/* Nova Cotação CTA */}
          <div className="px-4 mb-4 mt-4">
            <NavLink
              to="/consultor/cotacao"
              className={({ isActive }) =>
                `group flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-black transition-all ${
                  isActive
                    ? `${bgClass} text-white`
                    : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                }`
              }
              style={
                location.pathname === '/consultor/cotacao'
                  ? { boxShadow: `0 0 20px ${accentShadow}` }
                  : {}
              }
            >
              {({ isActive }) => (
                <>
                  <Zap
                    size={18}
                    className={isActive ? 'fill-white text-white' : 'fill-black text-black'}
                  />
                  <span>Nova Cotação</span>
                </>
              )}
            </NavLink>
          </div>

          {/* Nav items */}
          <nav className="mt-8 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/consultor'}
              >
                {({ isActive }) => (
                  <div
                    className={`mx-4 px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 group border ${
                      isActive
                        ? 'bg-white/5 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor: `${accentHex}33`,
                            boxShadow: `0 0 20px ${accentShadow}`,
                          }
                        : {}
                    }
                  >
                    <div
                      className={
                        isActive ? '' : 'text-slate-500 group-hover:text-slate-300'
                      }
                      style={isActive ? { color: accentHex } : {}}
                    >
                      {item.icon}
                    </div>
                    <span className="font-sans font-semibold text-sm tracking-wide">
                      {item.name}
                    </span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom — user info + logout */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border shrink-0"
              style={{
                backgroundColor: `${accentHex}18`,
                borderColor: `${accentHex}40`,
                color: accentHex,
              }}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 p-4 md:pl-0">
        {/* Top Header */}
        <header
          className="h-16 mb-4 flex items-center justify-between px-4 md:px-8 glass-panel rounded-2xl relative overflow-hidden shrink-0"
        >
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              background: `linear-gradient(to right, ${accentHex}10, transparent, ${accentHex}10)`,
            }}
          />
          <div className="flex items-center space-x-4 relative z-10">
            <Logo className="md:hidden scale-75 origin-left" />
            <div className="hidden md:flex items-center space-x-4">
              <h2 className="text-xl premium-title uppercase">
                {associationData?.nome || 'Cote AI'}
              </h2>
              <span
                className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border"
                style={{
                  color: accentHex,
                  borderColor: `${accentHex}40`,
                  backgroundColor: `${accentHex}12`,
                }}
              >
                Consultor
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 relative z-10">
            <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
              <Bell size={20} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[#0E1629]"
                style={{ backgroundColor: accentHex }}
              />
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{consultor?.nome}</p>
                <p className="text-xs text-zinc-500">Consultor de Vendas</p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border shrink-0"
                style={{
                  backgroundColor: `${accentHex}18`,
                  borderColor: `${accentHex}40`,
                  color: accentHex,
                }}
              >
                {consultor?.nome?.charAt(0) ?? '?'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 rounded-2xl overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-transparent styled-scrollbar pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/5 z-50 px-6 py-2 pb-safe bg-[#0A0F1C]/95 backdrop-blur-xl">
        <div className="flex justify-between items-end relative h-14">
          {/* Left Items */}
          <NavLink
            to="/consultor"
            end
            className={({ isActive }) => `flex flex-col items-center p-2 transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}
            style={({ isActive }) => isActive ? { color: accentHex } : {}}
          >
            <LayoutDashboard size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Painel</span>
          </NavLink>

          <NavLink
            to="/consultor/vendas"
            className={({ isActive }) => `flex flex-col items-center p-2 mr-6 transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}
            style={({ isActive }) => isActive ? { color: accentHex } : {}}
          >
            <Briefcase size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Vendas</span>
          </NavLink>

          {/* Center Floating Action Button */}
          <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex flex-col items-center">
            <NavLink
              to="/consultor/cotacao"
              className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg border-4 border-[#0B101E] transition-transform active:scale-95"
              style={{ backgroundColor: accentHex, boxShadow: `0 8px 25px ${accentShadow}` }}
            >
              <Zap size={24} className="fill-white" />
            </NavLink>
          </div>

          {/* Right Items */}
          <NavLink
            to="/consultor/config"
            className={({ isActive }) => `flex flex-col items-center p-2 ml-6 transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}
            style={({ isActive }) => isActive ? { color: accentHex } : {}}
          >
            <Settings size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Ajustes</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center p-2 text-zinc-500 active:text-red-400 transition-colors"
          >
            <LogOut size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ConsultorLayout;
