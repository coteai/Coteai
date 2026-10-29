import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ShieldAlert, FileText, Clock, Wrench, DollarSign, Image as ImageIcon } from 'lucide-react';
import type {
  Evento,
  EventoEtapaConfig,
  EventoOrcamento,
  EventoPeca,
  EventoHistorico,
  EventoArquivo,
  EventoStatus,
  PecaStatus,
} from '../../types/events';
import {
  fetchEtapasConfig,
  advanceEventoEtapa,
  updateEventoStatus,
  fetchOrcamentos,
  saveOrcamento,
  approveOrcamento,
  fetchPecas,
  savePeca,
  updatePecaStatus,
  fetchEventoHistorico,
  fetchArquivos,
  uploadArquivo,
} from '../../services/eventsService';
import { EventOverviewTab } from './EventOverviewTab';
import { EventTimelineTab } from './EventTimelineTab';
import { EventPartsTab } from './EventPartsTab';
import { EventQuotesTab } from './EventQuotesTab';
import { EventFilesTab } from './EventFilesTab';

interface EventDetailsModalProps {
  evento: Evento | null;
  isOpen: boolean;
  onClose: () => void;
  accentHex?: string;
  onEventoUpdated: (evento: Evento) => void;
  readOnly?: boolean;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  evento,
  isOpen,
  onClose,
  accentHex = '#3B82F6',
  onEventoUpdated,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'etapas' | 'pecas' | 'orcamentos' | 'arquivos'>('resumo');
  const [etapas, setEtapas] = useState<EventoEtapaConfig[]>([]);
  const [orcamentos, setOrcamentos] = useState<EventoOrcamento[]>([]);
  const [pecas, setPecas] = useState<EventoPeca[]>([]);
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [arquivos, setArquivos] = useState<EventoArquivo[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (evento && isOpen) {
      loadDetails(evento.id, evento.associacao_id);
    }
  }, [evento, isOpen]);

  const loadDetails = async (eventoId: string, assocId: string) => {
    const [etps, orcs, pcs, hst, arqs] = await Promise.all([
      fetchEtapasConfig(assocId),
      fetchOrcamentos(eventoId),
      fetchPecas(eventoId),
      fetchEventoHistorico(eventoId),
      fetchArquivos(eventoId),
    ]);
    setEtapas(etps);
    setOrcamentos(orcs);
    setPecas(pcs);
    setHistorico(hst);
    setArquivos(arqs);
  };

  if (!isOpen || !evento) return null;

  const publicUrl = `${window.location.origin}/acompanhar/${evento.token_acompanhamento}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleStatusChange = async (novoStatus: EventoStatus) => {
    await updateEventoStatus(evento.id, novoStatus);
    const updated = { ...evento, status: novoStatus };
    onEventoUpdated(updated);
  };

  const handleAdvanceEtapa = async (etapaId: string, obs: string) => {
    await advanceEventoEtapa(evento.id, etapaId, obs, 'Gestor Cote AI');
    const etapaObj = etapas.find((e) => e.id === etapaId);
    const updated = { ...evento, etapa_atual_id: etapaId, etapa_atual: etapaObj || evento.etapa_atual };
    onEventoUpdated(updated);
    loadDetails(evento.id, evento.associacao_id);
  };

  const handleSaveOrcamento = async (orc: Omit<EventoOrcamento, 'id' | 'evento_id' | 'criado_em'>) => {
    const created = await saveOrcamento({ evento_id: evento.id, ...orc });
    setOrcamentos((prev) => [...prev, created]);
  };

  const handleApproveOrcamento = async (orcId: string) => {
    await approveOrcamento(evento.id, orcId, 'Gestor Cote AI');
    const updatedOrcs = orcamentos.map((o) => ({
      ...o,
      aprovado: o.id === orcId,
      aprovado_por: o.id === orcId ? 'Gestor Cote AI' : null,
      aprovado_em: o.id === orcId ? new Date().toISOString() : null,
    }));
    setOrcamentos(updatedOrcs);
    const target = updatedOrcs.find((o) => o.id === orcId);
    if (target) {
      onEventoUpdated({ ...evento, valor_total_aprovado: target.valor_total });
    }
  };

  const handleSavePeca = async (p: Omit<EventoPeca, 'id' | 'criado_em'>) => {
    const created = await savePeca({ evento_id: evento.id, ...p });
    setPecas((prev) => [...prev, created]);
  };

  const handleUpdatePecaStatus = async (pecaId: string, status: PecaStatus) => {
    await updatePecaStatus(pecaId, status);
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, status } : p)));
  };

  const handleUploadArquivo = async (arq: { nome: string; tipo: EventoArquivo['tipo'] }) => {
    const created = await uploadArquivo(evento.id, { ...arq, enviado_por: 'Gestor Operações' });
    setArquivos((prev) => [created, ...prev]);
  };

  const tabs = [
    { id: 'resumo', label: 'Resumo', icon: <FileText size={16} /> },
    { id: 'etapas', label: 'Etapas & Linha do Tempo', icon: <Clock size={16} /> },
    { id: 'pecas', label: `Peças (${pecas.length})`, icon: <Wrench size={16} /> },
    { id: 'orcamentos', label: `Orçamentos (${orcamentos.length})`, icon: <DollarSign size={16} /> },
    { id: 'arquivos', label: `Arquivos (${arquivos.length})`, icon: <ImageIcon size={16} /> },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-[#0B1120] text-white shadow-2xl overflow-hidden"
          style={{ boxShadow: `0 25px 60px -15px rgba(0,0,0,0.8), 0 0 30px ${accentHex}15` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div
                className="p-2.5 rounded-2xl border"
                style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                    {evento.protocolo}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      evento.status === 'concluido'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : evento.status === 'cancelado'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    {evento.status === 'em_andamento'
                      ? 'Em Andamento'
                      : evento.status === 'concluido'
                      ? 'Concluído'
                      : evento.status === 'cancelado'
                      ? 'Cancelado'
                      : 'Aberto'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {evento.tipo.toUpperCase()} • Ocorrência em{' '}
                  {new Date(evento.data_ocorrencia).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                title="Copiar link público de acompanhamento"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedLink ? 'Copiado!' : 'Link Público'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center space-x-2 px-6 pt-3 border-b border-white/5 overflow-x-auto styled-scrollbar bg-black/20">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-white text-white bg-white/5'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={isActive ? { borderColor: accentHex, color: accentHex } : {}}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo das Abas */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 styled-scrollbar">
            {activeTab === 'resumo' && (
              <EventOverviewTab
                evento={evento}
                accentHex={accentHex}
                readOnly={readOnly}
                onStatusChange={handleStatusChange}
              />
            )}
            {activeTab === 'etapas' && (
              <EventTimelineTab
                evento={evento}
                etapas={etapas}
                historico={historico}
                accentHex={accentHex}
                readOnly={readOnly}
                onAdvance={handleAdvanceEtapa}
              />
            )}
            {activeTab === 'pecas' && (
              <EventPartsTab
                pecas={pecas}
                accentHex={accentHex}
                readOnly={readOnly}
                onSavePeca={handleSavePeca}
                onUpdateStatus={handleUpdatePecaStatus}
              />
            )}
            {activeTab === 'orcamentos' && (
              <EventQuotesTab
                orcamentos={orcamentos}
                accentHex={accentHex}
                readOnly={readOnly}
                onSaveOrcamento={handleSaveOrcamento}
                onApproveOrcamento={handleApproveOrcamento}
              />
            )}
            {activeTab === 'arquivos' && (
              <EventFilesTab
                arquivos={arquivos}
                accentHex={accentHex}
                readOnly={readOnly}
                onUpload={handleUploadArquivo}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
