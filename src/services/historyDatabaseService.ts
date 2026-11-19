import { ChatMessage, WorkerProfile } from '../types';
import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

export interface DbStatusResponse {
  isMysqlConnected: boolean;
  mysqlConfig: {
    host: string;
    port: number;
    user: string;
    database: string;
  };
  mysqlLastError: string | null;
  memoryStats: {
    sessionCount: number;
    messageCount: number;
  };
  mysqlStats: {
    sessionCount: number;
    messageCount: number;
  };
  sqlFile: string;
}

export interface UserSessionRecord {
  id_sesion: string;
  cod_ficha: string | null;
  cedula: string | null;
  nombre_trabajador: string | null;
  cargo: string | null;
  seccion_usuario: string;
  ubicacion: string | null;
  cliente_asignado: string | null;
  estado: 'activa' | 'cerrada' | 'expirada';
  total_mensajes: number;
  duracion_segundos: number;
  fecha_inicio: string;
  fecha_cierre: string | null;
  ultima_actividad: string;
}

class HistoryDatabaseService {
  private currentSessionId: string | null = null;
  private currentWorker: WorkerProfile | null = null;

  constructor() {
    this.initSession();
  }

  private initSession(): string {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('oesvica_chat_session_id');
      if (stored) {
        this.currentSessionId = stored;
        return stored;
      }
    }
    const newId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.currentSessionId = newId;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oesvica_chat_session_id', newId);
    }
    return newId;
  }

  public getSessionId(): string {
    if (!this.currentSessionId) {
      return this.initSession();
    }
    return this.currentSessionId;
  }

  /**
   * Registra o actualiza la sesión activa del usuario con su ficha y sección laboral
   */
  public async registerSession(worker?: WorkerProfile | null): Promise<void> {
    const sessionId = this.getSessionId();
    if (worker) {
      this.currentWorker = worker;
    }

    const payload = {
      sessionId,
      codFicha: worker?.id || this.currentWorker?.id || null,
      cedula: worker?.cedula || this.currentWorker?.cedula || null,
      nombreTrabajador: worker
        ? `${worker.nombres} ${worker.apellidos}`.trim()
        : this.currentWorker
        ? `${this.currentWorker.nombres} ${this.currentWorker.apellidos}`.trim()
        : null,
      cargo: worker?.cargo || this.currentWorker?.cargo || null,
      // Registro explícito de la SECCIÓN DEL USUARIO solicitada
      seccionUsuario:
        worker?.departamento ||
        this.currentWorker?.departamento ||
        worker?.ubicacion ||
        this.currentWorker?.ubicacion ||
        'Seguridad y Vigilancia Operativa',
      ubicacion: worker?.ubicacion || this.currentWorker?.ubicacion || null,
      clienteAsignado: worker?.cliente || this.currentWorker?.cliente || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };

    try {
      await fetch('/api/chat/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[HistoryDatabaseService] No se pudo sincronizar inicio de sesión:', err);
    }
  }

  /**
   * Guarda un mensaje del usuario o asistente en la base de datos MySQL (con sección del usuario)
   */
  public async saveMessage(
    msg: ChatMessage,
    worker?: WorkerProfile | null
  ): Promise<void> {
    const sessionId = this.getSessionId();
    const effectiveWorker = worker || this.currentWorker;

    const payload = {
      sessionId,
      idMensaje: msg.id,
      codFicha: effectiveWorker?.id || null,
      seccionUsuario:
        effectiveWorker?.departamento ||
        effectiveWorker?.ubicacion ||
        'Seguridad y Vigilancia Operativa',
      remitente: msg.sender === 'user' ? 'usuario' : 'asistente',
      mensaje: msg.text,
      tipoAccion: msg.actionType || null,
      opcionesRapidas: msg.quickReplies || null,
      datosDocumento: msg.documentPayload?.data || null,
      tipoDocumento: msg.documentPayload?.type || null,
      enlaceDocumento:
        (msg.documentPayload?.data as any)?.linkRecibo ||
        (msg.documentPayload?.data as any)?.linkPdf ||
        (msg.documentPayload?.data as any)?.linkHumani ||
        null
    };

    try {
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error guardando mensaje en base de datos:', err);
    }
  }

  /**
   * Finaliza la sesión actual e inicia una nueva (usado en 'Nueva Conversación')
   */
  public async startNewConversationSession(worker?: WorkerProfile | null): Promise<string> {
    const oldSessionId = this.currentSessionId;
    if (oldSessionId) {
      try {
        await fetch('/api/chat/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: oldSessionId })
        });
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('oesvica_chat_session_id');
    }

    const newId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.currentSessionId = newId;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oesvica_chat_session_id', newId);
    }

    await this.registerSession(worker);
    return newId;
  }

  /**
   * Consulta el estado de conexión a la base de datos MySQL
   */
  public async getDbStatus(): Promise<DbStatusResponse | null> {
    try {
      const res = await fetch('/api/chat/db-status');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error consultando estado de DB:', err);
    }
    return null;
  }

  /**
   * Obtiene la lista de sesiones de usuarios
   */
  public async getSessions(): Promise<UserSessionRecord[]> {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        return data.sessions || [];
      }
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error obteniendo sesiones:', err);
    }
    return [];
  }

  /**
   * Obtiene el historial de mensajes de una sesión específica
   */
  public async getSessionHistory(sessionId: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/chat/history/${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.messages || [];
      }
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error obteniendo historial:', err);
    }
    return [];
  }

  /**
   * Obtiene la configuración de mensajes del chatbot (mensaje de bienvenida y de ficha) desde MySQL
   */
  public async getChatConfig(): Promise<{
    welcomeMessage: string;
    promptFichaMessage: string;
    menuTitle: string;
    isMysql: boolean;
  } | null> {
    try {
      const res = await fetch('/api/chat/config');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error obteniendo config de MySQL:', err);
    }
    return null;
  }

  /**
   * Actualiza el mensaje de bienvenida y solicitud de ficha en MySQL
   */
  public async updateChatConfig(config: {
    welcomeMessage?: string;
    promptFichaMessage?: string;
    menuTitle?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/chat/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return res.ok;
    } catch (err) {
      console.error('[HistoryDatabaseService] Error guardando config en MySQL:', err);
      return false;
    }
  }

  /**
   * Obtiene las opciones activas del menú principal desde MySQL con sus endpoints
   */
  public async getActiveMenu(): Promise<any[]> {
    try {
      const res = await fetch('/api/chat/menu');
      if (res.ok) {
        const data = await res.json();
        return data.menu || [];
      }
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error obteniendo menú activo de MySQL:', err);
    }
    return [];
  }

  /**
   * Obtiene todas las opciones de menú (activas e inactivas) para administración
   */
  public async getAllMenu(): Promise<any[]> {
    try {
      const res = await fetch('/api/chat/menu/all');
      if (res.ok) {
        const data = await res.json();
        return data.menu || [];
      }
    } catch (err) {
      console.warn('[HistoryDatabaseService] Error obteniendo lista total de menú:', err);
    }
    return [];
  }

  /**
   * Guarda o actualiza una opción de menú en MySQL con llamada a un endpoint
   */
  public async saveMenuOption(option: any): Promise<boolean> {
    try {
      const res = await fetch('/api/chat/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(option)
      });
      return res.ok;
    } catch (err) {
      console.error('[HistoryDatabaseService] Error guardando opción de menú en MySQL:', err);
      return false;
    }
  }

  /**
   * Elimina una opción de menú en MySQL
   */
  public async deleteMenuOption(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/chat/menu/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error('[HistoryDatabaseService] Error eliminando opción de menú:', err);
      return false;
    }
  }

  /**
   * Invoca dinámicamente el endpoint configurado en cualquier menú
   */
  public async executeDynamicEndpoint(
    endpointUrl: string,
    method: string = 'POST',
    bodyType: string = 'url_encoded',
    payload: Record<string, any> = {}
  ): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
    for (const url of buildProxyUrls('/api/chat/execute-endpoint')) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpointUrl, method, bodyType, payload }),
          signal: AbortSignal.timeout(10000)
        });
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();
        if (isHtmlPayload(ct, text)) continue;
        if (res.ok) {
          return JSON.parse(text);
        }
      } catch {
        // try next URL
      }
    }

    // Fallback directo si no hay proxy activo y la página está en HTTP
    if (!isHttpsOrigin()) {
      try {
        const upperMethod = method.toUpperCase();
        const formParams = new URLSearchParams();
        for (const [k, v] of Object.entries(payload)) {
          formParams.append(k, String(v));
        }

        await fetch(endpointUrl, {
          method: upperMethod,
          mode: 'no-cors',
          headers: upperMethod === 'GET' ? undefined : { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: upperMethod === 'GET' ? undefined : formParams.toString(),
          signal: AbortSignal.timeout(10000)
        });

        return { success: true, status: 200 };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Error invocando endpoint dinámico' };
      }
    }

    return { success: false, error: 'Error invocando endpoint dinámico (proxy backend requerido en HTTPS)' };
  }

  /**
   * Actualiza los parámetros de conexión MySQL y reintenta conectar
   */
  public async updateDbConfig(config: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }): Promise<{ success: boolean; isMysqlConnected: boolean; error?: string }> {
    try {
      const res = await fetch('/api/chat/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, isMysqlConnected: false, error: err?.message };
    }
  }

  /**
   * Reintenta la conexión a MySQL
   */
  public async reconnectDb(): Promise<boolean> {
    try {
      const res = await fetch('/api/chat/db-reconnect', { method: 'POST' });
      const data = await res.json();
      return !!data.isMysqlConnected;
    } catch {
      return false;
    }
  }

  /**
   * Restablece las opciones del menú principal a los valores predeterminados de OESVICA
   */
  public async resetMenuDefaults(): Promise<boolean> {
    try {
      const res = await fetch('/api/chat/menu/reset-defaults', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const historyDatabaseService = new HistoryDatabaseService();
