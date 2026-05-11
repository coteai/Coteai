import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Bike, Truck, ChevronDown, FolderPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PlansManager from '../Pricing/PlansManager';

const PlansList = () => {
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [vehicleGroups, setVehicleGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 size={32} className="animate-spin text-zinc-300" /></div>;
  }

  const activeGroup = vehicleGroups.find(g => g.id === activeGroupId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-2">Planos de Proteção</h1>
          <p className="text-slate-400">Configure os pacotes de benefícios por grupo de veículos.</p>
        </div>
        
        {vehicleGroups.length > 0 && (
          <div className="relative group/dropdown">
            <button className="flex items-center space-x-3 px-5 py-3 bg-black/40 border border-white/10 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] text-white font-bold hover:bg-white/5 transition-all">
              {activeGroup?.base_type === 'carro' ? <Car size={18} className="text-zinc-300" /> : 
               activeGroup?.base_type === 'moto' ? <Bike size={18} className="text-zinc-300" /> : 
               <Truck size={18} className="text-zinc-300" />}
              <span>{activeGroup?.nome || 'Selecione um Grupo'}</span>
              <ChevronDown size={14} className="text-zinc-500 ml-2" />
            </button>
            
            <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-50">
              {vehicleGroups.map(g => (
                <button key={g.id} onClick={() => setActiveGroupId(g.id)} className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-white/5 transition-colors ${activeGroupId === g.id ? 'bg-white/10 text-zinc-300 font-bold border-l-2 border-white/30' : 'text-zinc-300 border-l-2 border-transparent'}`}>
                  {g.base_type === 'carro' ? <Car size={16} /> : g.base_type === 'moto' ? <Bike size={16} /> : <Truck size={16} />}
                  <span>{g.nome}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!activeGroupId ? (
        <div className="glass-panel p-16 text-center">
          <FolderPlus size={48} className="text-zinc-600 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Nenhum Grupo de Veículos Criado</h3>
          <p className="text-zinc-500 mb-6">Crie um grupo de veículos primeiro na tela de Precificação.</p>
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
