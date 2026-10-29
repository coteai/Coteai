import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Plus, Settings, Filter, ShieldAlert, Car, User, Clock,
  CheckCircle2, DollarSign, ExternalLink, Copy, Check, ChevronRight,
  RefreshCw, Loader2, Calendar, FileText
} from 'lucide-react';
import { useAssociation } from '../../contexts/AssociationContext';
import type { Evento, EventoEtapaConfig } from '../../types/events';
import { fetchEventos, fetchEtapasConfig } from '../../services/eventsService';
import { EventDetailsModal } from '../../components/events/EventDetailsModal';
import { NewEventModal } from '../../components/events/NewEventModal';
import { EventStagesConfigModal } from '../../components/events/EventStagesConfigModal';

const EventsManager: React.FC = () => {
  const { associationData, theme } = useAssociation();
  const associationId = associationData?.id || '';
  const accentHex = theme?.colors?.glowHex || '#3B82F6';

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [etapas, setEtapas] = useState<EventoEtapaConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [etapaFilter, setEtapaFilter] = useState('all');

  // Modais
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!associationId) return;
    setLoading(true);
    try {
      const [evts, etps] = await Promise.all([
        fetchEventos(associationId, {
          status: statusFilter,
          etapaId: etapaFilter,
          search: search,
        }),
        fetchEtapasConfig(associationId),
      ]);
      setEventos(evts);
      setEtapas(etps);
    } finally {
      setLoading(false);
    }
  }, [associationId, statusFilter, etapaFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/acompanhar/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleEventoUpdated = (updated: Evento) => {
    setEventos((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
    if (selectedEvento?.id === updated.id) {
      setSelectedEvento((prev) => (prev ? { ...prev, ...updated } : null));
    }
  };

  const handleEventCreated = (created: Evento) => {
    setEventos((prev) => [created, ...prev]);
    setSelectedEvento(created);
  };

  // Métricas
  const totalSinistros = eventos.length;
  const emAndamento = eventos.filter((e) => e.status === 'em_andamento').length;
  const concluidos = eventos.filter((e) => e.status === 'concluido').length;
  const totalCustoAprovado = eventos.reduce((acc, e) => acc + (Number(e.valor_total_aprovado) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="premium-title text-2xl md:text-3xl uppercase tracking-tighter text-white flex items-center space-x-3">
            <ShieldAlert size={28} style={{ color: accentHex }} />
            <span>Gestão de Eventos & Sinistros</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Controle de ponta a ponta: vistorias, orçamentos, compras de peças e reparos.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all"
            title="Configurar etapas do fluxo"
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Etapas</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewEventOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg hover:brightness-110 active:scale-95"
            style={{ backgroundColor: accentHex }}
          >
            <Plus size={16} />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Total no Mês</span>
            <FileText size={16} style={{ color: accentHex }} />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">{totalSinistros}</h3>
          <p className="text-[10px] text-zinc-400 mt-1">Sinistros cadastrados</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Em Andamento</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <h3 className="text-2xl font-black text-blue-400 font-mono">{emAndamento}</h3>
          <p className="text-[10px] text-zinc-400 mt-1">Em processo de reparo/peças</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Concluídos</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">{concluidos}</h3>
          <p className="text-[10px] text-zinc-400 mt-1">Veículos entregues</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Custo Aprovado</span>
            <DollarSign size={16} className="text-amber-400" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
            R$ {Number(totalCustoAprovado).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1">Soma dos orçamentos aprovados</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por placa, associado, protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="aberto">Abertos</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluídos</option>
            <option value="cancelado">Cancelados</option>
          </select>

          <select
            value={etapaFilter}
            onChange={(e) => setEtapaFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none max-w-[150px] truncate"
          >
            <option value="all">Todas as Etapas</option>
            {etapas.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-colors"
            title="Recarregar"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Events Table / Cards */}
      <div className="glass-card rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-zinc-400" size={30} style={{ color: accentHex }} />
            <p className="text-xs text-zinc-500">Carregando eventos de sinistro...</p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShieldAlert size={40} className="mx-auto text-zinc-600" />
            <h4 className="text-sm font-bold text-white">Nenhum evento encontrado</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Não há sinistros cadastrados com estes filtros. Clique em "Novo Evento" para registrar uma ocorrência.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto styled-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-white/[0.01]">
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Veículo & Placa</th>
                  <th className="py-3 px-4">Associado</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Etapa Atual</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Custo Aprovado</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
                {eventos.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvento(evt)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Protocolo */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {evt.protocolo}
                      <span className="block text-[10px] font-sans text-zinc-500">
                        {new Date(evt.data_abertura).toLocaleDateString('pt-BR')}
                      </span>
                    </td>

                    {/* Veículo */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white truncate max-w-[180px]">
                        {evt.veiculo?.modelo || 'Não informado'}
                      </p>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {evt.veiculo?.placa || 'Sem placa'}
                      </span>
                    </td>

                    {/* Associado */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-zinc-200 truncate max-w-[160px]">
                        {evt.associado?.nome || 'Não vinculado'}
                      </p>
                      <span className="text-[10px] text-zinc-500">{evt.associado?.cpf_cnpj || '-'}</span>
                    </td>

                    {/* Tipo */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                        {evt.tipo}
                      </span>
                    </td>

                    {/* Etapa Atual */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className="px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center space-x-1"
                        style={{
                          backgroundColor: `${accentHex}15`,
                          borderColor: `${accentHex}40`,
                          color: accentHex,
                        }}
                      >
                        <span>{evt.etapa_atual?.nome || 'Aberto'}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          evt.status === 'concluido'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : evt.status === 'cancelado'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {evt.status === 'em_andamento'
                          ? 'Em Andamento'
                          : evt.status === 'concluido'
                          ? 'Concluído'
                          : evt.status === 'cancelado'
                          ? 'Cancelado'
                          : 'Aberto'}
                      </span>
                    </td>

                    {/* Valor Aprovado */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      {evt.valor_total_aprovado > 0
                        ? `R$ ${Number(evt.valor_total_aprovado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : <span className="text-zinc-600 font-normal">Pendente</span>}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(evt.token_acompanhamento, e)}
                          className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="Copiar link público de acompanhamento"
                        >
                          {copiedToken === evt.token_acompanhamento ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEvento(evt)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-all flex items-center space-x-1 border"
                          style={{
                            backgroundColor: `${accentHex}20`,
                            borderColor: `${accentHex}50`,
                            color: accentHex,
                          }}
                        >
                          <span>Detalhes</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <EventDetailsModal
        evento={selectedEvento}
        isOpen={!!selectedEvento}
        onClose={() => setSelectedEvento(null)}
        accentHex={accentHex}
        onEventoUpdated={handleEventoUpdated}
      />

      <NewEventModal
        isOpen={isNewEventOpen}
        onClose={() => setIsNewEventOpen(false)}
        associationId={associationId}
        accentHex={accentHex}
        onEventCreated={handleEventCreated}
      />

      <EventStagesConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        associationId={associationId}
        accentHex={accentHex}
      />
    </div>
  );
};

export default EventsManager;
