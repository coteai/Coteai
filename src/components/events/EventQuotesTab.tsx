import React, { useState } from 'react';
import { Plus, Check, CheckCircle2, Building } from 'lucide-react';
import type { EventoOrcamento } from '../../types/events';

interface Props {
  orcamentos: EventoOrcamento[];
  accentHex: string;
  readOnly?: boolean;
  onSaveOrcamento: (orcamento: Omit<EventoOrcamento, 'id' | 'evento_id' | 'criado_em'>) => Promise<void>;
  onApproveOrcamento: (orcId: string) => Promise<void>;
}

export const EventQuotesTab: React.FC<Props> = ({
  orcamentos,
  accentHex,
  readOnly,
  onSaveOrcamento,
  onApproveOrcamento,
}) => {
  const [showNovo, setShowNovo] = useState(false);
  const [novoOrcamento, setNovoOrcamento] = useState({
    fornecedor_ou_oficina: '',
    tipo: 'completo' as EventoOrcamento['tipo'],
    valor_total: 0,
    prazo_dias: 7,
    observacao: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoOrcamento.fornecedor_ou_oficina || novoOrcamento.valor_total <= 0) return;
    await onSaveOrcamento({ ...novoOrcamento, aprovado: false });
    setShowNovo(false);
    setNovoOrcamento({
      fornecedor_ou_oficina: '',
      tipo: 'completo',
      valor_total: 0,
      prazo_dias: 7,
      observacao: '',
    });
  };

  const menorValor = orcamentos.length > 0 ? Math.min(...orcamentos.map((o) => o.valor_total)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Comparativo de Orçamentos ({orcamentos.length})
          </h4>
          <p className="text-[11px] text-zinc-500">
            O menor valor é destacado automaticamente. Apenas um orçamento pode ser aprovado.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowNovo(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md"
            style={{ backgroundColor: accentHex }}
          >
            <Plus size={14} />
            <span>Novo Orçamento</span>
          </button>
        )}
      </div>

      {/* Form Novo Orçamento */}
      {showNovo && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-zinc-400 block mb-1">Fornecedor ou Oficina *</label>
              <input
                type="text"
                required
                placeholder="Ex: AutoPrime Lanternagem"
                value={novoOrcamento.fornecedor_ou_oficina}
                onChange={(e) => setNovoOrcamento({ ...novoOrcamento, fornecedor_ou_oficina: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={novoOrcamento.valor_total || ''}
                onChange={(e) => setNovoOrcamento({ ...novoOrcamento, valor_total: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Prazo (Dias)</label>
              <input
                type="number"
                value={novoOrcamento.prazo_dias}
                onChange={(e) => setNovoOrcamento({ ...novoOrcamento, prazo_dias: Number(e.target.value) })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Observações da Proposta</label>
            <input
              type="text"
              placeholder="Ex: Inclui alinhamento e peças originais..."
              value={novoOrcamento.observacao}
              onChange={(e) => setNovoOrcamento({ ...novoOrcamento, observacao: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
            />
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
              Salvar Orçamento
            </button>
          </div>
        </form>
      )}

      {/* Cards Comparativos Lado a Lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orcamentos.map((orc) => {
          const isMenorValor = orc.valor_total === menorValor && orcamentos.length > 1;
          return (
            <div
              key={orc.id}
              className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                orc.aprovado
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : isMenorValor
                  ? 'bg-blue-500/5 border-blue-500/30'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              {isMenorValor && !orc.aprovado && (
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-blue-500 text-[9px] font-black uppercase text-white shadow-md">
                  Menor Preço
                </div>
              )}
              {orc.aprovado && (
                <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-black uppercase text-white shadow-md flex items-center space-x-1">
                  <Check size={10} />
                  <span>Aprovado</span>
                </div>
              )}

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Building size={16} className="text-zinc-400" />
                  <h5 className="text-sm font-extrabold text-white truncate" title={orc.fornecedor_ou_oficina}>
                    {orc.fornecedor_ou_oficina}
                  </h5>
                </div>
                <p className="text-2xl font-black font-mono text-white mt-1">
                  R$ {Number(orc.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                  <span>Prazo: {orc.prazo_dias ? `${orc.prazo_dias} dias` : 'A combinar'}</span>
                  <span className="uppercase text-[10px]">{orc.tipo}</span>
                </div>
                {orc.observacao && (
                  <p className="text-xs text-zinc-300 mt-3 p-2.5 rounded-xl bg-black/30 border border-white/5 italic">
                    "{orc.observacao}"
                  </p>
                )}
              </div>

              {!readOnly && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  {orc.aprovado ? (
                    <div className="text-center py-2 text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1">
                      <CheckCircle2 size={16} />
                      <span>Orçamento Vigente</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApproveOrcamento(orc.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110 shadow-md border"
                      style={{
                        backgroundColor: `${accentHex}20`,
                        borderColor: `${accentHex}50`,
                        color: accentHex,
                      }}
                    >
                      Aprovar Este Orçamento
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
