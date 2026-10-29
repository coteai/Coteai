import React, { useState } from 'react';
import { Car, User, DollarSign, Sparkles, Copy, Check, ExternalLink } from 'lucide-react';
import type { Evento, EventoStatus } from '../../types/events';

interface Props {
  evento: Evento;
  accentHex: string;
  readOnly?: boolean;
  onStatusChange: (status: EventoStatus) => void;
}

export const EventOverviewTab: React.FC<Props> = ({
  evento,
  accentHex,
  readOnly,
  onStatusChange,
}) => {
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/acompanhar/${evento.token_acompanhamento}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Veículo */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-bold uppercase mb-3">
            <Car size={16} style={{ color: accentHex }} />
            <span>Veículo Segurado</span>
          </div>
          <h4 className="text-base font-extrabold text-white">
            {evento.veiculo?.modelo || 'Modelo não especificado'}
          </h4>
          <p className="text-sm font-mono text-zinc-300 mt-1">
            Placa: <strong className="text-white">{evento.veiculo?.placa || 'Sem placa'}</strong>
          </p>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-white/5">
            <span>Ano: {evento.veiculo?.ano || '-'}</span>
            <span>FIPE: R$ {Number(evento.veiculo?.valor_fipe || 0).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Associado */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-bold uppercase mb-3">
            <User size={16} style={{ color: accentHex }} />
            <span>Associado / Proprietário</span>
          </div>
          <h4 className="text-base font-extrabold text-white">
            {evento.associado?.nome || 'Associado não vinculado'}
          </h4>
          <p className="text-xs text-zinc-300 mt-1">CPF: {evento.associado?.cpf_cnpj || '-'}</p>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-white/5">
            <span>{evento.associado?.telefone || 'Sem telefone'}</span>
            <span className="text-emerald-400 uppercase font-semibold text-[10px]">
              {evento.associado?.situacao || 'Ativo'}
            </span>
          </div>
        </div>

        {/* Custo Aprovado */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs font-bold uppercase mb-3">
            <DollarSign size={16} style={{ color: accentHex }} />
            <span>Custo Total Aprovado</span>
          </div>
          <h4 className="text-2xl font-black text-white font-mono">
            R$ {Number(evento.valor_total_aprovado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            Etapa Atual: <strong className="text-white">{evento.etapa_atual?.nome || 'Aberto'}</strong>
          </p>
          {!readOnly && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center space-x-2">
              <span className="text-[11px] text-zinc-400">Alterar Status:</span>
              <select
                value={evento.status}
                onChange={(e) => onStatusChange(e.target.value as EventoStatus)}
                className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Relato do Sinistro */}
      <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Relato do Sinistro & Danos Apontados
        </h4>
        <p className="text-sm text-zinc-200 leading-relaxed">
          {evento.descricao || 'Nenhuma descrição detalhada informada.'}
        </p>
      </div>

      {/* Rastreio Público */}
      <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sparkles size={16} style={{ color: accentHex }} />
            <span>Link de Acompanhamento do Associado</span>
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Envie este link direto para o associado acompanhar o reparo sem login.
          </p>
          <code className="text-xs font-mono text-zinc-300 block mt-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 truncate max-w-xl">
            {publicUrl}
          </code>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center space-x-2"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center space-x-2 border"
            style={{
              backgroundColor: `${accentHex}25`,
              borderColor: `${accentHex}60`,
            }}
          >
            <ExternalLink size={14} />
            <span>Abrir</span>
          </a>
        </div>
      </div>
    </div>
  );
};
