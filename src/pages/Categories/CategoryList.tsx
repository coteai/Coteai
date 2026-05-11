import React from 'react';
import { motion } from 'framer-motion';
import { Plus, GripVertical, MoreHorizontal } from 'lucide-react';

const categories = Array.from({ length: 20 }).map((_, i) => {
  const min = i * 5000 + (i === 0 ? 0 : 1);
  const max = (i + 1) * 5000;
  return { id: i + 1, name: `Faixa de ${i*5}k a ${(i+1)*5}k`, min, max, itemsCount: Math.floor(Math.random() * 500) };
});

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

const CategoryList = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="premium-title text-3xl md:text-4xl uppercase tracking-tighter mb-2">Faixas de Veículo (FIPE)</h1>
          <p className="text-slate-400">Organize os veículos em categorias baseadas no seu valor de mercado.</p>
        </div>
        <button className="premium-button flex items-center space-x-2">
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      <div className="glass-panel p-2">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 text-xs font-black text-zinc-500 uppercase tracking-widest">
          <div className="col-span-1"></div>
          <div className="col-span-3">Nome da Categoria</div>
          <div className="col-span-3">FIPE Mínima</div>
          <div className="col-span-3">FIPE Máxima</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        <div className="space-y-2 mt-2">
          {categories.map((cat, index) => (
            <motion.div 
              key={cat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="group flex flex-col md:grid md:grid-cols-12 gap-4 items-center px-6 py-4 bg-white/[0.02] hover:bg-white/[0.06] rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="col-span-1 flex justify-center w-full md:w-auto text-zinc-600 cursor-grab active:cursor-grabbing">
                <GripVertical size={20} />
              </div>
              <div className="col-span-3 w-full border-b border-white/5 md:border-0 pb-2 md:pb-0 font-bold text-white flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white/500 mr-3 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></span>
                {cat.name}
              </div>
              <div className="col-span-3 w-full flex justify-between md:block font-mono text-cyan-200">
                <span className="md:hidden text-zinc-500 text-sm">Mín: </span>
                {formatCurrency(cat.min)}
              </div>
              <div className="col-span-3 w-full flex justify-between md:block font-mono text-indigo-300">
                <span className="md:hidden text-zinc-500 text-sm">Máx: </span>
                {formatCurrency(cat.max)}
              </div>
              <div className="col-span-2 w-full flex justify-end">
                <button className="p-2 text-zinc-500 hover:text-white bg-black/20 rounded-lg transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryList;


