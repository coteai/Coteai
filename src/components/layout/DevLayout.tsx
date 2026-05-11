import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut, Shield, Bell } from 'lucide-react';
import { useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';

const DEV_ACCENT = '#6366f1';

const DevLayout = () => {
  const { superAdmin, logout } = useSuperAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/dev/login');
  };

  const menuItems = [
    { name: 'Visão Geral', icon: <LayoutDashboard size={20} />, path: '/dev' },
    { name: 'Associações', icon: <Building2 size={20} />, path: '/dev/associations' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617]">
      {/* Sidebar */}
      <aside className="w-64 m-4 flex-col justify-between hidden md:flex relative z-20 shrink-0 rounded-3xl overflow-hidden" style={{ background: 'rgba(10,10,30,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(99,102,241,0.15)', boxShadow: `0 0 60px ${DEV_ACCENT}10` }}>
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${DEV_ACCENT}70, transparent)` }} />

        <div>
          {/* Logo/Brand */}
          <div className="p-8 flex items-center space-x-3 border-b" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${DEV_ACCENT}18`, borderColor: `${DEV_ACCENT}40` }}>
              <Shield size={18} style={{ color: DEV_ACCENT }} />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-tight">COTE AI</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${DEV_ACCENT}90` }}>Dev Console</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-6 space-y-1 px-3">
            {menuItems.map((item) => (
              <NavLink key={item.name} to={item.path} end={item.path === '/dev'}>
                {({ isActive }) => (
                  <div
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer border"
                    style={{
                      backgroundColor: isActive ? `${DEV_ACCENT}15` : 'transparent',
                      borderColor: isActive ? `${DEV_ACCENT}35` : 'transparent',
                      color: isActive ? '#fff' : 'rgba(148,163,184,0.7)',
                      boxShadow: isActive ? `0 0 20px ${DEV_ACCENT}20` : 'none',
                    }}
                  >
                    <span style={{ color: isActive ? DEV_ACCENT : 'inherit' }}>{item.icon}</span>
                    <span className="font-semibold text-sm tracking-wide">{item.name}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom user info */}
        <div className="p-6 border-t" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border shrink-0" style={{ backgroundColor: `${DEV_ACCENT}18`, borderColor: `${DEV_ACCENT}40`, color: DEV_ACCENT }}>
              {superAdmin?.nome?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{superAdmin?.nome}</p>
              <p className="text-xs truncate" style={{ color: `${DEV_ACCENT}70` }}>Super Admin</p>
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
        {/* Header */}
        <header className="h-16 mb-4 flex items-center justify-between px-6 md:px-8 rounded-2xl shrink-0 border" style={{ background: 'rgba(10,10,30,0.8)', backdropFilter: 'blur(20px)', borderColor: 'rgba(99,102,241,0.12)' }}>
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Cote AI</h2>
            <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border" style={{ color: DEV_ACCENT, borderColor: `${DEV_ACCENT}40`, backgroundColor: `${DEV_ACCENT}12` }}>
              Developer
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{superAdmin?.nome}</p>
                <p className="text-xs" style={{ color: `${DEV_ACCENT}70` }}>Super Admin</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border shrink-0" style={{ backgroundColor: `${DEV_ACCENT}18`, borderColor: `${DEV_ACCENT}40`, color: DEV_ACCENT }}>
                {superAdmin?.nome?.charAt(0) ?? 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 rounded-2xl overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-transparent pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DevLayout;
