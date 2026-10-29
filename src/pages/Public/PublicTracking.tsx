import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Check, MessageSquare,
  AlertCircle, Loader2, Phone
} from 'lucide-react';
import type { EventoPublicoPayload } from '../../types/events';
import { getEventoPublico } from '../../services/eventsService';

const PublicTracking: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<EventoPublicoPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadPublicEvento(token);
    }
  }, [token]);

  const loadPublicEvento = async (tokenStr: string) => {
    setLoading(true);
    try {
      const payload = await getEventoPublico(tokenStr);
      setData(payload);
    } finally {
      setLoading(false);
    }
  };

  const accentHex = data?.associacao?.cor_primaria || '#3B82F6';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-blue-500 mb-3" size={36} />
        <p className="text-sm text-zinc-400">Localizando informações do seu veículo...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sinistro Não Encontrado</h2>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          O token informado pode ter expirado ou o link digitado está incorreto. Por favor, verifique com sua associação.
        </p>
      </div>
    );
  }

  const whatsappLink = data.associacao.whatsapp
    ? `https://wa.me/55${data.associacao.whatsapp.replace(/\D/g, '')}?text=Olá,%20gostaria%20de%20informações%20sobre%20o%20sinistro%20${data.protocolo}`
    : '#';

  const etapas = data.todas_etapas || [];
  const historico = data.historico || [];

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Brand Bar */}
      <header className="border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {data.associacao.logo_url ? (
              <img src={data.associacao.logo_url} alt={data.associacao.nome} className="h-8 max-w-[140px] object-contain" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white border"
                style={{ backgroundColor: `${accentHex}20`, borderColor: `${accentHex}40`, color: accentHex }}
              >
                {data.associacao.nome?.charAt(0) || 'A'}
              </div>
            )}
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                {data.associacao.nome}
              </h2>
              <span className="text-[10px] text-zinc-400 block">Acompanhamento de Reparo 24h</span>
            </div>
          </div>

          {data.associacao.whatsapp && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">Falar no WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Card do Veículo & Status Principal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-3xl border border-white/10 bg-[#0B1120] relative overflow-hidden"
          style={{ boxShadow: `0 20px 40px -15px rgba(0,0,0,0.7), 0 0 25px ${accentHex}15` }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-zinc-300">
                  {data.protocolo}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold uppercase"
                  style={{
                    backgroundColor: `${accentHex}20`,
                    borderColor: `${accentHex}50`,
                    color: accentHex,
                  }}
                >
                  {data.etapa_atual?.nome || 'Em Tratamento'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white">
                {data.veiculo?.modelo || 'Veículo em Manutenção'}
              </h1>

              <p className="text-xs text-zinc-400 mt-1">
                Placa:{' '}
                <strong className="text-white font-mono tracking-wider">
                  {data.veiculo?.placa_mascarada || '***'}
                </strong>{' '}
                • Sinistro registrado em{' '}
                {new Date(data.data_abertura).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="shrink-0 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center sm:text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Status Geral</span>
              <span className="text-sm font-extrabold text-white capitalize">
                {data.status === 'em_andamento'
                  ? 'Em Andamento'
                  : data.status === 'concluido'
                  ? 'Concluído'
                  : 'Em Análise'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Linha do Tempo Visual das Etapas */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-3xl border border-white/10 bg-[#0B1120]"
        >
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-bold uppercase mb-6">
            <Clock size={16} style={{ color: accentHex }} />
            <span>Progresso da Recuperação do Veículo</span>
          </div>

          {/* Stepper Horizontal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {etapas.map((et, idx) => {
              const isCurrent = et.id === data.etapa_atual?.id;
              const isDone = et.concluida;
              return (
                <div
                  key={et.id}
                  className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      : isDone
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-zinc-300'
                      : 'border-white/5 bg-white/[0.01] text-zinc-600'
                  }`}
                  style={isCurrent ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${
                      isCurrent
                        ? 'bg-white text-black'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-zinc-600'
                    }`}
                  >
                    {isDone && !isCurrent ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className="text-[11px] font-bold leading-tight">{et.nome}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Histórico Público de Atualizações */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-3xl border border-white/10 bg-[#0B1120] space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Atualizações Recentes
          </h3>

          <div className="space-y-3">
            {historico.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma atualização registrada ainda.</p>
            ) : (
              historico.map((h, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.015] flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: accentHex }}
                    />
                    <span className="text-xs font-bold text-white">{h.etapa_nome}</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {new Date(h.data_hora).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(h.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Ajuda / Suporte */}
        <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.015] text-center space-y-3">
          <p className="text-xs text-zinc-400">
            Dúvidas sobre o andamento do seu veículo? Entre em contato diretamente com nossa central de atendimento.
          </p>
          {data.associacao.whatsapp && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all shadow-md border"
              style={{
                backgroundColor: `${accentHex}25`,
                borderColor: `${accentHex}60`,
              }}
            >
              <Phone size={14} />
              <span>Falar com o Suporte da Associação</span>
            </a>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        <p>Cote AI • Plataforma Operacional de Proteção Veicular</p>
      </footer>
    </div>
  );
};

export default PublicTracking;

