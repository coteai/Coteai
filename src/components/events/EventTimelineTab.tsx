import React, { useState } from 'react';
import { Check, ChevronRight, Clock } from 'lucide-react';
import type { Evento, EventoEtapaConfig, EventoHistorico } from '../../types/events';

interface Props {
  evento: Evento;
  etapas: EventoEtapaConfig[];
  historico: EventoHistorico[];
  accentHex: string;
  readOnly?: boolean;
  onAdvance: (etapaId: string, observacao: string) => Promise<void>;
}

export const EventTimelineTab: React.FC<Props> = ({
  evento,
  etapas,
  historico,
  accentHex,
  readOnly,
  onAdvance,
}) => {
  const [selectedEtapaId, setSelectedEtapaId] = useState(
    evento.etapa_atual_id || (etapas[0] ? etapas[0].id : '')
  );
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdvance = async () => {
    if (!selectedEtapaId) return;
    setLoading(true);
    try {
      await onAdvance(selectedEtapaId, observacao);
      setObservacao('');
    } finally {
      setLoading(false);
    }
  };

  const atualOrdem = evento.etapa_atual?.ordem || 1;

  return (
    <div className="space-y-6">
      {/* Stepper Visual */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-6">
          Fluxo de Etapas do Sinistro
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {etapas.map((et, idx) => {
            const isCurrent = et.id === evento.etapa_atual_id;
            const isPassed = atualOrdem >= et.ordem;
            return (
              <div
                key={et.id}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : isPassed
                    ? 'border-emerald-500/40 bg-emerald-500/5 text-zinc-300'
                    : 'border-white/5 bg-white/[0.01] text-zinc-500'
                }`}
                style={isCurrent ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${
                    isCurrent
                      ? 'bg-white text-black'
                      : isPassed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 text-zinc-500'
                  }`}
                >
                  {isPassed && !isCurrent ? <Check size={14} /> : idx + 1}
                </div>
                <span className="text-[11px] font-bold leading-tight">{et.nome}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avançar Etapa */}
      {!readOnly && (
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
            <ChevronRight size={16} style={{ color: accentHex }} />
            <span>Tramitar / Avançar para Nova Etapa</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Selecionar Etapa:</label>
              <select
                value={selectedEtapaId}
                onChange={(e) => setSelectedEtapaId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {etapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.ordem}. {et.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] text-zinc-400 block mb-1">Observação do Histórico:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ex: Peças conferidas na oficina e veículo desmontado..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleAdvance}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: accentHex }}
                >
                  {loading ? 'Gravando...' : 'Avançar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Cronológico */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Histórico Cronológico de Atualizações
        </h4>
        <div className="space-y-2">
          {historico.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">Nenhum histórico registrado.</p>
          ) : (
            historico.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl border border-white/5 bg-white/[0.015] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-white/5 text-zinc-300 mt-0.5">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {h.etapa?.nome || 'Atualização de Etapa'}{' '}
                      <span className="text-[10px] text-zinc-400 font-normal">por {h.usuario_id || 'Sistema'}</span>
                    </p>
                    {h.observacao && <p className="text-xs text-zinc-300 mt-0.5">{h.observacao}</p>}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                  {new Date(h.criado_em).toLocaleString('pt-BR')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
