import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, List, Car, TableProperties, Settings, LogOut, Bell, Briefcase, Zap, Users, ListTree, Calculator } from 'lucide-react';
import Logo from '../common/Logo';
import { useAssociation } from '../../contexts/AssociationContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useNavigate } from 'react-router-dom';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { associationData, theme } = useAssociation();
  const { admin, logout } = useAdminAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Vendas', icon: <Briefcase size={20} />, path: '/sales' },
    { name: 'Equipe', icon: <Users size={20} />, path: '/consultants' },
    { name: 'Planos', icon: <ListTree size={20} />, path: '/plans' },
    { name: 'Precificação', icon: <Calculator size={20} />, path: '/pricing' },
    { name: 'Configurações', icon: <Settings size={20} />, path: '/config' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Sidebar */}
      <aside className="w-64 m-4 flex flex-col justify-between hidden md:flex relative z-20 glass-panel rounded-3xl overflow-hidden">
        <div>
          <div className="p-8 flex items-center justify-start border-b border-white/5">
            <Logo className="scale-110" />
          </div>
          
          <div className="px-4 mb-4 mt-4">
            <NavLink 
              to="/quote/new"
              className={({ isActive }) => 
                `group flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-black transition-all ${
                  isActive 
                    ? `${theme.colors.bg} text-white` 
                    : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                }`
              }
              style={location.pathname === '/quote/new' ? { boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}
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
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
              >
                {({ isActive }) => (
                  <div className={`mx-4 px-4 py-3 rounded-xl transition-all duration-300 flex items-center space-x-3 group border ${
                    isActive 
                      ? 'bg-white/5 text-white' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                  }`}
                  style={isActive ? { borderColor: `${theme.colors.glowHex}33`, boxShadow: `0 0 20px ${theme.colors.shadow}` } : {}}>
                    <div className={`${isActive ? theme.colors.primary : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </div>
                    <span className="font-sans font-semibold text-sm tracking-wide">{item.name}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-8">
          <button className="flex items-center space-x-3 text-white/40 hover:text-white/80 transition-all">
            <span className="font-sans uppercase text-[0.65rem] font-medium tracking-[0.14em]">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 p-4 pl-0">
        {/* Top Header */}
        <header className="h-16 mb-4 flex items-center justify-between px-8 glass-panel rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ background: `linear-gradient(to right, ${theme.colors.glowHex}10, transparent, ${theme.colors.glowHex}10)` }} />
          <div className="flex items-center space-x-4 relative z-10">
            <h2 className="text-xl premium-title uppercase">{associationData?.nome || 'Cote AI'}</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[#0E1629]" style={{ backgroundColor: theme.colors.glowHex }}></span>
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{admin?.nome || 'Admin'}</p>
                <p className="text-xs text-zinc-500 truncate max-w-[150px]">{admin?.admin_email}</p>
              </div>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border shrink-0" 
                style={{ backgroundColor: `${theme.colors.glowHex}18`, borderColor: `${theme.colors.glowHex}40`, color: theme.colors.glowHex }}
              >
                {admin?.nome?.charAt(0) || 'A'}
              </div>
              <button 
                onClick={handleLogout}
                className="ml-2 p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 rounded-2xl overflow-y-auto overflow-x-hidden p-8 bg-transparent styled-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;


