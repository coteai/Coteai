import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, MicOff, Sparkles, Bot, User, Clock, TrendingUp,
  RefreshCw, CheckCircle2, AlertTriangle, ChevronRight, HelpCircle
} from 'lucide-react';
import type { AiContext } from '../../services/aiAssistantService';
import type { AiResponse } from '../../services/aiQueryEngine';
import { processAiQuery } from '../../services/aiQueryEngine';
import { useSpeechToText } from '../../hooks/useSpeechToText';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface CoteAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: AiContext;
  accentHex?: string;
}

export const CoteAiAssistantModal: React.FC<CoteAiAssistantModalProps> = ({
  isOpen,
  onClose,
  context,
  accentHex = '#3b82f6',
}) => {
  const isManager = context.role === 'manager';
  const assistantName = isManager ? 'Cote AI Manager' : 'Cote AI';
  const subtitle = isManager
    ? 'Analista Comercial da Associação • Dados Reais'
    : 'Seu Assessor Comercial Pessoal • Dados Reais';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reconhecimento de Voz (Speech-to-Text)
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechToText();

  // Atualiza o input conforme o usuário fala
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Mensagem inicial de boas-vindas
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = isManager
        ? `Olá! Sou o **Cote AI Manager**, seu assistente analítico. Tenho acesso completo aos dados comerciais da associação em tempo real.\n\nVocê pode me perguntar sobre **resumos diários**, **comparativos entre meses**, **desempenho de consultores**, **veículos mais cotados** ou **oportunidades de melhoria**.`
        : `Olá, ${context.consultantName ? context.consultantName.split(' ')[0] : 'Consultor'}! Sou o **Cote AI**, seu assessor comercial pessoal.\n\nPosso te ajudar a acompanhar suas **cotações do mês**, **taxa de conversão**, **propostas pendentes de fechamento** e **desempenho diário**. Como posso te ajudar hoje?`;

      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: greeting,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, isManager, context.consultantName, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  // Sugestões de perguntas rápidas
  const consultantSuggestions = [
    'Quantas cotações eu fiz este mês?',
    'Qual minha taxa de conversão?',
    'Quais cotações estão pendentes?',
    'Quantas propostas tenho em negociação?',
    'Meu resumo de hoje',
    'Quantas vendas fiz este mês?',
  ];

  const managerSuggestions = [
    'Resumo da operação de hoje',
    'Compare este mês com o mês passado',
    'Qual consultor teve maior taxa de conversão?',
    'Quais consultores precisam de atenção?',
    'Quais veículos foram mais cotados?',
    'Qual plano foi mais cotado?',
    'Onde estamos perdendo mais oportunidades?',
  ];

  const suggestions = isManager ? managerSuggestions : consultantSuggestions;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isProcessing) return;

    if (isListening) {
      stopListening();
    }
    resetTranscript();
    setInput('');

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response: AiResponse = await processAiQuery(query, context);
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: 'Ocorreu um erro ao consultar os dados. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#0b1329] border border-white/10 sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] sm:h-[650px] relative rounded-t-3xl"
      >
        {/* Glow de fundo */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-20"
          style={{ backgroundColor: accentHex }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02] relative z-10">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border font-black text-white relative shadow-lg"
              style={{
                backgroundColor: `${accentHex}20`,
                borderColor: `${accentHex}50`,
                color: accentHex,
              }}
            >
              <Sparkles size={18} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0b1329] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                  {assistantName}
                </h3>
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border"
                  style={{
                    color: accentHex,
                    borderColor: `${accentHex}40`,
                    backgroundColor: `${accentHex}15`,
                  }}
                >
                  {isManager ? 'Gestão' : 'Consultor'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensagens & Chat */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 styled-scrollbar relative z-10">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'border text-white'
                }`}
                style={
                  msg.sender === 'assistant'
                    ? { backgroundColor: `${accentHex}25`, borderColor: `${accentHex}50`, color: accentHex }
                    : {}
                }
              >
                {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Balão de Mensagem */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-[#121c38] text-zinc-200 border border-white/10 rounded-tl-none'
                }`}
              >
                {/* Renderização com quebras de linha e negritos simples */}
                <div className="whitespace-pre-wrap font-sans space-y-1">
                  {msg.text.split('\n').map((line, lIdx) => {
                    // Títulos ou listas
                    if (line.startsWith('•')) {
                      return (
                        <p key={lIdx} className="pl-2 text-zinc-300">
                          {line}
                        </p>
                      );
                    }
                    if (line.startsWith('|')) {
                      return (
                        <p key={lIdx} className="font-mono text-[11px] text-zinc-400 overflow-x-auto">
                          {line}
                        </p>
                      );
                    }
                    return (
                      <p key={lIdx} className="text-zinc-200">
                        {line}
                      </p>
                    );
                  })}
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block text-right mt-1.5 opacity-70">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Indicador de Digitação */}
          {isProcessing && (
            <div className="flex items-center space-x-2 text-zinc-400 text-xs pl-9">
              <Sparkles size={14} className="animate-spin" style={{ color: accentHex }} />
              <span>Consultando dados reais do sistema...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugestões Rápidas (Chips com 1 Toque) */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 relative z-10 overflow-x-auto flex items-center gap-1.5 styled-scrollbar">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider shrink-0 mr-1">
            Sugestões:
          </span>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(sug)}
              disabled={isProcessing}
              className="text-[11px] font-medium text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap transition-all active:scale-95 shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Barra de Entrada (Texto + Microfone) */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#070d1d] relative z-10">
          {/* Alerta de microfone ouvindo */}
          {isListening && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Ouvindo sua voz... Fale sua pergunta
              </span>
              <button
                type="button"
                onClick={stopListening}
                className="font-bold underline text-[10px] uppercase"
              >
                Parar
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Botão de Microfone / Speech-to-Text */}
            {isSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={isProcessing}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
                }`}
                title={isListening ? 'Clique para parar' : 'Falar por áudio'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            {/* Input de Texto */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? 'Ouvindo...' : 'Faça uma pergunta sobre vendas, taxas, cotações...'}
              disabled={isProcessing}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-all font-medium"
            />

            {/* Botão de Enviar */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              className="p-2.5 rounded-xl font-black text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg hover:brightness-110"
              style={{ backgroundColor: accentHex }}
              title="Enviar"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

