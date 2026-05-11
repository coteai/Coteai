import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Car, Bike, Truck, ChevronDown, FolderPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PlansManager from '../Pricing/PlansManager';

const PlansList = () => {
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [vehicleGroups, setVehicleGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const defaultSlug = import.meta.env.VITE_DEFAULT_ASSOCIATION_SLUG || 'protemax';
      const { data: assoc } = await supabase.from('associations').select('id').eq('slug', defaultSlug).single();
      if (assoc) {
        setAssociationId(assoc.id);
        const { data: groups } = await supabase.from('vehicle_groups').select('*').eq('association_id', assoc.id).order('ordem');
        if (groups && groups.length > 0) {
          setVehicleGroups(groups);
          setActiveGroupId(groups[0].id);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 size={32} className="animate-spin text-zinc-300" /></div>;
  }

  const activeGroup = vehicleGroups.find(g => g.id === activeGroupId);

  const getIcon = (type: string, size = 18) => {
    if (type === 'moto') return <Bike size={size} className="text-zinc-300" />;
    if (type === 'caminhao') return <Truck size={size} className="text-zinc-300" />;
    return <Car size={size} className="text-zinc-300" />;
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="premium-title text-2xl md:text-4xl uppercase tracking-tighter mb-1">Planos de Proteção</h1>
          <p className="text-slate-400 text-sm">Configure os pacotes de benefícios por grupo de veículos.</p>
        </div>

        {vehicleGroups.length > 0 && (
          <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center space-x-3 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-bold hover:bg-white/5 transition-all w-full sm:w-auto justify-between sm:justify-start"
            >
              {getIcon(activeGroup?.base_type)}
              <span className="flex-1 sm:flex-none text-left">{activeGroup?.nome || 'Selecione um Grupo'}</span>
              <ChevronDown size={14} className={`text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-full sm:w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                {vehicleGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { setActiveGroupId(g.id); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-white/5 transition-colors border-l-2 ${
                      activeGroupId === g.id ? 'bg-white/10 text-white font-bold border-white/30' : 'text-zinc-300 border-transparent'
                    }`}
                  >
                    {getIcon(g.base_type, 16)}
                    <span>{g.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!activeGroupId ? (
        <div className="glass-panel p-12 text-center">
          <FolderPlus size={40} className="text-zinc-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-1">Nenhum Grupo de Veículos Criado</h3>
          <p className="text-zinc-500 text-sm">Crie um grupo de veículos primeiro na tela de Precificação.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {associationId && (
            <PlansManager
              associationId={associationId}
              groupId={activeGroupId}
              baseType={activeGroup?.base_type}
            />
          )}
        </motion.div>
      )}
    </div>
  );
};

export default PlansList;
