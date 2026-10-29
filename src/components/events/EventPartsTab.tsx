import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { EventoPeca, PecaStatus } from '../../types/events';

interface Props {
  pecas: EventoPeca[];
  accentHex: string;
  readOnly?: boolean;
  onSavePeca: (peca: Omit<EventoPeca, 'id' | 'criado_em'>) => Promise<void>;
  onUpdateStatus: (pecaId: string, status: PecaStatus) => Promise<void>;
}

export const EventPartsTab: React.FC<Props> = ({
  pecas,
  accentHex,
  readOnly,
  onSavePeca,
  onUpdateStatus,
}) => {
  const [showNovo, setShowNovo] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    descricao: '',
    quantidade: 1,
    fornecedor: '',
    valor_unitario: 0,
    status: 'a_comprar' as PecaStatus,
    previsao_chegada: '',
    observacao: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaPeca.descricao) return;
    await onSavePeca(novaPeca as any);
    setShowNovo(false);
    setNovaPeca({
      descricao: '',
      quantidade: 1,
      fornecedor: '',
      valor_unitario: 0,
      status: 'a_comprar',
      previsao_chegada: '',
      observacao: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Peças Necessárias para Reparo ({pecas.length})
        </h4>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowNovo(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md"
            style={{ backgroundColor: accentHex }}
          >
            <Plus size={14} />
            <span>Adicionar Peça</span>
          </button>
        )}
      </div>

      {/* Form Nova Peça */}
      {showNovo && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-zinc-400 block mb-1">Descrição da Peça *</label>
              <input
                type="text"
                required
                placeholder="Ex: Para-choque dianteiro"
                value={novaPeca.descricao}
                onChange={(e) => setNovaPeca({ ...novaPeca, descricao: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Fornecedor</label>
              <input
                type="text"
                placeholder="Ex: Minas Auto Peças"
                value={novaPeca.fornecedor}
                onChange={(e) => setNovaPeca({ ...novaPeca, fornecedor: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Valor Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={novaPeca.valor_unitario || ''}
                onChange={(e) => setNovaPeca({ ...novaPeca, valor_unitario: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNovo(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: accentHex }}
            >
              Salvar Peça
            </button>
          </div>
        </form>
      )}

      {/* Lista de Peças */}
      <div className="space-y-2">
        {pecas.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma peça cadastrada para este evento.</p>
        ) : (
          pecas.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.015] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">
                  {p.quantidade}x {p.descricao}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Fornecedor: <span className="text-zinc-200">{p.fornecedor || 'A definir'}</span> • R${' '}
                  {Number(p.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} un.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                    p.status === 'recebida'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : p.status === 'a_caminho'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : p.status === 'comprada'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                  }`}
                >
                  {p.status === 'a_comprar'
                    ? 'A Comprar'
                    : p.status === 'comprada'
                    ? 'Comprada'
                    : p.status === 'a_caminho'
                    ? 'A Caminho'
                    : 'Recebida'}
                </span>

                {!readOnly && (
                  <select
                    value={p.status}
                    onChange={(e) => onUpdateStatus(p.id, e.target.value as PecaStatus)}
                    className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
                  >
                    <option value="a_comprar">A Comprar</option>
                    <option value="comprada">Comprada</option>
                    <option value="a_caminho">A Caminho</option>
                    <option value="recebida">Recebida</option>
                  </select>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
