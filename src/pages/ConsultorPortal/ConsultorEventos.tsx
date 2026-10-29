import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Search, RefreshCw, Loader2, ChevronRight,
  Clock, Car, User, FileText, CheckCircle2
} from 'lucide-react';
import { useConsultorAuth } from '../../contexts/ConsultorAuthContext';
import { useAssociation } from '../../contexts/AssociationContext';
import { getThemeConfig } from '../../utils/themePresets';
import type { Evento } from '../../types/events';
import { fetchEventos } from '../../services/eventsService';
import { EventDetailsModal } from '../../components/events/EventDetailsModal';

const ConsultorEventos: React.FC = () => {
  const { consultor } = useConsultorAuth();
  const { associationData } = useAssociation();
  const theme = getThemeConfig(consultor?.tema_cor || 'emerald');
  const accentHex = theme.colors.glowHex;

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);

  const loadData = useCallback(async () => {
    if (!associationData?.id) return;
    setLoading(true);
    try {
      // Filtra por consultor_id (ou retorna eventos dos associados dele)
      const data = await fetchEventos(associationData.id, {
        consultorId: consultor?.id,
        search,
      });
      setEventos(data);
    } finally {
      setLoading(false);
    }
  }, [associationData?.id, consultor?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="premium-title text-2xl md:text-3xl uppercase tracking-tighter text-white flex items-center space-x-3">
            <ShieldAlert size={28} style={{ color: accentHex }} />
            <span>Meus Eventos & Sinistros</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Acompanhe o andamento dos sinistros e reparos dos veículos da sua carteira de associados.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 self-start sm:self-auto rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-colors"
          title="Recarregar"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Busca */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por placa, associado ou protocolo do sinistro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lista de Eventos do Consultor */}
      <div className="glass-card rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-zinc-400" size={30} style={{ color: accentHex }} />
            <p className="text-xs text-zinc-500">Buscando sinistros da sua carteira...</p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShieldAlert size={40} className="mx-auto text-zinc-600" />
            <h4 className="text-sm font-bold text-white">Nenhum sinistro em andamento</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Seus associados estão rodando seguros e sem registros de sinistro neste momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {eventos.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvento(evt)}
                className="p-4 sm:p-5 hover:bg-white/[0.03] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className="p-2.5 rounded-2xl border shrink-0 mt-0.5"
                    style={{ backgroundColor: `${accentHex}18`, borderColor: `${accentHex}40`, color: accentHex }}
                  >
                    <Car size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {evt.protocolo}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold uppercase text-zinc-300">
                        {evt.tipo}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          evt.status === 'concluido'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
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
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {evt.veiculo?.modelo || 'Veículo'} • Placa: {evt.veiculo?.placa || '-'}
                    </h4>

                    <p className="text-xs text-zinc-400">
                      Associado: <span className="text-zinc-200 font-semibold">{evt.associado?.nome || 'Não informado'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-3 sm:pt-0 border-t sm:border-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block font-bold">Etapa Atual</span>
                    <span
                      className="px-2.5 py-0.5 rounded-lg border text-xs font-bold inline-block mt-0.5"
                      style={{
                        backgroundColor: `${accentHex}15`,
                        borderColor: `${accentHex}40`,
                        color: accentHex,
                      }}
                    >
                      {evt.etapa_atual?.nome || 'Aberto'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvento(evt)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Somente Leitura */}
      <EventDetailsModal
        evento={selectedEvento}
        isOpen={!!selectedEvento}
        onClose={() => setSelectedEvento(null)}
        accentHex={accentHex}
        onEventoUpdated={() => {}}
        readOnly={true}
      />
    </div>
  );
};

export default ConsultorEventos;
