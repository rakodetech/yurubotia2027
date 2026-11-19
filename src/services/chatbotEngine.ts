import { ChatMessage, CestaTicketData, DocumentType, DynamicMenuOption, Formato14100Data, OesvicaApiResponse, PaystubData, QuickReply, WorkerProfile, WorkLetterConfig } from '../types';
import { COMPANY_INFO, CURRENT_WORKER, DEFAULT_CESTA_TICKET, INITIAL_FORMATO_14100 } from '../data/mockData';
import { verifyFichaApi } from './fichaApiService';
import { sendRecibosToWebhook, buildReciboLinks } from './reciboWebhookService';
import { requestCartaTrabajoWebhook } from './cartaTrabajoWebhookService';
import { sendOtpWebhook } from './otpWebhookService';
import { sendCestaTicketWebhook } from './cestaTicketWebhookService';
import { requestFormato14100Webhook, calculateAge } from './formato14100WebhookService';
import { historyDatabaseService } from './historyDatabaseService';
import { GoogleGenAI } from '@google/genai';

// The 4 requested menu options once ficha is verified
export const OESVICA_MENU_QUICK_REPLIES: QuickReply[] = [
  { id: 'qr-recibos', label: '📄 Recibos de pagos', action: 'action_recibos', category: 'primary' },
  { id: 'qr-carta', label: '📜 Carta de Trabajo', action: 'action_carta', category: 'primary' },
  { id: 'qr-cesta', label: '🍽️ Cesta Ticket', action: 'action_cesta_ticket', category: 'primary' },
  { id: 'qr-14100', label: '🏛️ Forma14100', action: 'action_14100', category: 'primary' },
];

export const WELCOME_MESSAGE_TEXT = 'Hola, Mi Nombre es OESVICA y  estoy aqui para asistirte con cualquier consulta o gestion relacionada con tu bienestar laboral .Puedo ayudarte con temas como Recibos de pagos , Carta de trabajo , Cesta Tickets y otros asuntos de atencion social para los trabjadores,Si necesita información o apoyo  !no dudes en preguntarme !';
export const PROMPT_FICHA_TEXT = 'Me puede suministrar el codigo de su ficha que aparece en el carnet oesvica , por ejemplo:00???? coloque todos los digitos .';

// Initial prompt strictly as requested by user
export const INITIAL_BOT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-welcome',
    sender: 'bot',
    text: WELCOME_MESSAGE_TEXT,
    timestamp: 'Ahora'
  },
  {
    id: 'msg-init-ficha',
    sender: 'bot',
    text: PROMPT_FICHA_TEXT,
    timestamp: 'Ahora'
  }
];

export const SPANISH_MONTHS = [
  { num: '01', name: 'Enero' },
  { num: '02', name: 'Febrero' },
  { num: '03', name: 'Marzo' },
  { num: '04', name: 'Abril' },
  { num: '05', name: 'Mayo' },
  { num: '06', name: 'Junio' },
  { num: '07', name: 'Julio' },
  { num: '08', name: 'Agosto' },
  { num: '09', name: 'Septiembre' },
  { num: '10', name: 'Octubre' },
  { num: '11', name: 'Noviembre' },
  { num: '12', name: 'Diciembre' }
];

export class ChatbotEngine {
  private authenticatedWorker: WorkerProfile | null = null;
  private pendingWorker: WorkerProfile | null = null;
  private pendingOtp: string | null = null;
  private currentContext: {
    pendingFlow?: 'carta_trabajo' | 'recibo_pago' | 'cesta_ticket' | 'formato_14100';
    cartaStep?: 'tipo' | 'formato' | 'ready';
    cartaTipo?: 'con_sueldo' | 'sin_sueldo';
    formatoStep?: 'motivo' | 'ready';
    formatoConfig?: Partial<Formato14100Data>;
    reciboStep?: 'ano' | 'mes' | 'quincena';
    reciboAno?: string;
    reciboMes?: string;
    cestaStep?: 'mes' | 'ready';
  } = {};

  private dynamicWelcomeMessage: string = WELCOME_MESSAGE_TEXT;
  private dynamicPromptFichaMessage: string = PROMPT_FICHA_TEXT;
  private dynamicMenuTitle: string = 'Menú de opciones para **{nombre}** (Ficha `{ficha}`):';
  private dynamicMenuOptions: DynamicMenuOption[] = [];

  /**
   * Carga la configuración del chatbot y las opciones del menú principal directamente desde MySQL
   */
  public async loadConfigAndMenu(): Promise<void> {
    try {
      const [config, menuList] = await Promise.all([
        historyDatabaseService.getChatConfig(),
        historyDatabaseService.getActiveMenu()
      ]);

      if (config) {
        if (config.welcomeMessage) this.dynamicWelcomeMessage = config.welcomeMessage;
        if (config.promptFichaMessage) this.dynamicPromptFichaMessage = config.promptFichaMessage;
        if (config.menuTitle) this.dynamicMenuTitle = config.menuTitle;
      }

      if (menuList && menuList.length > 0) {
        this.dynamicMenuOptions = menuList;
      }
    } catch (err) {
      console.warn('[ChatbotEngine] Error cargando config y menú dinámico:', err);
    }
  }

  public getWelcomeMessage(): string {
    return this.dynamicWelcomeMessage || WELCOME_MESSAGE_TEXT;
  }

  public getPromptFichaMessage(): string {
    return this.dynamicPromptFichaMessage || PROMPT_FICHA_TEXT;
  }

  public getMenuQuickReplies(): QuickReply[] {
    if (this.dynamicMenuOptions && this.dynamicMenuOptions.length > 0) {
      return this.dynamicMenuOptions.map((opt) => ({
        id: `qr-${opt.id_opcion || opt.action}`,
        label: opt.label,
        action: opt.action,
        category: (opt.categoria as any) || 'primary',
        endpointUrl: opt.endpoint_url,
        endpointMethod: opt.endpoint_method,
        endpointBodyType: opt.endpoint_body_type,
        endpointBodyTemplate: opt.endpoint_body_template,
        mensajeConfirmacion: opt.mensaje_confirmacion
      }));
    }
    return OESVICA_MENU_QUICK_REPLIES;
  }

