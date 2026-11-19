import React, { useEffect, useRef, useState } from 'react';
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
  Database
} from 'lucide-react';
import { DEFAULT_CESTA_TICKET, INITIAL_FORMATO_14100 } from '../data/mockData';
import { historyDatabaseService } from '../services/historyDatabaseService';
import { DatabaseHistoryModal } from './DatabaseHistoryModal';

export interface ChatInterfaceProps {
  onOpenDocument: (
    type: DocumentType,
    paystub?: PaystubData,
    letter?: WorkLetterConfig,
    formato?: Formato14100Data,
    worker?: WorkerProfile,
    cestaTicket?: CestaTicketData
  ) => void;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onOpenDocument, className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_BOT_MESSAGES);
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

  // Database History States
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isMysqlConnected, setIsMysqlConnected] = useState<boolean | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isListening]);

  useEffect(() => {
    // 1. Cargar mensaje de bienvenida y menú dinámico desde MySQL
    engine.loadConfigAndMenu().then(() => {
      const welcome = engine.getWelcomeMessage();
      const prompt = engine.getPromptFichaMessage();
      const initialMsgs: ChatMessage[] = [
        {
          id: 'msg-init-welcome',
          sender: 'bot',
          text: welcome,
          timestamp: 'Ahora'
        },
        {
          id: 'msg-init-ficha',
          sender: 'bot',
          text: prompt,
          timestamp: 'Ahora'
        }
      ];
      setMessages(initialMsgs);

      // 2. Inicializar sesión de usuario en base de datos MySQL (con registro de sección)
      const worker = engine.getWorker();
      historyDatabaseService.registerSession(worker);

      // Guardar mensajes iniciales en el historial
      initialMsgs.forEach((msg) => {
        historyDatabaseService.saveMessage(msg, worker);
      });
    });

    // 3. Consultar estado de conexión a MySQL
    historyDatabaseService.getDbStatus().then((status) => {
      if (status) {
        setIsMysqlConnected(status.isMysqlConnected);
      }
    });

    return () => {
      voiceService.stop();
      voiceService.stopListening();
    };
  }, []);

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
    setMicStatusText('🎙️ Escuchando... Di el código de ficha');

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

    if (actionId === 'open_carta_modal') {
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

    if (actionId === 'open_cesta_modal') {
      onOpenDocument('cesta_ticket', undefined, undefined, undefined, engine.getWorker(), DEFAULT_CESTA_TICKET);
      return;
    }

    if (actionId === 'open_14100_modal') {
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
      // Actualizar sesión del usuario (registrando su ficha, nombre y sección laboral)
      historyDatabaseService.registerSession(activeWorker);
      // Guardar respuestas del asistente en MySQL
      botResponses.forEach((bMsg) => {
        historyDatabaseService.saveMessage(bMsg, activeWorker);
      });

      if (isVoiceEnabled && botResponses.length > 0) {
        speakMessages(botResponses);
      }
    }, 400);
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

    // Iniciar nueva sesión en base de datos MySQL y registrar los mensajes de bienvenida y ficha
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
    if (actionId.startsWith('f14100_motivo_')) return `Motivo: ${actionId.replace('f14100_motivo_', '')}`;
    return 'Seleccionar';
  };

  const isAuth = engine.isAuthenticated();
  const currentWorker = engine.getWorker();

  return (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 ${className}`}>
      {/* 1. Context Status Bar */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 sm:px-4 py-2 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAuth ? 'bg-emerald-400' : 'bg-blue-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAuth ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {isAuth
              ? `Ficha ${currentWorker.id} · ${currentWorker.nombres}`
              : engine.isWaitingForOtp()
              ? 'Validación de Código OTP'
              : 'Verificación de Ficha'}
          </span>

          {/* Speaking Audio Waves Indicator */}
          {isSpeaking && (
            <div className="hidden sm:flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium border border-blue-200 dark:border-blue-800 animate-pulse shrink-0">
              <span className="w-1 h-2 bg-blue-600 rounded-full animate-bounce"></span>
              <span className="w-1 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-1 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              <span className="ml-0.5">Hablando...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón Prominente de Nueva Conversación */}
          <button
            onClick={handleResetChat}
            title="Iniciar nueva conversación"
            className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 dark:bg-blue-950/70 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[380px]:inline">Nueva Conversación</span>
            <span className="inline min-[380px]:hidden">Nueva</span>
          </button>

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 rounded-lg hover:bg-rose-100 transition-colors text-xs flex items-center gap-1 border border-rose-200 dark:border-rose-900 cursor-pointer"
              title="Detener voz"
            >
              <Square className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-semibold hidden md:inline">Detener</span>
            </button>
          )}

          <button
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setIsVoiceEnabled(!isVoiceEnabled);
            }}
            className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
              isVoiceEnabled
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isVoiceEnabled ? 'Voz activada (clic para silenciar)' : 'Voz silenciada (clic para activar)'}
          >
            {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px] font-medium">
              {isVoiceEnabled ? 'Voz' : 'Mudo'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Messages List */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Mensajes del chat de atención al trabajador OESVICA"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs text-sm leading-relaxed transition-all relative group ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
              }`}
            >
              {/* Message text with basic markdown and links */}
              <div className="whitespace-pre-line text-[13px] sm:text-[14px]">
                {msg.text.split('\n').map((line, idx) => {
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
                            <code key={pIdx} className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
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
                })}
              </div>

              {/* In-chat Document Previews */}
              {msg.documentPayload && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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

                  {msg.documentPayload.type === 'cesta_ticket' && (
                    <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-slate-900 dark:text-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 uppercase">
                          <Utensils className="w-4 h-4 text-amber-600" />
                          Cesta Ticket Socialista (Alimentación)
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                          ENVIADO
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <p>
                          • <strong>Mes de Acreditación:</strong> {(msg.documentPayload.data as CestaTicketData).mes} {(msg.documentPayload.data as CestaTicketData).ano}
                        </p>
                        {(msg.documentPayload.data as CestaTicketData).ficha && (
                          <p>
                            • <strong>Código Ficha:</strong> <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{(msg.documentPayload.data as CestaTicketData).ficha}</code>
                          </p>
                        )}
                        {(msg.documentPayload.data as CestaTicketData).estatus && (
                          <p>
                            • <strong>Estatus:</strong> {(msg.documentPayload.data as CestaTicketData).estatus}
                          </p>
                        )}
                      </div>
                      {(msg.documentPayload.data as CestaTicketData).linkPdf && (
                        <div className="pt-1.5">
                          <a
                            href={(msg.documentPayload.data as CestaTicketData).linkPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Descargar Cesta Ticket (PDF)
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.documentPayload.type === 'formato_14100' && (
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3 text-slate-900 dark:text-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          Forma 14-100 IVSS Aprobada
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded">
                          OFICIAL
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Semanas acreditadas: <strong>{(msg.documentPayload.data as Formato14100Data).semanasTotalesAcreditadas} semanas</strong>
                      </p>
                      <button
                        onClick={() =>
                          onOpenDocument(
                            'formato_14100',
                            undefined,
                            undefined,
                            msg.documentPayload?.data as Formato14100Data,
                            engine.getWorker()
                          )
                        }
                        className="mt-2.5 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Visualizar e Imprimir Forma 14-100
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick reply buttons */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5">
                  {msg.quickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleSend(reply.label, reply.action)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                        reply.category === 'primary'
                          ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] mt-2 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                <span className={msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}>
                  {msg.timestamp}
                </span>

                {msg.sender === 'bot' && (
                  <button
                    onClick={() => {
                      if (currentlySpeakingMsgId === msg.id && isSpeaking) {
                        stopSpeaking();
                      } else {
                        speakText(msg.text, msg.id);
                      }
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      currentlySpeakingMsgId === msg.id && isSpeaking
                        ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/70'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={currentlySpeakingMsgId === msg.id && isSpeaking ? 'Detener voz' : 'Escuchar este mensaje'}
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>{currentlySpeakingMsgId === msg.id && isSpeaking ? 'Detener' : 'Escuchar'}</span>
                  </button>
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
              <span className="ml-1 text-[11px] text-slate-500">
                {engine.isWaitingForOtp() ? 'Validando código OTP...' : 'Verificando en OESVICA...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {isListening && (
        <div className="px-4 py-2 bg-blue-600 text-white text-xs font-medium flex items-center justify-between animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
            <span>{micStatusText || '🎙️ Escuchando...'}</span>
          </div>
          <button
            onClick={toggleMicListening}
            className="text-[11px] underline font-bold px-1 cursor-pointer"
          >
            Detener
          </button>
        </div>
      )}

      {/* 4. Text & Microphone Input Area */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleMicListening}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 scale-105'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
            }`}
            title={isListening ? 'Detener micrófono' : 'Dictar por voz'}
          >
            {isListening ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Escuchando tu voz...'
                : isAuth
                ? 'Escriba su consulta o elija una opción del menú...'
                : engine.isWaitingForOtp()
                ? 'Ingrese el código OTP recibido en mensajería OESVICA...'
                : 'Ingrese el código de su ficha carnet (ejemplo:00????)...'
            }
            aria-label="Mensaje para el asistente"
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-sm shrink-0 cursor-pointer"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Modal de Historial de Sesiones y Conversaciones MySQL */}
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
