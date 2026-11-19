import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChatMessage,
  CestaTicketData,
  DocumentType,
  Formato14100Data,
  PaystubData,
  QuickReply,
  WorkerProfile,
  WorkLetterConfig
} from '../types';
import {
  ChatbotEngine,
  INITIAL_BOT_MESSAGES,
  OESVICA_MENU_QUICK_REPLIES,
  SPANISH_MONTHS
} from '../services/chatbotEngine';
import { voiceService } from '../services/voiceService';
import {
  Send,
  RotateCcw,
  FileText,
  FileCheck,
  Building2,
  ExternalLink,
  Bot,
  User,
  Download,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Square,
  Utensils,
  MessageSquarePlus,
  Database,
  CheckCheck,
  ChevronRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { DEFAULT_CESTA_TICKET, INITIAL_FORMATO_14100 } from '../data/mockData';
import { historyDatabaseService } from '../services/historyDatabaseService';
import { DatabaseHistoryModal } from './DatabaseHistoryModal';
import { CorporateAvatarVideo } from './CorporateAvatarVideo';
import corporateAvatarImg from '../assets/images/corporate_avatar_neutral_1793718425841.jpg';

export interface ChatWindowProps {
  onOpenDocument?: (
    type: DocumentType,
    paystub?: PaystubData,
    letter?: WorkLetterConfig,
    formato?: Formato14100Data,
    worker?: WorkerProfile,
    cestaTicket?: CestaTicketData
  ) => void;
  className?: string;
  initialMessages?: ChatMessage[];
  showControls?: boolean;
}

/**
 * ChatWindow Component:
 * Displays a conversational interface with distinct message bubbles for user and bot interactions,
 * real-time endpoint integrations (ficha verification, OTP, webhooks), dynamic MySQL menu options,
 * and voice audio synthesis/recognition.
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  onOpenDocument,
  className = '',
  initialMessages = INITIAL_BOT_MESSAGES,
  showControls = true
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [engine] = useState(() => new ChatbotEngine());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice States
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingMsgId, setCurrentlySpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [micStatusText, setMicStatusText] = useState<string | null>(null);

  // Database History & Settings States
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isMysqlConnected, setIsMysqlConnected] = useState<boolean | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom once conversation progresses beyond initial welcome
    if (messages.length > 2 || isTyping || isListening) {
      scrollToBottom();
    }
  }, [messages, isTyping, isListening, scrollToBottom]);

  // Initial load: load dynamic welcome message and main menu from MySQL
  useEffect(() => {
    engine.loadConfigAndMenu().then(() => {
      const welcome = engine.getWelcomeMessage();
      const prompt = engine.getPromptFichaMessage();
      const initialMsgs: ChatMessage[] = [
        {
          id: `msg-init-welcome-${Date.now()}`,
          sender: 'bot',
          text: welcome,
          timestamp: 'Ahora'
        },
        {
          id: `msg-init-ficha-${Date.now() + 1}`,
          sender: 'bot',
          text: prompt,
          timestamp: 'Ahora'
        }
      ];
      setMessages(initialMsgs);

      // Register session in database with worker section
      const worker = engine.getWorker();
      historyDatabaseService.registerSession(worker);

      // Save initial messages in session history
      initialMsgs.forEach((msg) => {
        historyDatabaseService.saveMessage(msg, worker);
      });
    });

    historyDatabaseService.getDbStatus().then((status) => {
      if (status) {
        setIsMysqlConnected(status.isMysqlConnected);
      }
    });

    return () => {
      voiceService.stop();
      voiceService.stopListening();
    };
  }, [engine]);

  // Voice synthesis helpers
  const speakMessages = (msgs: ChatMessage[]) => {
    if (!msgs || msgs.length === 0) return;
    const items = msgs
      .filter((m) => m.text && m.text.trim())
      .map((m) => ({ text: m.text, id: m.id }));

    if (items.length === 0) return;

    voiceService.speakSequence(items, {
      onItemStart: (item) => {
        setIsSpeaking(true);
        if (item.id) setCurrentlySpeakingMsgId(item.id);
      },
      onComplete: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMsgId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMsgId(null);
      }
    });
  };

  const speakText = (text: string, msgId?: string) => {
    if (!text) return;
    voiceService.speakSequence([{ text, id: msgId }], {
      onItemStart: (item) => {
        setIsSpeaking(true);
        if (item.id) setCurrentlySpeakingMsgId(item.id);
      },
      onComplete: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMsgId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingMsgId(null);
      }
    });
  };

  const stopSpeaking = () => {
    voiceService.stop();
    setIsSpeaking(false);
    setCurrentlySpeakingMsgId(null);
  };

  const toggleMicListening = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setMicStatusText(null);
      return;
    }

    stopSpeaking();
    setIsListening(true);
    setMicStatusText('🎙️ Escuchando... Di el código de ficha o consulta');

    voiceService.startListening(
      (transcript) => {
        setIsListening(false);
        setMicStatusText(null);
        if (transcript.trim()) {
          handleSend(transcript.trim());
        }
      },
      () => {
        setIsListening(false);
        setMicStatusText(null);
      },
      () => {
        setIsListening(false);
        setMicStatusText(null);
      }
    );
  };

  const handleSend = async (customText?: string, actionId?: string) => {
    stopSpeaking();

    if (actionId === 'action_new_chat' || actionId === 'action_logout') {
      handleResetChat();
      return;
    }

    if (actionId === 'open_carta_modal' && onOpenDocument) {
      const lastLetterMsg = [...messages].reverse().find((m) => m.documentPayload?.type === 'carta_trabajo');
      const letterData = (lastLetterMsg?.documentPayload?.data as WorkLetterConfig) || {
        incluirSueldo: true,
        destinatario: 'A Quien Pueda Interesar',
        motivoTramite: 'Trámites Administrativos y Personales',
        fechaEmision: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }),
        codigoValidacion: `VAL-OESVICA-${Date.now().toString(36).toUpperCase()}`
      };
      onOpenDocument('carta_trabajo', undefined, letterData, undefined, engine.getWorker());
      return;
    }

    if (actionId === 'open_cesta_modal' && onOpenDocument) {
      onOpenDocument('cesta_ticket', undefined, undefined, undefined, engine.getWorker(), DEFAULT_CESTA_TICKET);
      return;
    }

    if (actionId === 'open_14100_modal' && onOpenDocument) {
      const last14100Msg = [...messages].reverse().find((m) => m.documentPayload?.type === 'formato_14100');
      const fData = (last14100Msg?.documentPayload?.data as Formato14100Data) || INITIAL_FORMATO_14100;
      onOpenDocument('formato_14100', undefined, undefined, fData, engine.getWorker());
      return;
    }

    const textToSend = customText || inputText;
    if (!textToSend.trim() && !actionId) return;

    const userMessageText = textToSend || (actionId ? getActionLabel(actionId) : '');

    if (userMessageText) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userMessageText,
        timestamp: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);
      historyDatabaseService.saveMessage(userMsg, engine.getWorker());
    }

    setInputText('');
    setIsTyping(true);

    setTimeout(async () => {
      const botResponses = await engine.processInput(textToSend, actionId);
      setIsTyping(false);
      setMessages((prev) => [...prev, ...botResponses]);

      const activeWorker = engine.getWorker();
      historyDatabaseService.registerSession(activeWorker);
      botResponses.forEach((bMsg) => {
        historyDatabaseService.saveMessage(bMsg, activeWorker);
      });

      if (isVoiceEnabled && botResponses.length > 0) {
        speakMessages(botResponses);
      }
    }, 350);
  };

  const handleResetChat = () => {
    stopSpeaking();
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setMicStatusText(null);
    }
    setInputText('');
    const resetMsgs = engine.resetToPrompt();
    setMessages(resetMsgs);

    const worker = engine.getWorker();
    historyDatabaseService.startNewConversationSession(worker).then(() => {
      resetMsgs.forEach((msg) => {
        historyDatabaseService.saveMessage(msg, worker);
      });
    });

    if (isVoiceEnabled && resetMsgs.length > 0) {
      speakMessages(resetMsgs);
    }
  };

  const getActionLabel = (actionId: string): string => {
    if (actionId.startsWith('login_ficha_')) {
      return actionId.replace('login_ficha_', '');
    }
    if (actionId === 'action_logout' || actionId === 'action_new_chat') return 'Nueva Conversación';
    const found = OESVICA_MENU_QUICK_REPLIES.find((q) => q.action === actionId);
    if (found) return found.label;
    if (actionId.startsWith('recibo_opt_')) return 'Consultar Recibo';
    if (actionId.startsWith('rec_ano_')) return `Año ${actionId.replace('rec_ano_', '')}`;
    if (actionId.startsWith('rec_mes_')) {
      const mNum = actionId.replace('rec_mes_', '');
      const mObj = SPANISH_MONTHS.find((m) => m.num === mNum);
      return mObj ? mObj.name : `Mes ${mNum}`;
    }
    if (actionId === 'rec_q_1') return '1era Quincena';
    if (actionId === 'rec_q_2') return '2da Quincena';
    if (actionId.startsWith('ct_mes_')) {
      const mNum = actionId.replace('ct_mes_', '');
      const mObj = SPANISH_MONTHS.find((m) => m.num === mNum);
      return mObj ? `Cesta Ticket: ${mObj.name}` : `Mes ${mNum}`;
    }
    if (actionId === 'carta_tipo_con_sueldo') return 'Con sueldo integral';
    if (actionId === 'carta_tipo_sin_sueldo') return 'Sin sueldo';
    if (actionId === 'carta_formato_digital') return 'Firma y Sello digitalizado (Pdf)';
    if (actionId === 'carta_formato_fisico') return 'Físico con sello húmedo';
    return actionId;
  };

  // Render markdown inline formatting
  const renderFormattedText = (rawText: string) => {
    return rawText.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
      return (
        <p key={idx} className={line === '' ? 'h-2' : 'my-0.5'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-950 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={pIdx}
                  className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (linkMatch) {
              return (
                <a
                  key={pIdx}
                  href={linkMatch[2]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center gap-0.5"
                >
                  {linkMatch[1]}
                  <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-70" />
                </a>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  const activeWorker = engine.getWorker();
  const isAuthenticated = engine.isAuthenticated();

  return (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden ${className}`}>
      {/* 1. FIXED CORPORATE AVATAR PRESENTER (Located BEFORE the menu bar where Nueva Conversación is; stays permanently pinned when scrolling) */}
      <div className="shrink-0 z-20 bg-slate-950 shadow-md">
        <CorporateAvatarVideo
          variant="fixed-header"
          onQuickQuery={(query) => handleSend(query)}
        />
      </div>

      {/* 2. Header Control Bar (Menu where 'Nueva Conversación' button is located) */}
      {showControls && (
        <div className="px-4 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-xs border border-blue-400/40 bg-blue-600">
              <img
                src={corporateAvatarImg}
                alt="Asistente OESVICA"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  OESVICA Asistente
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isAuthenticated ? (
                  <span>
                    Sesión activa: <strong className="text-blue-600 dark:text-blue-400">{activeWorker.nombres}</strong> (#{activeWorker.id})
                  </span>
                ) : (
                  'Atención Laboral y Social'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Reset / New Chat Button */}
            <button
              onClick={handleResetChat}
              title="Reiniciar chat (Nueva Conversación)"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline text-[11px] font-medium">Nueva Conversación</span>
            </button>

            {/* Voice Toggle Button */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              title={isVoiceEnabled ? 'Desactivar voz' : 'Activar voz'}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isVoiceEnabled
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px] font-medium">
                {isVoiceEnabled ? 'Voz' : 'Mudo'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Messages List / Conversational Stream (Scrolls independently while avatar remains fixed at the top) */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Ventana de conversación con el asistente OESVICA"
      >

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isMsgSpeaking = isSpeaking && currentlySpeakingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
            >
              {/* Bot Avatar (Ionic ion-avatar style) */}
              {!isUser && (
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-xs mt-0.5 border border-blue-400/40 bg-blue-600">
                  <img
                    src={corporateAvatarImg}
                    alt="OESVICA"
                    className="w-full h-full object-cover"
                  />
                  {isMsgSpeaking && (
                    <span className="absolute inset-0 border-2 border-emerald-400 rounded-full animate-ping"></span>
                  )}
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs text-sm leading-relaxed transition-all relative group ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : `bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-100 rounded-tl-xs ${
                        isMsgSpeaking
                          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                          : 'border-slate-200/90 dark:border-slate-800'
                      }`
                }`}
              >
                {/* Message Header (Sender label for bot) */}
                {!isUser && (
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    <span>OESVICA</span>
                    <button
                      onClick={() => (isMsgSpeaking ? stopSpeaking() : speakText(msg.text, msg.id))}
                      className="opacity-60 hover:opacity-100 p-0.5 rounded cursor-pointer transition-opacity"
                      title={isMsgSpeaking ? 'Detener voz' : 'Escuchar este mensaje'}
                    >
                      {isMsgSpeaking ? (
                        <Square className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Formatted Message Content */}
                <div className="whitespace-pre-line text-[13px] sm:text-[14px]">
                  {renderFormattedText(msg.text)}
                </div>

                {/* In-Bubble Document Cards */}
                {msg.documentPayload && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Recibo de Pago Card */}
                    {msg.documentPayload.type === 'recibo_pago' && (
                      <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-slate-900 dark:text-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Recibo de Pago · Plataforma OESVICA
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-semibold">
                            ENVIADO A NOTIFICACIONES
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          El recibo de pago fue enviado a la plataforma oesvica seccion notificaciones .
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          {(msg.documentPayload.data as PaystubData).linkRecibo && (
                            <a
                              href={(msg.documentPayload.data as PaystubData).linkRecibo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar Recibo (PDF)
                            </a>
                          )}
                          {(msg.documentPayload.data as PaystubData).linkHumani && (
                            <a
                              href={(msg.documentPayload.data as PaystubData).linkHumani}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Descargar Humanis (PDF)
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Carta de Trabajo Card */}
                    {msg.documentPayload.type === 'carta_trabajo' && (
                      <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-slate-900 dark:text-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 uppercase">
                            <FileCheck className="w-4 h-4 text-amber-600" />
                            Carta de Trabajo · OESVICA
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                            {(msg.documentPayload.data as WorkLetterConfig).statusEnvio || 'PROCESADO'}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                          <p>
                            • <strong>Tipo:</strong> {(msg.documentPayload.data as WorkLetterConfig).incluirSueldo ? 'Con sueldo integral' : 'Sin sueldo'}
                          </p>
                          <p>
                            • <strong>Formato:</strong> {(msg.documentPayload.data as WorkLetterConfig).formato === 'digital' ? 'Firma y Sello digitalizado (Pdf)' : 'Físico con sello húmedo'}
                          </p>
                          {(msg.documentPayload.data as WorkLetterConfig).codContrato && (
                            <p>
                              • <strong>Código Contrato:</strong> <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{(msg.documentPayload.data as WorkLetterConfig).codContrato}</code>
                            </p>
                          )}
                          {(msg.documentPayload.data as WorkLetterConfig).codFicha && (
                            <p>
                              • <strong>Código Ficha:</strong> <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{(msg.documentPayload.data as WorkLetterConfig).codFicha}</code>
                            </p>
                          )}
                          {(msg.documentPayload.data as WorkLetterConfig).linkPdf && (
                            <div className="pt-1.5">
                              <a
                                href={(msg.documentPayload.data as WorkLetterConfig).linkPdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Descargar Carta de Trabajo (PDF)
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cesta Ticket Card */}
                    {msg.documentPayload.type === 'cesta_ticket' && (
                      <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-slate-900 dark:text-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 uppercase">
                            <Utensils className="w-4 h-4 text-amber-600" />
                            Cesta Ticket Socialista (Alimentación)
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                            ENVIADO A NOTIFICACIONES
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          El comprobante de Cesta Ticket fue enviado a la plataforma oesvica seccion notificaciones .
                        </p>
                        {(msg.documentPayload.data as CestaTicketData).linkPdf && (
                          <div className="pt-1">
                            <a
                              href={(msg.documentPayload.data as CestaTicketData).linkPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar Cesta Ticket (PDF)
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Forma 14-100 Card */}
                    {msg.documentPayload.type === 'formato_14100' && (
                      <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3 text-slate-900 dark:text-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            Formato 14-100 IVSS
                          </span>
                          <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                            PROCESADO
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Constancia de Registro y Participación de Retiro IVSS emitida.
                        </p>
                        {(msg.documentPayload.data as Formato14100Data).linkPdf && (
                          <div className="pt-1">
                            <a
                              href={(msg.documentPayload.data as Formato14100Data).linkPdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Descargar Forma 14-100 (PDF)
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Replies Action Buttons */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                    {msg.quickReplies.map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() => handleSend(undefined, qr.action)}
                        className={`text-xs py-2 px-3 rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          qr.category === 'primary'
                            ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 active:scale-95'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95'
                        }`}
                      >
                        <span>{qr.label}</span>
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp & Status Metadata */}
                <div
                  className={`flex items-center gap-1 text-[10px] mt-1.5 select-none ${
                    isUser ? 'text-blue-100 justify-end' : 'text-slate-400 dark:text-slate-500 justify-start'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCheck className="w-3 h-3 text-blue-200 ml-0.5" />}
                </div>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Indicator Bubble */}
        {isTyping && (
          <div className="flex items-start gap-2.5 animate-in fade-in duration-150">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3 shadow-xs flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-1">
                OESVICA está procesando...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Dictation Banner */}
      {isListening && (
        <div className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold flex items-center justify-between shadow-md shrink-0 animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
            <span>{micStatusText || '🎙️ Escuchando... Di el código de ficha'}</span>
          </div>
          <button
            onClick={toggleMicListening}
            className="text-[11px] underline font-bold hover:text-blue-100 cursor-pointer"
          >
            Detener
          </button>
        </div>
      )}

      {/* 4. Bottom Input Form */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleMicListening}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isListening
                ? 'bg-red-500 text-white border-red-600 shadow-sm animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={isListening ? 'Detener micrófono' : 'Hablar por micrófono'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              !isAuthenticated
                ? 'Escribe tu ficha (ejemplo:00????)...'
                : 'Escribe tu consulta o trámite...'
            }
            className="flex-1 py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-sans"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 5. Database History Modal */}
      <DatabaseHistoryModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConfigUpdated={async () => {
          await engine.loadConfigAndMenu();
          if (!engine.isAuthenticated()) {
            const welcome = engine.getWelcomeMessage();
            const prompt = engine.getPromptFichaMessage();
            setMessages([
              {
                id: `msg-init-welcome-${Date.now()}`,
                sender: 'bot',
                text: welcome,
                timestamp: 'Ahora'
              },
              {
                id: `msg-init-ficha-${Date.now() + 1}`,
                sender: 'bot',
                text: prompt,
                timestamp: 'Ahora'
              }
            ]);
          }
        }}
      />
    </div>
  );
};
