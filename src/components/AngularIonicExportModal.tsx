import React, { useState } from 'react';
import { X, Copy, Check, Code, Smartphone, Sparkles, Terminal } from 'lucide-react';

interface AngularIonicExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AngularIonicExportModal: React.FC<AngularIonicExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'component_ts' | 'template_html' | 'service_ts' | 'cli_steps'>('component_ts');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const componentTsCode = `// src/app/pages/worker-chat/worker-chat.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, ModalController, ToastController } from '@ionic/angular';
import { WorkerChatService, ChatMessage, QuickReply } from '../../services/worker-chat.service';

@Component({
  selector: 'app-worker-chat',
  templateUrl: './worker-chat.page.html',
  styleUrls: ['./worker-chat.page.scss'],
})
export class WorkerChatPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  messages: ChatMessage[] = [];
  inputText: string = '';
  isTyping: boolean = false;

  constructor(
    private chatService: WorkerChatService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.messages = this.chatService.getInitialMessages();
  }

  async sendMessage(customText?: string, actionId?: string) {
    const text = customText || this.inputText;
    if (!text.trim() && !actionId) return;

    if (text) {
      this.messages.push({
        id: 'user-' + Date.now(),
        sender: 'user',
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    this.inputText = '';
    this.isTyping = true;
    this.scrollToBottom();

    setTimeout(async () => {
      const responses = await this.chatService.processWorkerQuery(text, actionId);
      this.isTyping = false;
      this.messages.push(...responses);
      this.scrollToBottom();
    }, 400);
  }

  async openDocument(type: 'recibo' | 'carta' | 'formato14100', payload?: any) {
    const toast = await this.toastCtrl.create({
      message: 'Abriendo documento oficial...',
      duration: 1500,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
    // Modal implementation with DocumentViewerModalComponent
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }
}`;

  const templateHtmlCode = `<!-- src/app/pages/worker-chat/worker-chat.page.html -->
<ion-header [translucent]="true">
  <ion-toolbar color="primary">
    <ion-buttons slot="start">
      <ion-avatar class="chat-avatar">
        <ion-icon name="person-circle-outline"></ion-icon>
      </ion-avatar>
    </ion-buttons>
    <ion-title>
      <div class="header-title">Atención al Trabajador</div>
      <div class="header-subtitle">TalentoBot RRHH & Nómina</div>
    </ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="sendMessage('Menú Principal', 'action_menu')">
        <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true" class="ion-padding chat-content">
  <div class="messages-container">
    <div *ngFor="let msg of messages" [ngClass]="['message-bubble', msg.sender]">
      <div class="bubble-body">
        <p class="bubble-text" [innerHTML]="msg.text | formatMarkdown"></p>

        <!-- Document Preview Card inside Bubble -->
        <ion-card *ngIf="msg.documentPayload" class="doc-preview-card">
          <ion-card-header>
            <ion-card-subtitle>{{ msg.documentPayload.type | uppercase }}</ion-card-subtitle>
            <ion-card-title>{{ msg.documentPayload.title }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" shape="round" color="success" (click)="openDocument(msg.documentPayload.type, msg.documentPayload.data)">
              <ion-icon slot="start" name="document-text-outline"></ion-icon>
              Ver y Descargar Documento
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Quick Reply Chips -->
        <div *ngIf="msg.quickReplies?.length" class="quick-replies-container">
          <ion-chip *ngFor="let qr of msg.quickReplies" [color]="qr.category === 'primary' ? 'primary' : 'medium'" (click)="sendMessage(qr.label, qr.action)">
            <ion-label>{{ qr.label }}</ion-label>
          </ion-chip>
        </div>

        <span class="message-time">{{ msg.timestamp }}</span>
      </div>
    </div>

    <!-- Typing Indicator -->
    <div *ngIf="isTyping" class="typing-indicator">
      <ion-spinner name="dots" color="primary"></ion-spinner>
      <span>TalentoBot procesando tu solicitud...</span>
    </div>
  </div>
</ion-content>

<!-- Ionic Footer Toolbar for Input -->
<ion-footer>
  <!-- Fast Action Menu Toolbar -->
  <ion-toolbar class="quick-bar-toolbar">
    <div class="scroll-chips">
      <ion-chip (click)="sendMessage('Recibos de pagos', 'action_recibos')">
        <ion-icon name="cash-outline" color="primary"></ion-icon>
        <ion-label>Recibos de pagos</ion-label>
      </ion-chip>
      <ion-chip (click)="sendMessage('Carta de trabajo', 'action_carta')">
        <ion-icon name="document-attach-outline" color="warning"></ion-icon>
        <ion-label>Carta de trabajo</ion-label>
      </ion-chip>
      <ion-chip (click)="sendMessage('Formato 14-100', 'action_14100')">
        <ion-icon name="business-outline" color="success"></ion-icon>
        <ion-label>Formato 14-100 IVSS</ion-label>
      </ion-chip>
    </div>
  </ion-toolbar>

  <ion-toolbar class="input-toolbar">
    <ion-item lines="none" class="input-item">
      <ion-input [(ngModel)]="inputText" placeholder="Escribe tu consulta laboral..." (keyup.enter)="sendMessage()"></ion-input>
      <ion-button slot="end" fill="clear" [disabled]="!inputText.trim()" (click)="sendMessage()">
        <ion-icon slot="icon-only" name="send"></ion-icon>
      </ion-button>
    </ion-item>
  </ion-toolbar>
</ion-footer>`;

  const serviceTsCode = `// src/app/services/worker-chat.service.ts
import { Injectable } from '@angular/core';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickReplies?: QuickReply[];
  documentPayload?: any;
}

export interface QuickReply {
  label: string;
  action: string;
  category?: 'primary' | 'secondary';
}

@Injectable({
  providedIn: 'root'
})
export class WorkerChatService {
  private workerData = {
    nombres: 'Carlos Eduardo',
    apellidos: 'Mendoza Albarrán',
    cedula: 'V-19.845.210',
    cargo: 'Analista de Operaciones Senior',
    sueldoBs: 18500.00,
    patronalIVSS: 'B-14892015'
  };

  getInitialMessages(): ChatMessage[] {
    return [
      {
        id: 'init-1',
        sender: 'bot',
        text: '👋 ¡Hola! Bienvenido al Asistente Virtual de Atención al Trabajador.',
        timestamp: 'Ahora'
      },
      {
        id: 'init-2',
        sender: 'bot',
        text: '🔒 Por favor, ingresa tu **Código de Ficha** o número de carnet laboral para identificarte:',
        timestamp: 'Ahora',
        quickReplies: [
          { label: 'EMP-7842 (Carlos Mendoza)', action: 'login_EMP-7842', category: 'primary' },
          { label: 'EMP-5120 (Ana Rivas)', action: 'login_EMP-5120', category: 'secondary' }
        ]
      }
    ];
  }

  async processWorkerQuery(text: string, actionId?: string): Promise<ChatMessage[]> {
    const act = actionId || '';
    if (!this.isAuthenticated) {
      if (act.startsWith('login_') || text.includes('7842') || text.includes('5120')) {
        this.isAuthenticated = true;
        return [
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: '✅ **Ficha validada exitosamente**.\\n¡Bienvenido, ' + this.workerData.nombres + '! Selecciona una opción del menú:',
            timestamp: 'Ahora',
            quickReplies: [
              { label: '📄 Recibos de Pagos', action: 'action_recibos', category: 'primary' },
              { label: '📜 Carta de Trabajo', action: 'action_carta', category: 'primary' },
              { label: '🏛️ Formato 14-100 IVSS', action: 'action_14100', category: 'primary' },
              { label: '🌴 Días de Vacaciones', action: 'action_vacaciones', category: 'secondary' }
            ]
          }
        ];
      }
      return [{
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: '⚠️ Ficha no reconocida. Por favor, ingresa un código válido (ej: EMP-7842):',
        timestamp: 'Ahora',
        quickReplies: [
          { label: 'EMP-7842 (Carlos Mendoza)', action: 'login_EMP-7842', category: 'primary' }
        ]
      }];
    }
    if (act === 'action_recibos' || text.toLowerCase().includes('recibo')) {
      return [{
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: '💰 **Recibos de Pago de Nómina**\\nConsulta tus deducciones reglamentarias de IVSS (4%), FAOV (1%) y RPE (0.5%).',
        timestamp: 'Ahora',
        documentPayload: {
          type: 'recibo',
          title: 'Recibo 1ra Quincena Octubre 2026',
          data: { netoBs: 13011.25 }
        },
        quickReplies: [
          { label: '📥 Descargar Recibo Actual', action: 'view_recibo_actual' },
          { label: '📅 Consultar Meses Anteriores', action: 'action_recibos_hist' },
          { label: '↩️ Volver al Menú', action: 'action_menu' }
        ]
      }];
    }

    if (act === 'action_carta' || text.toLowerCase().includes('carta')) {
      return [{
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: '📜 **Generador de Carta de Trabajo**\\nSelecciona si requieres tu constancia laboral con o sin desglose salarial:',
        timestamp: 'Ahora',
        quickReplies: [
          { label: '💼 Con Sueldo (Bs. 18.500)', action: 'carta_con_sueldo' },
          { label: '🔒 Sin Sueldo', action: 'carta_sin_sueldo' },
          { label: '↩️ Volver al Menú', action: 'action_menu' }
        ]
      }];
    }

    if (act === 'action_14100' || text.toLowerCase().includes('14100') || text.toLowerCase().includes('14-100')) {
      return [{
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: '🏛️ **Formato Oficial 14-100 del IVSS**\\nConstancia para trámites de pensión de vejez, reposos e indemnizaciones.',
        timestamp: 'Ahora',
        documentPayload: {
          type: 'formato14100',
          title: 'Forma 14-100 IVSS (284 Semanas Cotizadas)',
          data: { patronal: this.workerData.patronalIVSS }
        },
        quickReplies: [
          { label: '🏛️ Abrir Forma 14-100', action: 'view_14100' },
          { label: '↩️ Menú Principal', action: 'action_menu' }
        ]
      }];
    }

    return [{
      id: 'bot-' + Date.now(),
      sender: 'bot',
      text: '¿En qué puedo ayudarte? Selecciona una opción del menú:',
      timestamp: 'Ahora',
      quickReplies: [
        { label: '📄 Recibos de Pagos', action: 'action_recibos', category: 'primary' },
        { label: '📜 Carta de Trabajo', action: 'action_carta', category: 'primary' },
        { label: '🏛️ Formato 14-100 IVSS', action: 'action_14100', category: 'primary' }
      ]
    }];
  }
}`;

  const cliStepsCode = `# 1. Instalar Ionic CLI (si no lo tienes instalado globalmente)
npm install -g @ionic/cli

# 2. Crear proyecto Ionic con Angular
ionic start worker-chatbot blank --type=angular

# 3. Entrar a la carpeta del proyecto
cd worker-chatbot

# 4. Generar la página del chatbot y el servicio
ionic generate page pages/worker-chat
ionic generate service services/worker-chat

# 5. Instalar dependencias para exportar e imprimir PDF
npm install jspdf html2canvas

# 6. Ejecutar en el navegador
ionic serve`;

  const getActiveCode = () => {
    switch (activeTab) {
      case 'component_ts':
        return componentTsCode;
      case 'template_html':
        return templateHtmlCode;
      case 'service_ts':
        return serviceTsCode;
      case 'cli_steps':
        return cliStepsCode;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 text-slate-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800/90 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Código Fuente Angular + Ionic 8
              </h2>
              <p className="text-xs text-slate-400">
                Archivos listos para copiar e integrar en tu proyecto Ionic CLI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('component_ts')}
            className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
              activeTab === 'component_ts'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            worker-chat.page.ts
          </button>
          <button
            onClick={() => setActiveTab('template_html')}
            className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
              activeTab === 'template_html'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            worker-chat.page.html
          </button>
          <button
            onClick={() => setActiveTab('service_ts')}
            className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
              activeTab === 'service_ts'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            worker-chat.service.ts
          </button>
          <button
            onClick={() => setActiveTab('cli_steps')}
            className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
              activeTab === 'cli_steps'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Pasos Ionic CLI
          </button>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed">
          <pre className="overflow-x-auto whitespace-pre">
            <code>{getActiveCode()}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Compatible con Ionic 8+ y Angular 17/18/19</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
