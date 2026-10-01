import React, { useState } from 'react';
import { X, Save, FileText, CheckCircle2, Clock, Send, XCircle, Sparkles, Phone, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CommercialStatus } from '../../utils/crmStatus';
import {
  COMMERCIAL_STATUSES,
  normalizeCommercialStatus,
  updateQuoteCommercialStatus,
} from '../../utils/crmStatus';

interface QuoteObservationsModalProps {
  quote: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedQuote: any) => void;
  accentHex?: string;
}

export const QuoteObservationsModal: React.FC<QuoteObservationsModalProps> = ({
  quote,
  isOpen,
  onClose,
  onUpdated,
  accentHex = '#10b981',
}) => {
  if (!isOpen || !quote) return null;

  const currentStatus = normalizeCommercialStatus(quote.status);
  const [status, setStatus] = useState<CommercialStatus>(currentStatus);
  const [observacoes, setObservacoes] = useState<string>(quote.observacoes || '');
  const [clienteNome, setClienteNome] = useState<string>(quote.cliente_nome || '');
  const [clienteWhatsapp, setClienteWhatsapp] = useState<string>(quote.cliente_whatsapp || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');

    const res = await updateQuoteCommercialStatus(supabase, quote.id, status, {
      observacoes: observacoes.trim(),
      cliente_nome: clienteNome.trim() || undefined,
      cliente_whatsapp: clienteWhatsapp.trim() || undefined,
    });

    if (res.success) {
      onUpdated({
        ...quote,
        status,
        observacoes: observacoes.trim(),
        cliente_nome: clienteNome.trim() || quote.cliente_nome,
        cliente_whatsapp: clienteWhatsapp.trim() || quote.cliente_whatsapp,
        updated_at: new Date().toISOString(),
        ...(status === 'convertida' ? { converted_at: quote.converted_at || new Date().toISOString() } : {}),
      });
      onClose();
    } else {
      setErrorMsg('Não foi possível salvar as alterações. Tente novamente.');
    }
    setSaving(false);
  };

  const statusList: { key: CommercialStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'nova', label: 'Nova', icon: <Sparkles size={14} /> },
    { key: 'negociacao', label: 'Negociação', icon: <Clock size={14} /> },
    { key: 'proposta_enviada', label: 'Proposta Enviada', icon: <Send size={14} /> },
    { key: 'convertida', label: 'Convertida', icon: <CheckCircle2 size={14} /> },
    { key: 'nao_convertida', label: 'Não Convertida', icon: <XCircle size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Detalhes & Histórico Comercial
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Cotação #{quote.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto styled-scrollbar flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Dados do Veículo */}
          <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-xs flex justify-between items-center">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Veículo</p>
              <p className="text-white font-semibold">{quote.modelo || 'Modelo não informado'}</p>
              <p className="text-zinc-400 font-mono mt-0.5">{quote.placa || 'Sem placa'}</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Mensalidade</p>
              <p className="text-emerald-400 font-bold text-sm">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.mensalidade || 0)}
              </p>
              <p className="text-zinc-500 text-[10px]">{quote.plano_selecionado || 'Plano Cotado'}</p>
            </div>
          </div>

          {/* Alteração do Status Comercial */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Status Comercial
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {statusList.map((item) => {
                const isSelected = status === item.key;
                const cfg = COMMERCIAL_STATUSES[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatus(item.key)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor} shadow-[0_0_15px_rgba(0,0,0,0.5)] scale-[1.02]`
                        : 'bg-black/20 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                <User size={12} /> Nome do Cliente
              </label>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                <Phone size={12} /> WhatsApp do Cliente
              </label>
              <input
                type="text"
                value={clienteWhatsapp}
                onChange={(e) => setClienteWhatsapp(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Observações Comerciais */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Observações & Anotações de Contato
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Cliente achou a proposta muito boa, pediu retorno na quinta-feira após o almoço..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-none styled-scrollbar"
            />
          </div>

          {/* Timestamps */}
          <div className="pt-2 border-t border-white/5 flex flex-wrap justify-between text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Criado em: {new Date(quote.created_at).toLocaleString('pt-BR')}
            </span>
            {quote.updated_at && (
              <span>Atualizado: {new Date(quote.updated_at).toLocaleString('pt-BR')}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: accentHex }}
          >
            <Save size={14} />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