  public getWorker(): WorkerProfile {
    return this.authenticatedWorker || CURRENT_WORKER;
  }

  public isAuthenticated(): boolean {
    return this.authenticatedWorker !== null;
  }

  public isWaitingForOtp(): boolean {
    return !this.authenticatedWorker && this.pendingOtp !== null;
  }

  public resetToPrompt(): ChatMessage[] {
    this.authenticatedWorker = null;
    this.pendingWorker = null;
    this.pendingOtp = null;
    this.currentContext = {};
    return [
      {
        id: `bot-init-welcome-${Date.now()}`,
        sender: 'bot',
        text: this.getWelcomeMessage(),
        timestamp: 'Ahora'
      },
      {
        id: `bot-init-ficha-${Date.now() + 1}`,
        sender: 'bot',
        text: this.getPromptFichaMessage(),
        timestamp: 'Ahora'
      }
    ];
  }

  public getMenuMessage(): ChatMessage {
    const worker = this.getWorker();
    const quickReplies = this.getMenuQuickReplies();
    const menuTitle = (this.dynamicMenuTitle || 'Menú de opciones para **{nombre}** (Ficha `{ficha}`):')
      .replace(/{nombre}/g, worker.nombres)
      .replace(/{ficha}/g, worker.id);

    return {
      id: `bot-menu-${Date.now()}`,
      sender: 'bot',
      text: menuTitle,
      timestamp: 'Ahora',
      actionType: 'show_menu',
      quickReplies: [
        ...quickReplies,
        { id: 'qr-new-chat', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
      ]
    };
  }

  public async processInput(text: string, actionId?: string): Promise<ChatMessage[]> {
    const responses: ChatMessage[] = [];
    const normalized = text.toLowerCase().trim();

    // 1. If user wants to reset or start a new conversation
    if (
      actionId === 'action_new_chat' ||
      actionId === 'action_logout' ||
      normalized === 'nueva conversacion' ||
      normalized === 'nueva conversación' ||
      normalized === 'reiniciar' ||
      normalized === 'cambiar ficha' ||
      normalized === 'salir'
    ) {
      this.authenticatedWorker = null;
      this.pendingWorker = null;
      this.pendingOtp = null;
      this.currentContext = {};
      responses.push({
        id: `bot-welcome-${Date.now()}`,
        sender: 'bot',
        text: this.getWelcomeMessage(),
        timestamp: 'Ahora'
      });
      responses.push({
        id: `bot-prompt-${Date.now() + 1}`,
        sender: 'bot',
        text: this.getPromptFichaMessage(),
        timestamp: 'Ahora'
      });
      return responses;
    }

    // 2. USER IS NOT VERIFIED YET
    if (!this.authenticatedWorker) {
      // 2A. Awaiting OTP code verification
      if (this.pendingOtp !== null && this.pendingWorker !== null) {
        // Option to resend OTP
        if (
          actionId === 'action_resend_otp' ||
          normalized === 'reenviar' ||
          normalized === 'reenviar codigo' ||
          normalized === 'reenviar código' ||
          normalized === 'reenviar otp' ||
          normalized === 'otro codigo'
        ) {
          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          this.pendingOtp = newOtp;
          const auxficha = this.pendingWorker.id.trim();

          const otpRes = await sendOtpWebhook(newOtp, auxficha);

          if (!otpRes.success) {
            responses.push({
              id: `bot-otp-resend-err-${Date.now()}`,
              sender: 'bot',
              text: `⚠️ **Error de conexión al reenviar el código OTP:** ${otpRes.error || 'No se pudo contactar el servicio de mensajería OESVICA'}.\n\nVerifique que el servidor backend esté activo (ej. \`npm start\`) e intente nuevamente.`,
              timestamp: 'Ahora',
              actionType: 'prompt_otp',
              quickReplies: [
                { id: 'qr-resend-otp', label: '📲 Reintentar Envío OTP', action: 'action_resend_otp', category: 'primary' },
                { id: 'qr-new-chat-init', label: '🔄 Cambiar Ficha', action: 'action_new_chat' }
              ]
            });
            return responses;
          }

          responses.push({
            id: `bot-otp-resend-${Date.now()}`,
            sender: 'bot',
            text: `Se le ha reenviado un nuevo código de verificación OTP a la mensajería OESVICA.\n\nPor favor, suministre el código OTP enviado:`,
            timestamp: 'Ahora',
            actionType: 'prompt_otp',
            quickReplies: [
              { id: 'qr-resend-otp', label: '📲 Reenviar Código OTP', action: 'action_resend_otp' },
              { id: 'qr-new-chat-init', label: '🔄 Cambiar Ficha', action: 'action_new_chat' }
            ]
          });
          return responses;
        }

        // Validate the OTP provided by the user
        const cleanInput = text.trim();
        const digitsOnly = cleanInput.replace(/\D/g, '');
        const isMatch = (digitsOnly && digitsOnly === this.pendingOtp) || (cleanInput === this.pendingOtp);

        if (isMatch) {
          // OTP valid! Activate session and show welcome and menu
          this.authenticatedWorker = this.pendingWorker;
          const worker = this.authenticatedWorker;
          this.pendingWorker = null;
          this.pendingOtp = null;
          this.currentContext = {};

          responses.push({
            id: `bot-ok-${Date.now()}`,
            sender: 'bot',
            text: `✅ Ficha **${worker.id}** verificada con éxito.\n\n¡Bienvenido(a), **${worker.nombres}**!\n• **Cargo:** ${worker.cargo}\n• **Cédula:** ${worker.cedula}\n• **Ubicación:** ${worker.ubicacion}`,
            timestamp: 'Ahora'
          });

          // Presentar el menú dinámico cargado desde MySQL
          responses.push(this.getMenuMessage());

          return responses;
        } else {
          // OTP invalid
          responses.push({
            id: `bot-err-${Date.now()}`,
            sender: 'bot',
            text: `❌ El código OTP suministrado no es válido.\n\nPor favor, suministre el código OTP enviado a la mensajería OESVICA:`,
            timestamp: 'Ahora',
            actionType: 'prompt_otp',
            quickReplies: [
              { id: 'qr-resend-otp', label: '📲 Reenviar Código OTP', action: 'action_resend_otp', category: 'primary' },
              { id: 'qr-new-chat-init', label: '🔄 Cambiar Ficha', action: 'action_new_chat' }
            ]
          });
          return responses;
        }
      }

      // 2B. User supplies the ficha code
      const candidateCode = (actionId && actionId.startsWith('login_ficha_'))
        ? actionId.replace('login_ficha_', '')
        : text.trim();

      const verification = await verifyFichaApi(candidateCode);

      if (!verification.exists || !verification.worker) {
        if (verification.error) {
          responses.push({
            id: `bot-err-${Date.now()}`,
            sender: 'bot',
            text: `⚠️ **Aviso de conexión:** ${verification.error}\n\nPor favor verifique su conexión e ingrese su código de ficha nuevamente.`,
            timestamp: 'Ahora'
          });
          return responses;
        }

        responses.push({
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `❌ La ficha **"${candidateCode}"** no existe en el sistema OESVICA.\n\n${this.getPromptFichaMessage()}`,
          timestamp: 'Ahora'
        });
        return responses;
      }

      // Worker exists! Build candidate profile
      const apiData = verification.worker;
      this.pendingWorker = {
        id: apiData.cod_ficha,
        cedula: apiData.cedula || 'N/D',
        nombres: apiData.ap_nombre,
        apellidos: '',
        cargo: apiData.cargo || 'INSPECTOR DE SEGURIDAD',
        departamento: apiData.contrato || 'OPERACIONES OESVICA',
        fechaIngreso: apiData.fec_ingreso || '15/03/2021',
        tipoContrato: apiData.contrato || 'Tiempo Indeterminado',
        sueldoMensualBs: 18500.00,
        sueldoMensualUsdRef: 450.00,
        banco: 'Banco Mercantil',
        numeroCuenta: '0105-0024-81-1024567890',
        afiliacionIVSS: `IVSS-${apiData.cod_ficha}`,
        diasVacacionesDisponibles: 18,
        email: apiData.correo && apiData.correo !== 'nan' ? apiData.correo : 'trabajador@oesvica.com',
        telefono: apiData.telefono && apiData.telefono !== 'nan' ? apiData.telefono : '+58 (412) 000-0000',
        direccion: apiData.ubicacion || 'Valencia, Carabobo',
        ubicacion: apiData.ubicacion || 'OFICINAS ADMON VALENCIA',
        cliente: apiData.cliente || COMPANY_INFO.nombre,
        statusLaboral: apiData.status || 'ACTIVO',
        codContrato: apiData.cod_contrato || '001',
        fechaNacimiento: apiData.fec_nacimiento || '',
      };

      // Generate OTP code
      const codigootp = Math.floor(100000 + Math.random() * 900000).toString();
      this.pendingOtp = codigootp;
      const auxficha = this.pendingWorker.id.trim();

      // Dispatch OTP to webhook http://212.56.33.4:5678/webhook/v8/otpapplicationoesvica
      // Body URL encoded: codigo={codigootp}&ficha={auxficha}
      const otpRes = await sendOtpWebhook(codigootp, auxficha);

      if (!otpRes.success) {
        responses.push({
          id: `bot-otp-err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Ficha **${auxficha}** verificada, pero ocurrió un error al enviar el código OTP: ${otpRes.error || 'Sin conexión con el webhook de mensajería'}.\n\nSi está ejecutando la versión compilada localmente, asegúrese de iniciarla con \`npm start\` o \`npm run preview\`.`,
          timestamp: 'Ahora',
          actionType: 'prompt_otp',
          quickReplies: [
            { id: 'qr-resend-otp', label: '📲 Reintentar Envío OTP', action: 'action_resend_otp', category: 'primary' },
            { id: 'qr-new-chat-init', label: '🔄 Cambiar Ficha', action: 'action_new_chat' }
          ]
        });
        return responses;
      }

      // Inform user that OTP was sent without showing it in the chatbot
      responses.push({
        id: `bot-otp-${Date.now()}`,
        sender: 'bot',
        text: `Se le ha enviado el código OTP a la mensajería OESVICA.\n\nPor favor, suministre el código OTP enviado para activar el menú de opciones:`,
        timestamp: 'Ahora',
        actionType: 'prompt_otp',
        quickReplies: [
          { id: 'qr-resend-otp', label: '📲 Reenviar Código OTP', action: 'action_resend_otp' },
          { id: 'qr-new-chat-init', label: '🔄 Cambiar Ficha', action: 'action_new_chat' }
        ]
      });

      return responses;
    }

    // ===============================================
    // USER IS VERIFIED -> Process requested services
    // ===============================================

    const worker = this.getWorker();

    if (actionId === 'action_main_menu' || normalized === 'menu' || normalized === 'inicio') {
      responses.push(this.getMenuMessage());
      return responses;
    }

    // Handle Quick Reply Actions
    if (actionId) {
      return await this.handleActionId(actionId);
    }

    // Contextual Flows
    if (this.currentContext.pendingFlow === 'carta_trabajo') {
      return await this.handleCartaTrabajoFlow(text);
    }

    if (this.currentContext.pendingFlow === 'recibo_pago') {
      return await this.handleReciboFlow(text);
    }

    if (this.currentContext.pendingFlow === 'cesta_ticket') {
      return await this.handleCestaTicketFlow(text);
    }

    if (this.currentContext.pendingFlow === 'formato_14100') {
      return await this.handleFormato14100Flow(text);
    }

    // Keyword Recognition for the 4 options
    if (normalized.includes('recibo') || normalized.includes('pago') || normalized.includes('quincena') || normalized.includes('nomina')) {
      return await this.handleActionId('action_recibos');
    }

    if (normalized.includes('carta') || normalized.includes('constancia') || normalized.includes('trabajo')) {
      return await this.handleActionId('action_carta');
    }

    if (normalized.includes('cesta') || normalized.includes('ticket') || normalized.includes('cestaticket') || normalized.includes('cestatickets') || normalized.includes('alimentacion')) {
      return await this.handleActionId('action_cesta_ticket');
    }

    if (normalized.includes('14100') || normalized.includes('14-100') || normalized.includes('forma14100') || normalized.includes('ivss')) {
      return await this.handleActionId('action_14100');
    }

    // AI or fallback assistance
    const aiResponse = await this.tryGeminiResponse(text);
    if (aiResponse) {
      responses.push({
        id: `bot-ai-${Date.now()}`,
        sender: 'bot',
        text: aiResponse,
        timestamp: 'Ahora',
        quickReplies: OESVICA_MENU_QUICK_REPLIES
      });
      return responses;
    }

    responses.push({
      id: `bot-default-${Date.now()}`,
      sender: 'bot',
      text: `He recibido su consulta. Para asistirle de inmediato, por favor seleccione una de las opciones disponibles:`,
      timestamp: 'Ahora',
      actionType: 'show_menu',
      quickReplies: OESVICA_MENU_QUICK_REPLIES
    });

    return responses;
  }

  private async handleActionId(actionId: string): Promise<ChatMessage[]> {
    const responses: ChatMessage[] = [];
    const worker = this.getWorker();

    switch (actionId) {
      // 1. RECIBOS DE PAGOS
      case 'action_recibos': {
        this.currentContext.pendingFlow = 'recibo_pago';
        this.currentContext.reciboStep = 'ano';
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = 2024;
        const availableYears: number[] = [];
        for (let y = startYear; y <= Math.max(startYear, currentYear); y++) {
          availableYears.push(y);
        }

        responses.push({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `📄 **Recibos de pagos · OESVICA**\n\nPor favor, seleccione el año de consulta:`,
          timestamp: 'Ahora',
          actionType: 'prompt_paystub_year',
          quickReplies: [
            ...availableYears.map((y) => ({
              id: `rec_ano_${y}`,
              label: `📅 ${y}`,
              action: `rec_ano_${y}`,
              category: 'primary' as const
            })),
            { id: 'rec-menu', label: '↩️ Volver al Menú', action: 'action_main_menu' }
          ]
        });
        break;
      }

      // 2. CARTA DE TRABAJO
      case 'action_carta': {
        this.currentContext.pendingFlow = 'carta_trabajo';
        this.currentContext.cartaStep = 'tipo';
        responses.push({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Tipo de carta de trabajo : Con sueldo integral o Sin sueldo`,
          timestamp: 'Ahora',
          actionType: 'prompt_letter_type',
          quickReplies: [
            { id: 'carta-sueldo-integral', label: 'Con sueldo integral', action: 'carta_tipo_con_sueldo', category: 'primary' },
            { id: 'carta-sin-sueldo', label: 'Sin sueldo', action: 'carta_tipo_sin_sueldo', category: 'primary' },
            { id: 'carta-cancel', label: '↩️ Volver al Menú', action: 'action_main_menu' }
          ]
        });
        break;
      }

      case 'carta_tipo_con_sueldo':
      case 'carta_tipo_sin_sueldo': {
        this.currentContext.cartaTipo = actionId === 'carta_tipo_con_sueldo' ? 'con_sueldo' : 'sin_sueldo';
        this.currentContext.cartaStep = 'formato';
        responses.push({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Como le gustaria el tipo de formato de la carta de trabajo : Firma y Sello digitalizado (Pdf) y Fisico con sello humedo .`,
          timestamp: 'Ahora',
          actionType: 'prompt_letter_format',
          quickReplies: [
            { id: 'carta-fmt-digital', label: 'Firma y Sello digitalizado (Pdf)', action: 'carta_formato_digital', category: 'primary' },
            { id: 'carta-fmt-fisico', label: 'Fisico con sello humedo', action: 'carta_formato_fisico', category: 'primary' },
            { id: 'carta-cancel', label: '↩️ Volver al Menú', action: 'action_main_menu' }
          ]
        });
        break;
      }

      case 'carta_formato_digital': {
        const incluirSueldo = this.currentContext.cartaTipo === 'con_sueldo';
        const tipoLabel = incluirSueldo ? 'Con sueldo integral' : 'Sin sueldo';
        const contratoibarti = worker.codContrato || '001';
        const auxficha = worker.id.trim();

        // Perform POST request to http://212.56.33.4:5678/webhook/api/v20/cartatrabajo with URL-encoded body
        const webhookResult = await requestCartaTrabajoWebhook(contratoibarti, auxficha);

        this.currentContext = {};

        let linkPdf: string | undefined = undefined;
        if (webhookResult?.data && typeof webhookResult.data === 'object') {
          linkPdf = webhookResult.data.url || webhookResult.data.link || webhookResult.data.pdf || undefined;
        }

        responses.push({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `✅ **Solicitud de Carta de Trabajo procesada exitosamente**\n\n• **Trabajador:** ${worker.nombres}\n• **Ficha:** \`${auxficha}\`\n• **Tipo:** ${tipoLabel}\n• **Formato:** Firma y Sello digitalizado (Pdf)\n• **Código de Contrato:** \`${contratoibarti}\`\n\nSu carta de trabajo con firma y sello digitalizado ha sido generada y enviada a la plataforma OESVICA sección Notificaciones.${linkPdf ? `\n\n• **Descarga directa:** [Abrir Carta PDF](${linkPdf})` : ''}`,
          timestamp: 'Ahora',
          actionType: 'preview_work_letter',
          documentPayload: {
            type: 'carta_trabajo',
            data: {
              incluirSueldo,
              formato: 'digital',
              fechaEmision: new Date().toLocaleDateString('es-VE'),
              codigoValidacion: `VAL-OESVICA-${Date.now().toString(36).toUpperCase()}`,
              codContrato: contratoibarti,
              codFicha: auxficha,
              statusEnvio: 'ENVIADO A NOTIFICACIONES',
              linkPdf
            }
          },
          quickReplies: [
            { id: 'carta-again', label: '📜 Carta de Trabajo', action: 'action_carta' },
            { id: 'carta-menu', label: '🏠 Menú Principal', action: 'action_main_menu' },
            { id: 'carta-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
          ]
        });
        break;
      }

      case 'carta_formato_fisico': {
        const incluirSueldo = this.currentContext.cartaTipo === 'con_sueldo';
        const tipoLabel = incluirSueldo ? 'Con sueldo integral' : 'Sin sueldo';
        const auxficha = worker.id.trim();
        const contratoibarti = worker.codContrato || '001';
        this.currentContext = {};

        responses.push({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `🏢 **Solicitud de Carta de Trabajo en Físico Registrada**\n\n• **Trabajador:** ${worker.nombres}\n• **Ficha:** \`${worker.id}\`\n• **Tipo:** ${tipoLabel}\n• **Formato:** Físico con sello húmedo\n\nSu solicitud ha sido registrada en el departamento de Recursos Humanos de OESVICA. Puede retirar su carta física con sello húmedo en la oficina de Administración / RRHH en un plazo de 24 a 48 horas hábiles.`,
          timestamp: 'Ahora',
          actionType: 'preview_work_letter',
          documentPayload: {
            type: 'carta_trabajo',
            data: {
              incluirSueldo,
              formato: 'fisico',
              fechaEmision: new Date().toLocaleDateString('es-VE'),
              codigoValidacion: `SOL-FISICO-${Date.now().toString(36).toUpperCase()}`,
              codContrato: contratoibarti,
              codFicha: auxficha,
              statusEnvio: 'PENDIENTE DE RETIRO EN RRHH'
            }
          },
          quickReplies: [
            { id: 'carta-again', label: '📜 Carta de Trabajo', action: 'action_carta' },
            { id: 'carta-menu', label: '🏠 Menú Principal', action: 'action_main_menu' },
            { id: 'carta-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
          ]
        });
        break;
      }

      // 3. CESTA TICKET
      case 'action_cesta_ticket': {
        this.currentContext.pendingFlow = 'cesta_ticket';
        this.currentContext.cestaStep = 'mes';
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1; // 1 to 12
        const availableMonths = SPANISH_MONTHS.slice(0, currentMonthNum);

        responses.push({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `🍽️ **Cesta Ticket Socialista (Alimentación)**\n\nPor favor, seleccione el mes de consulta de Cesta Ticket (Enero a ${availableMonths[availableMonths.length - 1].name} ${currentYear}):`,
          timestamp: 'Ahora',
          actionType: 'prompt_cesta_month',
          quickReplies: [
            ...availableMonths.map((m) => ({
              id: `ct_mes_${m.num}`,
              label: `🗓️ ${m.name}`,
              action: `ct_mes_${m.num}`,
              category: 'primary' as const
            })),
            { id: 'ct-menu', label: '↩️ Volver al Menú', action: 'action_main_menu' }
          ]
        });
        break;
      }

      // 4. FORMA14100 (IVSS)
      case 'action_14100': {
        this.currentContext = {};
        const auxficha = worker.id.trim();

        // 1. Verificar la edad del usuario en el endpoint http://ibarti.ddns.net/api-ibarti2/ficha/verify/?ficha
        const verification = await verifyFichaApi(auxficha);
        const fecNacimiento = verification.worker?.fec_nacimiento || worker.fechaNacimiento || '';

        // 2. Calcular la edad de acuerdo a la fecha de nacimiento
        const age = calculateAge(fecNacimiento);

        if (age !== null && age >= 55) {
          // Edad >= 55: llamada al endpoint http://212.56.33.4:5678/webhook/api/v21/formato14100 tipo formdata con body: {cod_ficha: auxficha}
          await requestFormato14100Webhook(auxficha);

          responses.push({
            id: `bot-14100-${Date.now()}`,
            sender: 'bot',
            text: `Se le ha enviado el formato14100 a la aplicacion mensajeria oesvica .\n\n• **Trabajador:** ${worker.nombres}\n• **Ficha:** \`${auxficha}\`\n• **Cédula:** ${worker.cedula}\n• **Edad:** ${age} años (Cumple con el requisito mínimo de 55 años)`,
            timestamp: 'Ahora',
            quickReplies: [
              { id: 'f14100-menu', label: '🏠 Menú Principal', action: 'action_main_menu' },
              { id: 'f14100-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
            ]
          });
        } else {
          // Edad < 55 o no determinada: informar que no tiene edad para la solicitud
          const ageDetail = age !== null ? ` (Edad registrada: ${age} años)` : '';
          responses.push({
            id: `bot-14100-err-${Date.now()}`,
            sender: 'bot',
            text: `El usuario segun ficha no tiene edad para la solicitud de la Forma14100.${ageDetail}\n\n• **Ficha:** \`${auxficha}\` (${worker.nombres})\n• **Requisito legal:** Para solicitar la Forma14100 de pensión se requiere una edad mínima de 55 años cumplidos.`,
            timestamp: 'Ahora',
            quickReplies: [
              { id: 'f14100-menu', label: '🏠 Menú Principal', action: 'action_main_menu' },
              { id: 'f14100-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
            ]
          });
        }
        break;
      }

      default: {
        // Year selection for Recibos de Pagos
        if (actionId.startsWith('rec_ano_')) {
          const selectedYear = parseInt(actionId.replace('rec_ano_', ''), 10);
          this.currentContext.pendingFlow = 'recibo_pago';
          this.currentContext.reciboStep = 'mes';
          this.currentContext.reciboAno = String(selectedYear);

          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonthNum = now.getMonth() + 1; // 1 to 12

          let availableMonths = SPANISH_MONTHS;
          if (selectedYear >= currentYear) {
            availableMonths = SPANISH_MONTHS.slice(0, currentMonthNum);
          }

          responses.push({
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: `Año seleccionado: **${selectedYear}**.\n\nPor favor, seleccione el mes de consulta:`,
            timestamp: 'Ahora',
            actionType: 'prompt_paystub_month',
            quickReplies: [
              ...availableMonths.map((m) => ({
                id: `rec_mes_${m.num}`,
                label: `🗓️ ${m.name}`,
                action: `rec_mes_${m.num}`,
                category: 'primary' as const
              })),
              { id: 'rec-cambiar-ano', label: '📅 Cambiar Año', action: 'action_recibos' },
              { id: 'rec-menu', label: '↩️ Volver al Menú', action: 'action_main_menu' }
            ]
          });
          return responses;
        }

        // Month selection for Recibos de Pagos
        if (actionId.startsWith('rec_mes_')) {
          const selectedMesNum = actionId.replace('rec_mes_', '');
          this.currentContext.pendingFlow = 'recibo_pago';
          this.currentContext.reciboStep = 'quincena';
          this.currentContext.reciboMes = selectedMesNum;

          const monthObj = SPANISH_MONTHS.find((m) => m.num === selectedMesNum);
          const monthName = monthObj ? monthObj.name : selectedMesNum;
          const ano = this.currentContext.reciboAno || String(new Date().getFullYear());

          responses.push({
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: `Período seleccionado: **${monthName} ${ano}**.\n\nSeleccione la quincena:`,
            timestamp: 'Ahora',
            actionType: 'prompt_paystub_quincena',
            quickReplies: [
              { id: 'rec_q_1', label: '1era Quincena', action: 'rec_q_1', category: 'primary' as const },
              { id: 'rec_q_2', label: '2da Quincena', action: 'rec_q_2', category: 'primary' as const },
              { id: 'rec-cambiar-mes', label: '🗓️ Cambiar Mes', action: `rec_ano_${ano}` },
              { id: 'rec-menu', label: '↩️ Volver al Menú', action: 'action_main_menu' }
            ]
          });
          return responses;
        }

        // Quincena selection for Recibos de Pagos
        if (actionId === 'rec_q_1' || actionId === 'rec_q_2' || actionId === 'recibo_send_q1' || actionId === 'recibo_send_q2') {
          const quincenat = (actionId === 'rec_q_1' || actionId === 'recibo_send_q1') ? '1' : '2';
          const ano = this.currentContext.reciboAno || String(new Date().getFullYear());
          const mesNumero = this.currentContext.reciboMes || String(new Date().getMonth() + 1).padStart(2, '0');
          this.currentContext = {};
          return await this.dispatchReciboWebhook(ano, mesNumero, quincenat);
        }

        // Month selection for Cesta Ticket
        if (actionId.startsWith('ct_mes_')) {
          const selectedMesNum = actionId.replace('ct_mes_', '');
          this.currentContext = {};
          return await this.dispatchCestaTicketWebhook(selectedMesNum);
        }

        if (actionId.startsWith('f14100_motivo_')) {
          return await this.handleActionId('action_14100');
        }

        // Verificar si la acción corresponde a una opción dinámica creada en MySQL con endpoint
        const dynamicOption = this.dynamicMenuOptions.find(
          (m) => m.action === actionId || `qr-${m.id_opcion}` === actionId || `qr-${m.action}` === actionId
        );
        if (dynamicOption && dynamicOption.endpoint_url) {
          return await this.handleDynamicEndpointOption(dynamicOption);
        }

        responses.push(this.getMenuMessage());
      }
    }

    return responses;
  }

  private async handleDynamicEndpointOption(dyn: DynamicMenuOption): Promise<ChatMessage[]> {
    const responses: ChatMessage[] = [];
    const worker = this.getWorker();

    let payload: Record<string, any> = {};
    if (dyn.endpoint_body_template) {
      try {
        const templated = dyn.endpoint_body_template
          .replace(/{ficha}/g, worker.id)
          .replace(/{cod_ficha}/g, worker.id)
          .replace(/{nombre}/g, `${worker.nombres} ${worker.apellidos}`.trim())
          .replace(/{cedula}/g, worker.cedula)
          .replace(/{cargo}/g, worker.cargo)
          .replace(/{seccion}/g, worker.departamento || worker.ubicacion || 'Seguridad y Vigilancia Operativa')
          .replace(/{telefono}/g, worker.telefono || '')
          .replace(/{correo}/g, worker.email || '');
        payload = JSON.parse(templated);
      } catch {
        payload = {
          ficha: worker.id,
          cod_ficha: worker.id,
          nombre: `${worker.nombres} ${worker.apellidos}`.trim(),
          seccion: worker.departamento || worker.ubicacion || 'Seguridad y Vigilancia Operativa'
        };
      }
    } else {
      payload = {
        ficha: worker.id,
        cod_ficha: worker.id,
        nombre: `${worker.nombres} ${worker.apellidos}`.trim(),
        seccion: worker.departamento || worker.ubicacion || 'Seguridad y Vigilancia Operativa'
      };
    }

    const result = await historyDatabaseService.executeDynamicEndpoint(
      dyn.endpoint_url!,
      dyn.endpoint_method || 'POST',
      dyn.endpoint_body_type || 'url_encoded',
      payload
    );

    const confirmation = dyn.mensaje_confirmacion || (result.success
      ? `✅ Solicitud de **${dyn.label}** procesada con éxito.`
      : `⚠️ Se completó el llamado a **${dyn.label}**.`);

    let extraDetail = '';
    if (result.data) {
      if (typeof result.data === 'string') {
        extraDetail = `\n• **Respuesta:** ${result.data}`;
      } else if (result.data.message) {
        extraDetail = `\n• **Respuesta:** ${result.data.message}`;
      }
    }

    responses.push({
      id: `bot-dyn-${Date.now()}`,
      sender: 'bot',
      text: `${confirmation}\n\n• **Trabajador:** ${worker.nombres}\n• **Ficha:** \`${worker.id}\`\n• **Endpoint:** \`${dyn.endpoint_url}\`${extraDetail}`,
      timestamp: 'Ahora',
      quickReplies: [
        { id: 'qr-main', label: '🏠 Menú Principal', action: 'action_main_menu' },
        { id: 'qr-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
      ]
    });

    return responses;
  }

  private async handleCartaTrabajoFlow(text: string): Promise<ChatMessage[]> {
    const lower = text.toLowerCase();

    if (this.currentContext.cartaStep === 'tipo') {
      if (lower.includes('sin')) {
        return await this.handleActionId('carta_tipo_sin_sueldo');
      } else if (lower.includes('con') || lower.includes('sueldo') || lower.includes('integral')) {
        return await this.handleActionId('carta_tipo_con_sueldo');
      }
      return await this.handleActionId('action_carta');
    }

    if (this.currentContext.cartaStep === 'formato') {
      if (lower.includes('digital') || lower.includes('pdf') || lower.includes('firma') || lower.includes('sello digitalizado')) {
        return await this.handleActionId('carta_formato_digital');
      } else if (lower.includes('fisico') || lower.includes('físico') || lower.includes('humedo') || lower.includes('húmedo')) {
        return await this.handleActionId('carta_formato_fisico');
      }

      return [
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Como le gustaria el tipo de formato de la carta de trabajo : Firma y Sello digitalizado (Pdf) y Fisico con sello humedo .`,
          timestamp: 'Ahora',
          actionType: 'prompt_letter_format',
          quickReplies: [
            { id: 'carta-fmt-digital', label: 'Firma y Sello digitalizado (Pdf)', action: 'carta_formato_digital', category: 'primary' },
            { id: 'carta-fmt-fisico', label: 'Fisico con sello humedo', action: 'carta_formato_fisico', category: 'primary' },
            { id: 'carta-cancel', label: '↩️ Volver al Menú', action: 'action_main_menu' }
          ]
        }
      ];
    }

    return [this.getMenuMessage()];
  }

  private async handleReciboFlow(text: string): Promise<ChatMessage[]> {
    const lower = text.toLowerCase().trim();
    const step = this.currentContext.reciboStep || 'ano';

    // Step 1: Year selection
    if (step === 'ano') {
      const matchYear = text.match(/\b(202[4-9]|20[3-9]\d)\b/);
      if (matchYear) {
        return await this.handleActionId(`rec_ano_${matchYear[1]}`);
      }
      return await this.handleActionId('action_recibos');
    }

    // Step 2: Month selection
    if (step === 'mes') {
      for (const m of SPANISH_MONTHS) {
        if (lower.includes(m.name.toLowerCase())) {
          return await this.handleActionId(`rec_mes_${m.num}`);
        }
      }
      const matchNum = text.match(/\b([1-9]|1[0-2])\b/);
      if (matchNum) {
        const num = matchNum[1].padStart(2, '0');
        return await this.handleActionId(`rec_mes_${num}`);
      }
      const ano = this.currentContext.reciboAno || String(new Date().getFullYear());
      return await this.handleActionId(`rec_ano_${ano}`);
    }

    // Step 3: Quincena selection
    if (step === 'quincena') {
      if (lower.includes('1') || lower.includes('primera') || lower.includes('1ra') || lower.includes('1era')) {
        return await this.handleActionId('rec_q_1');
      }
      if (lower.includes('2') || lower.includes('segunda') || lower.includes('2da')) {
        return await this.handleActionId('rec_q_2');
      }
      const mes = this.currentContext.reciboMes || '01';
      return await this.handleActionId(`rec_mes_${mes}`);
    }

    return await this.handleActionId('action_recibos');
  }

  private async dispatchReciboWebhook(ano: string, mesNumero: string, quincenat: string): Promise<ChatMessage[]> {
    const worker = this.getWorker();
    const fichaLimpia = worker.id.trim();
    const aux_ficha = fichaLimpia;

    const { linkRecibo, linkHumani } = buildReciboLinks({
      ficha: fichaLimpia,
      ano,
      mesNumero,
      quincenat
    });

    // Send the two POST requests to http://212.56.33.4:5678/webhook/v9/reciboaplicacionoesvica
    // 1: { url: linkRecibo, ficha: aux_ficha }
    // 2: { url: linkHumani, ficha: aux_ficha }
    await sendRecibosToWebhook({
      ficha: aux_ficha,
      ano,
      mesNumero,
      quincenat
    });

    const monthObj = SPANISH_MONTHS.find((m) => m.num === mesNumero);
    const monthName = monthObj ? monthObj.name : mesNumero;
    const periodLabel = `${quincenat === '1' ? '1era' : '2da'} Quincena (${monthName} ${ano})`;

    return [
      {
        id: `bot-recibo-${Date.now()}`,
        sender: 'bot',
        text: `El recibo de pago fue enviado a la plataforma oesvica seccion notificaciones .\n\n• **Ficha:** \`${aux_ficha}\` (${worker.nombres})\n• **Período:** ${periodLabel}\n• **Recibo PDF:** [Abrir Recibo](${linkRecibo})\n• **Humanis PDF:** [Abrir Humanis](${linkHumani})`,
        timestamp: 'Ahora',
        actionType: 'preview_paystub',
        documentPayload: {
          type: 'recibo_pago',
          data: {
            id: `REC-${aux_ficha}-${ano}${mesNumero}${quincenat}`,
            periodo: periodLabel,
            quincena: quincenat === '1' ? '1era' : '2da',
            mes: mesNumero,
            ano: parseInt(ano, 10),
            fechaPago: new Date().toLocaleDateString('es-VE'),
            diasTrabajados: 15,
            totalAsignaciones: 0,
            totalDeducciones: 0,
            netoPagar: 0,
            tasaCambioBcv: 0,
            asignaciones: [],
            deducciones: [],
            linkRecibo,
            linkHumani
          }
        },
        quickReplies: [
          { id: 'rec-another', label: '📄 Consultar Otro Recibo', action: 'action_recibos' },
          { id: 'rec-menu', label: '🏠 Menú Principal', action: 'action_main_menu' },
          { id: 'rec-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
        ]
      }
    ];
  }

  private async handleCestaTicketFlow(text: string): Promise<ChatMessage[]> {
    const lower = text.toLowerCase().trim();
    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const availableMonths = SPANISH_MONTHS.slice(0, currentMonthNum);

    for (const m of availableMonths) {
      if (lower.includes(m.name.toLowerCase())) {
        return await this.handleActionId(`ct_mes_${m.num}`);
      }
    }

    const matchNum = text.match(/\b([1-9]|1[0-2])\b/);
    if (matchNum) {
      const num = matchNum[1].padStart(2, '0');
      const found = availableMonths.find((m) => m.num === num);
      if (found) {
        return await this.handleActionId(`ct_mes_${num}`);
      }
    }

    return await this.handleActionId('action_cesta_ticket');
  }

  private async dispatchCestaTicketWebhook(mesNumero: string): Promise<ChatMessage[]> {
    const worker = this.getWorker();
    const fichaLimpia = worker.id.trim();
    const aux_ficha = fichaLimpia;
    const now = new Date();
    const ano = String(now.getFullYear());

    const result = await sendCestaTicketWebhook({
      ficha: aux_ficha,
      ano,
      mesNumero
    });

    const monthObj = SPANISH_MONTHS.find((m) => m.num === mesNumero);
    const monthName = monthObj ? monthObj.name : mesNumero;
    const linkcestaticket = result.linkcestaticket;

    return [
      {
        id: `bot-cesta-${Date.now()}`,
        sender: 'bot',
        text: `El comprobante de cesta ticket fue enviado a la plataforma oesvica seccion notificaciones .\n\n• **Beneficiario:** ${worker.nombres} (Ficha \`${aux_ficha}\`)\n• **Mes:** ${monthName} ${ano}\n• **Comprobante PDF:** [Abrir Cesta Ticket](${linkcestaticket})`,
        timestamp: 'Ahora',
        actionType: 'preview_cesta_ticket',
        documentPayload: {
          type: 'cesta_ticket',
          data: {
            mes: monthName,
            ano: parseInt(ano, 10),
            ficha: aux_ficha,
            linkPdf: linkcestaticket,
            medioPago: 'Abono Electrónico en Cuenta Nómina / Tarjeta Cestaticket',
            estatus: 'Acreditado Conforme',
            historico: []
          }
        },
        quickReplies: [
          { id: 'ct-another', label: '🍽️ Consultar Otro Mes', action: 'action_cesta_ticket' },
          { id: 'ct-menu', label: '🏠 Menú Principal', action: 'action_main_menu' },
          { id: 'ct-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
        ]
      }
    ];
  }

  private async handleFormato14100Flow(_text: string): Promise<ChatMessage[]> {
    return await this.handleActionId('action_14100');
  }

  private finalizeFormato14100(motivo: Formato14100Data['motivoSolicitud']): ChatMessage[] {
    const worker = this.getWorker();
    const data: Formato14100Data = {
      ...INITIAL_FORMATO_14100,
      numeroFormato: `F14-100-OESVICA-${Date.now().toString().slice(-6)}`,
      fechaSolicitud: new Date().toLocaleDateString('es-VE'),
      motivoSolicitud: motivo,
      codigoVerificacion: `IVSS-${worker.cedula.replace(/\D/g, '')}-${worker.id}`
    };

    this.currentContext = {};

    return [
      {
        id: `bot-14100-${Date.now()}`,
        sender: 'bot',
        text: `🏛️ **Forma14100 del IVSS generada para ${worker.nombres}**:\n\n• **Patrono:** ${COMPANY_INFO.nombre} (N° Patronal: ${COMPANY_INFO.numeroPatronalIVSS})\n• **Ficha:** \`${worker.id}\` · **C.I.:** ${worker.cedula}\n• **Trámite:** Solicitud por ${motivo}\n• **Semanas Acreditadas:** ${data.semanasTotalesAcreditadas} semanas auditadas.`,
        timestamp: 'Ahora',
        actionType: 'preview_14100',
        documentPayload: {
          type: 'formato_14100',
          data
        },
        quickReplies: [
          { id: 'view-14100', label: '🏛️ Abrir Forma14100 Oficial', action: 'open_14100_modal' },
          { id: 'menu-14100', label: '🏠 Menú Principal', action: 'action_main_menu' },
          { id: 'f14100-new', label: '🔄 Nueva Conversación', action: 'action_new_chat' }
        ]
      }
    ];
  }

  private async tryGeminiResponse(userPrompt: string): Promise<string | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
    if (!apiKey) return null;

    const worker = this.getWorker();

    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `Eres el asistente virtual oficial de OESVICA (${COMPANY_INFO.nombre}).
El trabajador autenticado es ${worker.nombres}, cédula ${worker.cedula}, ficha ${worker.id}, cargo: ${worker.cargo}.
Responde de manera muy concisa y formal en español venezolano. Siempre recuerda que tiene disponibles las opciones: Recibos de pagos, Carta de Trabajo, Cesta Ticket y Forma14100.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.3,
          maxOutputTokens: 300
        }
      });

      return response.text ?? null;
    } catch {
      return null;
    }
  }
}
