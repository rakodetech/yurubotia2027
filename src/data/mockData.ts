import { CompanyInfo, CestaTicketData, Formato14100Data, PaystubData, WorkerProfile } from '../types';

export const CURRENT_WORKER: WorkerProfile = {
  id: 'EMP-7842',
  cedula: 'V-19.845.210',
  nombres: 'Carlos Eduardo',
  apellidos: 'Mendoza Albarrán',
  cargo: 'Analista de Operaciones & Logística Senior',
  departamento: 'Operaciones y Cadena de Suministro',
  fechaIngreso: '15/03/2021',
  tipoContrato: 'Tiempo Indeterminado (Fijo)',
  sueldoMensualBs: 18500.00,
  sueldoMensualUsdRef: 450.00,
  banco: 'Banco Mercantil',
  numeroCuenta: '0105-0024-81-1024567890',
  afiliacionIVSS: 'IVSS-19845210-A',
  diasVacacionesDisponibles: 18,
  email: 'carlos.mendoza@empresa.com.ve',
  telefono: '+58 (414) 234-8971',
  direccion: 'Av. Francisco de Miranda, Edif. Parque Cristal, Piso 8, Caracas'
};

export const WORKERS_LIST: WorkerProfile[] = [
  CURRENT_WORKER,
  {
    id: 'EMP-5120',
    cedula: 'V-22.148.903',
    nombres: 'Ana Sofía',
    apellidos: 'Rivas Marcano',
    cargo: 'Especialista de Gestión del Talento Humano',
    departamento: 'Recursos Humanos',
    fechaIngreso: '10/01/2022',
    tipoContrato: 'Tiempo Indeterminado (Fijo)',
    sueldoMensualBs: 21000.00,
    sueldoMensualUsdRef: 510.00,
    banco: 'Banco Banesco',
    numeroCuenta: '0134-0102-44-2098124567',
    afiliacionIVSS: 'IVSS-22148903-B',
    diasVacacionesDisponibles: 15,
    email: 'ana.rivas@empresa.com.ve',
    telefono: '+58 (412) 555-0192',
    direccion: 'Urb. Santa Fe Norte, Residencias El Ávila, Caracas'
  },
  {
    id: 'EMP-3390',
    cedula: 'V-16.782.441',
    nombres: 'José Gregorio',
    apellidos: 'Castillo Peña',
    cargo: 'Supervisor de Planta & Mantenimiento',
    departamento: 'Producción y Mantenimiento',
    fechaIngreso: '01/08/2018',
    tipoContrato: 'Tiempo Indeterminado (Fijo)',
    sueldoMensualBs: 24500.00,
    sueldoMensualUsdRef: 595.00,
    banco: 'Banco de Venezuela',
    numeroCuenta: '0102-0450-12-0001928471',
    afiliacionIVSS: 'IVSS-16782441-C',
    diasVacacionesDisponibles: 22,
    email: 'jose.castillo@empresa.com.ve',
    telefono: '+58 (424) 890-1234',
    direccion: 'Zona Industrial La Yaguara, Calle 4, Caracas'
  }
];

export function findWorkerByFicha(query: string): WorkerProfile | null {
  const clean = query.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return null;

  // Search exact or partial ID (e.g. "EMP-7842" or "7842")
  const found = WORKERS_LIST.find((w) => {
    const idClean = w.id.toUpperCase().replace(/\s+/g, '');
    const numOnly = idClean.replace(/\D/g, '');
    const queryNumOnly = clean.replace(/\D/g, '');

    return (
      idClean === clean ||
      idClean === `EMP-${clean}` ||
      (queryNumOnly && numOnly === queryNumOnly) ||
      w.cedula.toUpperCase().replace(/\D/g, '') === queryNumOnly
    );
  });

  return found || null;
}


export const COMPANY_INFO: CompanyInfo = {
  nombre: 'ORGANIZACION ESTRATEGICA DE VIGILANCIA, OESVICA, C.A.',
  rif: 'J-07521873-1',
  numeroPatronalIVSS: 'B-12894501',
  direccion: 'Av. Bolivar Norte, Centro Comercial Camoruco, Piso 5, Valencia, Carabobo',
  telefono: '+58 (241) 824-5011',
  gerenteRRHH: 'Lcdo. Marcos Aurelio Valenzuela',
  cargoFirmante: 'Gerente Nacional de Talento Humano',
  ciudad: 'Valencia, Venezuela'
};

