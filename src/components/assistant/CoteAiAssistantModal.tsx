import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, MicOff, Sparkles, Bot, User, RefreshCw, ArrowLeft
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

/**
 * Renderizador de mensagens fluido e conversacional
 */
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split('\n\n').filter(Boolean);

  const renderLine = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-extrabold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2 text-zinc-200 leading-relaxed font-sans text-xs sm:text-sm">
      {paragraphs.map((para, pIdx) => (
        <p key={pIdx}>
          {para.split('\n').map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {renderLine(line)}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  );
};

export const CoteAiAssistantModal: React.FC<CoteAiAssistantModalProps> = ({
  isOpen,
  onClose,
  context,
  accentHex = '#3b82f6',
}) => {
  const isManager = context.role === 'manager';
  const assistantName = isManager ? 'Cote AI Manager' : 'Cote AI';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reconhecimento de Voz (Speech-to-Text)
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechToText();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Mensagem inicial de boas-vindas
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = isManager
        ? `Olá! Sou o **Cote AI Manager**, seu assistente de inteligência comercial. Tenho acesso completo aos dados reais da sua operação em tempo real.\n\nVocê pode me perguntar sobre as cotações de hoje, taxa de conversão, comparativos de períodos ou desempenho da equipe.`
        : `Olá, ${context.consultantName ? context.consultantName.split(' ')[0] : 'Consultor'}! Sou o **Cote AI**, seu assessor comercial pessoal.\n\nEstou conectado aos seus dados em tempo real. Pode me perguntar sobre suas cotações, taxa de conversão, propostas pendentes ou desempenho. Como posso te ajudar agora?`;

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

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, isOpen]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Sugestões de perguntas rápidas naturais
  const consultantSuggestions = [
    'Quantas cotações eu fiz hoje?',
    'Qual minha taxa de conversão?',
    'Quais cotações estão pendentes?',
    'Quantas propostas tenho em negociação?',
    'Quantas vendas fiz este mês?',
  ];

  const managerSuggestions = [
    'Quantas cotações fizemos hoje?',
    'Resumo da operação de hoje',
    'Compare este mês com o mês passado',
    'Quem vendeu mais na equipe?',
    'Quais cotações estão pendentes?',
    'Veículos mais cotados',
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

  const handleResetChat = () => {
    setMessages([]);
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex flex-col justify-end md:justify-center items-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        {/* Painel Fixo de Chat — Estrutura sólida, sem deslocamentos ou proporções distorcidas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full h-full md:h-[90vh] md:max-h-[820px] md:max-w-3xl bg-[#070d1d] md:rounded-3xl md:border md:border-white/15 md:shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden relative"
        >
          {/* Header Sólido com Botão Voltar */}
          <header className="h-16 px-4 sm:px-6 border-b border-white/10 bg-[#0a1226] flex items-center justify-between shrink-0 select-none relative z-10">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors text-xs font-bold active:scale-95"
                title="Voltar ao painel"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Voltar</span>
              </button>

              <div className="flex items-center space-x-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border font-black text-white shadow-md relative shrink-0"
                  style={{
                    backgroundColor: `${accentHex}25`,
                    borderColor: `${accentHex}60`,
                    color: accentHex,
                  }}
                >
                  <Sparkles size={18} />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070d1d] animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                      {assistantName}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      GPT-4o mini
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 hidden sm:block">
                    {isManager ? 'Inteligência Comercial da Operação' : 'Assessor Comercial Integrado'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Reiniciar conversa"
              >
                <RefreshCw size={17} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Fechar e voltar"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Área de Mensagens e Diálogo */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 styled-scrollbar relative z-10 bg-[#070d1d]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 sm:gap-3 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
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
                  {msg.sender === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>

                {/* Balão de Mensagem */}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-[#121c38] text-zinc-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  <FormattedMessage text={msg.text} />
                  <span className="text-[10px] text-zinc-500 font-mono block text-right mt-1.5 opacity-70">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Indicador de Processamento */}
            {isProcessing && (
              <div className="flex items-center space-x-2.5 text-zinc-400 text-xs pl-10">
                <Sparkles size={14} className="animate-spin" style={{ color: accentHex }} />
                <span>Consultando dados reais da operação...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões Rápidas (Chips com 1 Toque) */}
          <div className="px-4 py-2.5 bg-black/40 border-t border-white/5 relative z-10 overflow-x-auto flex items-center gap-2 styled-scrollbar shrink-0">
            <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider shrink-0 mr-1">
              Perguntas:
            </span>
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(sug)}
                disabled={isProcessing}
                className="text-[11px] font-medium text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white px-3 py-1 rounded-full border border-white/10 whitespace-nowrap transition-all active:scale-95 shrink-0"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Barra de Entrada (Texto + Microfone) */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-[#050a16] relative z-10 shrink-0 pb-[max(env(safe-area-inset-bottom),14px)]">
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

            <div className="flex items-center gap-2 sm:gap-2.5">
              {isSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl border transition-all active:scale-95 shrink-0 ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
                  }`}
                  title={isListening ? 'Parar escuta' : 'Falar'}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? 'Ouvindo...' : 'Faça uma pergunta sobre a operação...'}
                disabled={isProcessing}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-all font-medium"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isProcessing}
                className="p-3 rounded-xl font-black text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg hover:brightness-110"
                style={{ backgroundColor: accentHex }}
                title="Enviar"
              >
                <Send size={18} />
              </button>
            </div>

            <div className="mt-2 text-center">
              <span className="text-[10px] text-zinc-500 font-medium">
                Cote AI • Respostas baseadas em dados 100% reais do sistema
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};