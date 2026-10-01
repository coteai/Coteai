import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, MicOff, Sparkles, Bot, User, RefreshCw, Minus, MessageSquare
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
  isOpen?: boolean;
  onClose?: () => void;
  context: AiContext;
  accentHex?: string;
}

export const CoteAiAssistantModal: React.FC<CoteAiAssistantModalProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  context,
  accentHex = '#3b82f6',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleClose = () => {
    setInternalIsOpen(false);
    if (externalOnClose) {
      externalOnClose();
    }
  };

  const handleOpen = () => {
    setInternalIsOpen(true);
  };

  // Escuta evento global para abrir a partir de qualquer botão da tela
  useEffect(() => {
    const handleGlobalOpen = (e: any) => {
      setInternalIsOpen(true);
      if (e.detail?.query) {
        handleSend(e.detail.query);
      }
    };
    window.addEventListener('open-cote-ai-assistant', handleGlobalOpen);
    return () => window.removeEventListener('open-cote-ai-assistant', handleGlobalOpen);
  }, []);

  const isManager = context.role === 'manager';
  const assistantName = isManager ? 'Cote AI Manager' : 'Cote AI';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        ? `Olá! Sou o **Cote AI Manager**, seu assistente de inteligência comercial. Tenho acesso completo aos dados reais da sua operação.\n\nVocê pode me perguntar sobre o **resumo de hoje**, **comparativo de períodos**, **desempenho da equipe**, **veículos mais cotados** ou **oportunidades de conversão**.`
        : `Olá, ${context.consultantName ? context.consultantName.split(' ')[0] : 'Consultor'}! Sou o **Cote AI**, seu assessor comercial pessoal.\n\nEstou conectado aos seus dados em tempo real. Pode me perguntar sobre suas **cotações do mês**, **taxa de conversão**, **propostas pendentes** e **desempenho**. Como posso te ajudar agora?`;

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

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
    'Pipeline comercial ativo',
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

  return (
    <>
      {/* Botão Flutuante (FAB) fixo no canto inferior direito quando a janela estiver minimizada */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-20 md:bottom-7 right-4 md:right-7 z-[9990] flex items-center gap-2.5 px-4 py-3 rounded-full text-black font-black uppercase text-xs tracking-wider shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group border border-white/20"
          style={{
            backgroundColor: accentHex,
            boxShadow: `0 10px 30px -5px ${accentHex}80, 0 0 20px ${accentHex}40`,
          }}
          title={`Abrir ${assistantName}`}
        >
          <div className="relative flex items-center justify-center">
            <Sparkles size={18} className="fill-black animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-950 border border-white animate-ping" />
          </div>
          <span className="hidden sm:inline-block font-extrabold">{assistantName}</span>
          <span className="text-[10px] bg-black/20 text-black px-1.5 py-0.5 rounded-full font-bold">IA</span>
        </button>
      )}

      {/* Janela Flutuante do Assistente */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-20 md:bottom-7 right-3 md:right-7 w-[calc(100vw-24px)] sm:w-[440px] md:w-[460px] h-[590px] max-h-[calc(100vh-110px)] rounded-3xl z-[9999] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] border border-white/15 bg-[#0b1329]/95 backdrop-blur-2xl flex flex-col overflow-hidden"
          >
            {/* Glow de fundo */}
            <div
              className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-[90px] pointer-events-none opacity-25"
              style={{ backgroundColor: accentHex }}
            />

            {/* Header da Janela Flutuante */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.03] relative z-10 select-none">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border font-black text-white relative shadow-md"
                  style={{
                    backgroundColor: `${accentHex}25`,
                    borderColor: `${accentHex}60`,
                    color: accentHex,
                  }}
                >
                  <Sparkles size={16} />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0b1329] animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      {assistantName}
                    </h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      GPT-4o mini
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {isManager ? 'Inteligência Comercial da Operação' : 'Assessor Comercial Integrado'}
                  </p>
                </div>
              </div>

              {/* Controles da Janela */}
              <div className="flex items-center space-x-1 text-zinc-400">
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Reiniciar conversa"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Minimizar janela"
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Mensagens & Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 styled-scrollbar relative z-10 text-xs sm:text-sm">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
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
                    {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
                  </div>

                  {/* Balão de Mensagem */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-[#121c38] text-zinc-200 border border-white/10 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans space-y-1">
                      {msg.text.split('\n').map((line, lIdx) => {
                        if (line.startsWith('•') || line.startsWith('-')) {
                          return (
                            <p key={lIdx} className="pl-1 text-zinc-300">
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
                    <span className="text-[9px] text-zinc-500 font-mono block text-right mt-1 opacity-70">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Indicador de Processamento */}
              {isProcessing && (
                <div className="flex items-center space-x-2 text-zinc-400 text-xs pl-8">
                  <Sparkles size={13} className="animate-spin" style={{ color: accentHex }} />
                  <span>Consultando dados reais com GPT-4o mini...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões Rápidas (Chips com 1 Toque) */}
            <div className="px-3 py-2 bg-black/40 border-t border-white/5 relative z-10 overflow-x-auto flex items-center gap-1.5 styled-scrollbar">
              <span className="text-[9px] uppercase font-black text-zinc-500 tracking-wider shrink-0 mr-1">
                Sugestões:
              </span>
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(sug)}
                  disabled={isProcessing}
                  className="text-[10px] font-medium text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap transition-all active:scale-95 shrink-0"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Barra de Entrada (Texto + Microfone) */}
            <div className="p-3 border-t border-white/10 bg-[#070d1d] relative z-10">
              {isListening && (
                <div className="mb-2 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between animate-pulse">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Ouvindo... Fale sua pergunta
                  </span>
                  <button
                    type="button"
                    onClick={stopListening}
                    className="font-bold underline text-[9px] uppercase"
                  >
                    Parar
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
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
                    title={isListening ? 'Parar escuta' : 'Falar'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isListening ? 'Ouvindo...' : 'Faça uma pergunta sobre a operação...'}
                  disabled={isProcessing}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 transition-all font-medium"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isProcessing}
                  className="p-2.5 rounded-xl font-black text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg hover:brightness-110"
                  style={{ backgroundColor: accentHex }}
                  title="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>

              <div className="mt-1.5 text-center">
                <span className="text-[9px] text-zinc-500 font-medium">
                  Cote AI • Respostas baseadas em dados 100% reais do sistema
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};