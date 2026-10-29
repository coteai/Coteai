import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, MessageSquare, Check, Loader2 } from 'lucide-react';
import type { EventoEtapaConfig } from '../../types/events';
import { fetchEtapasConfig, updateEtapaConfig } from '../../services/eventsService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  associationId: string;
  accentHex?: string;
}

export const EventStagesConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  associationId,
  accentHex = '#3B82F6',
}) => {
  const [etapas, setEtapas] = useState<EventoEtapaConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && associationId) {
      loadEtapas();
    }
  }, [isOpen, associationId]);

  const loadEtapas = async () => {
    setLoading(true);
    try {
      const data = await fetchEtapasConfig(associationId);
      setEtapas(data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWhatsapp = async (etapa: EventoEtapaConfig) => {
    setSavingId(etapa.id);
    const novoValor = !etapa.notificar_whatsapp;
    try {
      await updateEtapaConfig(etapa.id, { notificar_whatsapp: novoValor });
      setEtapas((prev) =>
        prev.map((e) => (e.id === etapa.id ? { ...e, notificar_whatsapp: novoValor } : e))
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleAtiva = async (etapa: EventoEtapaConfig) => {
    setSavingId(etapa.id);
    const novoValor = !etapa.ativa;
    try {
      await updateEtapaConfig(etapa.id, { ativa: novoValor });
      setEtapas((prev) =>
        prev.map((e) => (e.id === etapa.id ? { ...e, ativa: novoValor } : e))
      );
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0B1120] text-white shadow-2xl overflow-hidden"
          style={{ boxShadow: `0 25px 60px -15px rgba(0,0,0,0.8), 0 0 30px ${accentHex}15` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div
                className="p-2.5 rounded-2xl border"
                style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Configuração de Etapas de Sinistro</h3>
                <p className="text-xs text-zinc-400">
                  Gerencie a ordem, visibilidade e gatilhos de aviso pelo WhatsApp.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto styled-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="animate-spin text-zinc-400" size={24} />
              </div>
            ) : (
              etapas.map((et) => (
                <div
                  key={et.id}
                  className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs border"
                      style={{ backgroundColor: `${accentHex}15`, borderColor: `${accentHex}30`, color: accentHex }}
                    >
                      {et.ordem}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{et.nome}</p>
                      <p className="text-[10px] text-zinc-400">Etapa padrão do fluxo Cote AI</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Toggle WhatsApp */}
                    <button
                      type="button"
                      disabled={savingId === et.id}
                      onClick={() => handleToggleWhatsapp(et)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        et.notificar_whatsapp
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="Disparar aviso no WhatsApp ao mudar para esta etapa"
                    >
                      <MessageSquare size={13} />
                      <span className="text-[11px] font-bold">
                        {et.notificar_whatsapp ? 'WhatsApp Ativo' : 'Sem WhatsApp'}
                      </span>
                    </button>

                    {/* Toggle Ativa */}
                    <button
                      type="button"
                      disabled={savingId === et.id}
                      onClick={() => handleToggleAtiva(et)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        et.ativa
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-zinc-800 border-white/5 text-zinc-500'
                      }`}
                    >
                      {et.ativa ? 'Ativa' : 'Oculta'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.01] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md"
              style={{ backgroundColor: accentHex }}
            >
              Concluir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
