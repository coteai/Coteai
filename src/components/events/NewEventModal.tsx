import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Car, User, Calendar, FileText } from 'lucide-react';
import type { Evento, EventoTipo, SgaAssociado, SgaVeiculo } from '../../types/events';
import { fetchSgaAssociados, fetchSgaVeiculos, createEvento } from '../../services/eventsService';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  associationId: string;
  accentHex?: string;
  onEventCreated: (evento: Evento) => void;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  associationId,
  accentHex = '#3B82F6',
  onEventCreated,
}) => {
  const [associados, setAssociados] = useState<SgaAssociado[]>([]);
  const [veiculos, setVeiculos] = useState<SgaVeiculo[]>([]);
  const [loading, setLoading] = useState(false);

  const [associadoId, setAssociadoId] = useState('');
  const [veiculoId, setVeiculoId] = useState('');
  const [tipo, setTipo] = useState<EventoTipo>('colisao');
  const [dataOcorrencia, setDataOcorrencia] = useState(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (isOpen && associationId) {
      loadInitialData();
    }
  }, [isOpen, associationId]);

  const loadInitialData = async () => {
    const assocs = await fetchSgaAssociados(associationId);
    setAssociados(assocs);
    if (assocs.length > 0) {
      setAssociadoId(assocs[0].id);
      const veics = await fetchSgaVeiculos(assocs[0].id);
      setVeiculos(veics);
      if (veics.length > 0) setVeiculoId(veics[0].id);
    }
  };

  const handleAssociadoChange = async (newAssocId: string) => {
    setAssociadoId(newAssocId);
    const veics = await fetchSgaVeiculos(newAssocId);
    setVeiculos(veics);
    if (veics.length > 0) {
      setVeiculoId(veics[0].id);
    } else {
      setVeiculoId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associadoId || !veiculoId || !dataOcorrencia) return;

    setLoading(true);
    try {
      const selectedAssoc = associados.find((a) => a.id === associadoId);
      const created = await createEvento(associationId, {
        associado_id: associadoId,
        veiculo_id: veiculoId,
        consultor_id: selectedAssoc?.consultor_id || undefined,
        tipo,
        data_ocorrencia: dataOcorrencia,
        descricao,
        criado_por: 'Gestor Operações',
      });
      onEventCreated(created);
      onClose();
    } catch (err) {
      console.error('Erro ao abrir sinistro:', err);
    } finally {
      setLoading(false);
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
          className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#0B1120] text-white shadow-2xl overflow-hidden"
          style={{ boxShadow: `0 25px 60px -15px rgba(0,0,0,0.8), 0 0 30px ${accentHex}15` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div
                className="p-2.5 rounded-2xl border"
                style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Abertura de Novo Sinistro / Evento</h3>
                <p className="text-xs text-zinc-400">Cadastre a ocorrência para iniciar o fluxo operacional.</p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs text-zinc-300 font-bold block mb-1.5 flex items-center space-x-1.5">
                <User size={14} style={{ color: accentHex }} />
                <span>Associado *</span>
              </label>
              <select
                required
                value={associadoId}
                onChange={(e) => handleAssociadoChange(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {associados.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} • CPF: {a.cpf_cnpj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-bold block mb-1.5 flex items-center space-x-1.5">
                <Car size={14} style={{ color: accentHex }} />
                <span>Veículo Vinculado *</span>
              </label>
              <select
                required
                value={veiculoId}
                onChange={(e) => setVeiculoId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modelo} • Placa: {v.placa} ({v.ano})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-300 font-bold block mb-1.5">Tipo do Evento *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as EventoTipo)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="colisao">Colisão</option>
                  <option value="vidros">Vidros</option>
                  <option value="roubo_furto">Roubo / Furto</option>
                  <option value="perda_total">Perda Total</option>
                  <option value="alagamento">Alagamento</option>
                  <option value="incendio">Incêndio</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-bold block mb-1.5 flex items-center space-x-1.5">
                  <Calendar size={14} style={{ color: accentHex }} />
                  <span>Data da Ocorrência *</span>
                </label>
                <input
                  type="date"
                  required
                  value={dataOcorrencia}
                  onChange={(e) => setDataOcorrencia(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-bold block mb-1.5 flex items-center space-x-1.5">
                <FileText size={14} style={{ color: accentHex }} />
                <span>Descrição dos Danos & Ocorrência</span>
              </label>
              <textarea
                rows={3}
                placeholder="Descreva como ocorreu o sinistro e os danos visíveis no veículo..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg disabled:opacity-50"
                style={{ backgroundColor: accentHex }}
              >
                {loading ? 'Abrindo Sinistro...' : 'Abrir Sinistro'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