export const DEFAULT_CESTA_TICKET: CestaTicketData = {
  mes: 'Octubre',
  ano: 2026,
  medioPago: 'Abono Electrónico en Cuenta Nómina / Tarjeta Cestaticket',
  estatus: 'Acreditado Conforme',
  historico: []
};

export const MOCK_PAYSTUBS: PaystubData[] = [
  {
    id: 'REC-2026-10-01',
    periodo: '01/10/2026 al 15/10/2026',
    quincena: '1ra',
    mes: 'Octubre',
    ano: 2026,
    fechaPago: '15/10/2026',
    diasTrabajados: 15,
    asignaciones: [
      { codigo: '001', concepto: 'Sueldo Básico Quincenal', tipo: 'asignacion', montoBs: 9250.00 },
      { codigo: '004', concepto: 'Bono de Asistencia Perfecta', tipo: 'asignacion', montoBs: 1480.00 },
      { codigo: '009', concepto: 'Cestaticket Socialista (Alimentación)', tipo: 'asignacion', montoBs: 2050.00 },
      { codigo: '012', concepto: 'Compensación por Antigüedad', tipo: 'asignacion', montoBs: 925.00 }
    ],
    deducciones: [
      { codigo: '101', concepto: 'S.S.O. (Seguro Social IVSS 4%)', tipo: 'deduccion', montoBs: 370.00, porcentaje: 4 },
      { codigo: '102', concepto: 'R.P.E. (Régimen Prestacional Empleo 0.5%)', tipo: 'deduccion', montoBs: 46.25, porcentaje: 0.5 },
      { codigo: '103', concepto: 'F.A.O.V. (Fondo Ahorro Vivienda / LPH 1%)', tipo: 'deduccion', montoBs: 92.50, porcentaje: 1.0 },
      { codigo: '108', concepto: 'Retención ISLR s/ Ingresos Brutos', tipo: 'deduccion', montoBs: 185.00 }
    ],
    totalAsignaciones: 13705.00,
    totalDeducciones: 693.75,
    netoPagar: 13011.25,
    tasaCambioBcv: 41.25
  },
  {
    id: 'REC-2026-09-02',
    periodo: '16/09/2026 al 30/09/2026',
    quincena: '2da',
    mes: 'Septiembre',
    ano: 2026,
    fechaPago: '30/09/2026',
    diasTrabajados: 15,
    asignaciones: [
      { codigo: '001', concepto: 'Sueldo Básico Quincenal', tipo: 'asignacion', montoBs: 9250.00 },
      { codigo: '006', concepto: 'Horas Extras Diurnas (8 hrs)', tipo: 'asignacion', montoBs: 925.00 },
      { codigo: '009', concepto: 'Cestaticket Socialista (Alimentación)', tipo: 'asignacion', montoBs: 2050.00 },
      { codigo: '012', concepto: 'Compensación por Antigüedad', tipo: 'asignacion', montoBs: 925.00 }
    ],
    deducciones: [
      { codigo: '101', concepto: 'S.S.O. (Seguro Social IVSS 4%)', tipo: 'deduccion', montoBs: 370.00, porcentaje: 4 },
      { codigo: '102', concepto: 'R.P.E. (Régimen Prestacional Empleo 0.5%)', tipo: 'deduccion', montoBs: 46.25, porcentaje: 0.5 },
      { codigo: '103', concepto: 'F.A.O.V. (Fondo Ahorro Vivienda / LPH 1%)', tipo: 'deduccion', montoBs: 92.50, porcentaje: 1.0 },
      { codigo: '108', concepto: 'Retención ISLR s/ Ingresos Brutos', tipo: 'deduccion', montoBs: 185.00 }
    ],
    totalAsignaciones: 13150.00,
    totalDeducciones: 693.75,
    netoPagar: 12456.25,
    tasaCambioBcv: 40.80
  },
  {
    id: 'REC-2026-09-01',
    periodo: '01/09/2026 al 15/09/2026',
    quincena: '1ra',
    mes: 'Septiembre',
    ano: 2026,
    fechaPago: '15/09/2026',
    diasTrabajados: 15,
    asignaciones: [
      { codigo: '001', concepto: 'Sueldo Básico Quincenal', tipo: 'asignacion', montoBs: 9250.00 },
      { codigo: '004', concepto: 'Bono de Asistencia Perfecta', tipo: 'asignacion', montoBs: 1480.00 },
      { codigo: '009', concepto: 'Cestaticket Socialista (Alimentación)', tipo: 'asignacion', montoBs: 2050.00 },
      { codigo: '012', concepto: 'Compensación por Antigüedad', tipo: 'asignacion', montoBs: 925.00 }
    ],
    deducciones: [
      { codigo: '101', concepto: 'S.S.O. (Seguro Social IVSS 4%)', tipo: 'deduccion', montoBs: 370.00, porcentaje: 4 },
      { codigo: '102', concepto: 'R.P.E. (Régimen Prestacional Empleo 0.5%)', tipo: 'deduccion', montoBs: 46.25, porcentaje: 0.5 },
      { codigo: '103', concepto: 'F.A.O.V. (Fondo Ahorro Vivienda / LPH 1%)', tipo: 'deduccion', montoBs: 92.50, porcentaje: 1.0 },
      { codigo: '108', concepto: 'Retención ISLR s/ Ingresos Brutos', tipo: 'deduccion', montoBs: 185.00 }
    ],
    totalAsignaciones: 13705.00,
    totalDeducciones: 693.75,
    netoPagar: 13011.25,
    tasaCambioBcv: 40.50
  }
];

