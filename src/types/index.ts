export interface OesvicaApiResponse {
  cod_ficha: string;
  cedula?: string;
  ap_nombre: string;
  cargo?: string;
  telefono?: string;
  correo?: string;
  fec_ingreso?: string;
  ubicacion?: string;
  cliente?: string;
  region?: string;
  cod_status?: string;
  status?: string;
  fec_nacimiento?: string;
  sexo?: string;
  cod_contrato?: string;
  contrato?: string;
}

export interface WorkerProfile {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  departamento: string;
  fechaIngreso: string;
  tipoContrato: string;
  sueldoMensualBs: number;
  sueldoMensualUsdRef: number;
  banco: string;
  numeroCuenta: string;
  afiliacionIVSS: string;
  diasVacacionesDisponibles: number;
  email: string;
  telefono: string;
  direccion: string;
  ubicacion?: string;
  cliente?: string;
  statusLaboral?: string;
  codContrato?: string;
  fechaNacimiento?: string;
  edad?: number;
}

export interface CompanyInfo {
  nombre: string;
  rif: string;
  numeroPatronalIVSS: string;
  direccion: string;
  telefono: string;
  gerenteRRHH: string;
  cargoFirmante: string;
  ciudad: string;
}

export type DocumentType = 'recibo_pago' | 'carta_trabajo' | 'cesta_ticket' | 'formato_14100';

export interface PaystubItem {
  codigo: string;
  concepto: string;
  tipo: 'asignacion' | 'deduccion';
  montoBs: number;
  porcentaje?: number;
}

export interface PaystubData {
  id: string;
  periodo: string;
  quincena: '1era' | '1ra' | '2da' | 'Mensual';
  mes: string;
  ano: number;
  fechaPago: string;
  diasTrabajados: number;
  asignaciones: PaystubItem[];
  deducciones: PaystubItem[];
  totalAsignaciones: number;
  totalDeducciones: number;
  netoPagar: number;
  tasaCambioBcv: number;
  linkRecibo?: string;
  linkHumani?: string;
}

export interface WorkLetterConfig {
  incluirSueldo: boolean;
  formato?: 'digital' | 'fisico';
  destinatario?: string; // e.g. "A quien pueda interesar", "Banco de Venezuela", "Embajada de España"
  motivoTramite?: string;
  fechaEmision: string;
  codigoValidacion: string;
  codContrato?: string;
  codFicha?: string;
  statusEnvio?: string;
  linkPdf?: string;
}

export interface CestaTicketData {
  mes: string;
  ano: number;
  montoBs?: number;
  tasaBcv?: number;
  montoUsdRef?: number;
  fechaAbono?: string;
  medioPago?: string;
  estatus?: string;
  linkPdf?: string;
  ficha?: string;
  historico?: {
    mes: string;
    montoBs?: number;
    fecha: string;
    comprobante: string;
  }[];
}

export interface SalaryHistoryItem {
  ano: number;
  semanasCotizadas: number;
  salarioPromedioSemanal: number;
  salarioMensual: number;
}

export interface Formato14100Data {
  numeroFormato: string;
  fechaSolicitud: string;
  motivoSolicitud: 'Vejez' | 'Invalidez' | 'Sobreviviente' | 'Reposo Prolongado' | 'Retiro';
  observaciones: string;
  historialSalarios: SalaryHistoryItem[];
  semanasTotalesAcreditadas: number;
  estatusAsegurado: 'Activo' | 'Cesante';
  codigoVerificacion: string;
  linkPdf?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickReplies?: QuickReply[];
  actionType?: 'show_menu' | 'preview_paystub' | 'preview_work_letter' | 'preview_cesta_ticket' | 'preview_14100' | 'prompt_letter_options' | 'prompt_letter_type' | 'prompt_letter_format' | 'prompt_paystub_period' | 'prompt_paystub_year' | 'prompt_paystub_month' | 'prompt_paystub_quincena' | 'prompt_cesta_month' | 'prompt_14100_reason' | 'prompt_otp';
  documentPayload?: {
    type: DocumentType;
    data: PaystubData | WorkLetterConfig | CestaTicketData | Formato14100Data;
  };
}

export interface QuickReply {
  id: string;
  label: string;
  action: string;
  iconName?: string;
  category?: 'primary' | 'secondary' | 'neutral';
  endpointUrl?: string;
  endpointMethod?: 'GET' | 'POST' | 'PUT';
  endpointBodyType?: 'url_encoded' | 'json' | 'none';
  endpointBodyTemplate?: string;
  mensajeConfirmacion?: string;
}

export interface DynamicMenuOption {
  id_opcion: string;
  label: string;
  action: string;
  categoria?: 'primary' | 'secondary' | 'neutral';
  icono?: string;
  endpoint_url?: string;
  endpoint_method?: 'GET' | 'POST' | 'PUT';
  endpoint_body_type?: 'url_encoded' | 'json' | 'none';
  endpoint_body_template?: string;
  mensaje_confirmacion?: string;
  orden: number;
  activo: number | boolean;
}

export type IonicTheme = 'ios' | 'md';
export type AppTab = 'chat' | 'documentos' | 'perfil' | 'ayuda';