export const INITIAL_FORMATO_14100: Formato14100Data = {
  numeroFormato: 'F14-100-2026-004819',
  fechaSolicitud: '05/10/2026',
  motivoSolicitud: 'Vejez',
  observaciones: 'Constancia expedida a solicitud de la parte interesada para tramitación de pensión reglamentaria ante la Caja Regional del IVSS.',
  semanasTotalesAcreditadas: 284,
  estatusAsegurado: 'Activo',
  codigoVerificacion: 'IVSS-VAL-98452-2026-K',
  historialSalarios: [
    { ano: 2026, semanasCotizadas: 40, salarioPromedioSemanal: 4269.23, salarioMensual: 18500.00 },
    { ano: 2025, semanasCotizadas: 52, salarioPromedioSemanal: 3461.54, salarioMensual: 15000.00 },
    { ano: 2024, semanasCotizadas: 52, salarioPromedioSemanal: 2538.46, salarioMensual: 11000.00 },
    { ano: 2023, semanasCotizadas: 52, salarioPromedioSemanal: 1846.15, salarioMensual: 8000.00 },
    { ano: 2022, semanasCotizadas: 52, salarioPromedioSemanal: 1269.23, salarioMensual: 5500.00 },
    { ano: 2021, semanasCotizadas: 36, salarioPromedioSemanal: 923.07, salarioMensual: 4000.00 }
  ]
};

export const FAQ_DATA = [
  {
    pregunta: '¿Cuándo se pagan las quincenas y el Cestaticket?',
    respuesta: 'Las quincenas de salario regular se abonan puntualmente los días 15 y último de cada mes (o el día hábil inmediato anterior si cae en fin de semana). El Cestaticket Socialista se deposita dentro de la 2da quincena de nómina.'
  },
  {
    pregunta: '¿Cuántos días de vacaciones me corresponden según la LOTTT?',
    respuesta: 'Según el Artículo 190 de la LOTTT, al cumplir 1 año ininterrumpido te corresponden 15 días hábiles remunerados. Por cada año sucesivo se suma 1 día hábil adicional hasta un tope de 15 días acumulados (total máximo 30 días hábiles).'
  },
  {
    pregunta: '¿Para qué sirve el Formato 14-100 del IVSS?',
    respuesta: 'La Forma 14-100 es la Constancia de Trabajo oficial para el Instituto Venezolano de los Seguros Sociales. Certifica los salarios devengados y las semanas cotizadas ante el patrono para solicitar: Pensión por Vejez, Pensión de Invalidez, Pensión de Sobreviviente o Indemnizaciones de Reposos Médicos prolongados.'
  },
  {
    pregunta: '¿Cómo valido un reposo médico emitido por un médico privado?',
    respuesta: 'Si tu reposo médico supera 3 días, debes llevar el informe médico original, exámenes y reposo a la Clínica Popular o Hospital del IVSS más cercano dentro de los 3 días hábiles siguientes para su convalidación oficial mediante la Forma 14-73.'
  },
  {
    pregunta: '¿Qué porcentaje me descuentan de Seguro Social (IVSS) y FAOV?',
    respuesta: 'Por ley se descuenta de tu salario básico: 4% de Seguro Social Obligatorio (IVSS), 0.5% de Régimen Prestacional de Empleo (Paro Forzoso) y 1% de Fondo de Ahorro Obligatorio para la Vivienda (FAOV/LPH). La empresa aporta el porcentaje patronal correspondiente (9% al 11% IVSS, 2% FAOV, 2% RPE).'
  }
];
