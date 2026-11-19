import React, { useRef } from 'react';
import { COMPANY_INFO, CURRENT_WORKER, DEFAULT_CESTA_TICKET } from '../data/mockData';
import { CestaTicketData, Formato14100Data, PaystubData, WorkerProfile, WorkLetterConfig } from '../types';
import { CheckCircle2, Download, Printer, ShieldCheck, Utensils, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'recibo_pago' | 'carta_trabajo' | 'cesta_ticket' | 'formato_14100' | null;
  paystubData?: PaystubData | null;
  letterConfig?: WorkLetterConfig | null;
  cestaTicketData?: CestaTicketData | null;
  formato14100Data?: Formato14100Data | null;
  workerProfile?: WorkerProfile | null;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  documentType,
  paystubData,
  letterConfig,
  cestaTicketData,
  formato14100Data,
  workerProfile
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const worker = workerProfile || CURRENT_WORKER;

  if (!isOpen || !documentType) return null;

  const handlePrint = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
    window.print();
  };

  const handleDownloadSimulation = () => {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Top Header (Ionic-style Toolbar) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white">
                {documentType === 'recibo_pago' && 'Recibo Oficial de Pago de Nómina · OESVICA'}
                {documentType === 'carta_trabajo' && 'Constancia de Trabajo Certificada · OESVICA'}
                {documentType === 'cesta_ticket' && 'Comprobante de Cesta Ticket (Alimentación) · OESVICA'}
                {documentType === 'formato_14100' && 'Constancia de Trabajo para el IVSS (Forma 14-100)'}
              </h2>
              <p className="text-xs text-slate-400">Documento digital verificado con firma autorizada de RRHH</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Imprimir documento"
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleDownloadSimulation}
              title="Descargar en PDF"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            ref={printRef}
            id="printable-document-sheet"
            className="w-full max-w-[800px] bg-white text-slate-900 p-6 sm:p-10 shadow-lg border border-slate-200 rounded-sm font-sans"
            style={{ minHeight: '850px' }}
          >
            {/* RENDER SPECIFIC DOCUMENT */}
            {documentType === 'recibo_pago' && paystubData && (
              <PaystubPrintView stub={paystubData} worker={worker} />
            )}

            {documentType === 'carta_trabajo' && letterConfig && (
              <WorkLetterPrintView config={letterConfig} worker={worker} />
            )}

            {documentType === 'cesta_ticket' && (
              <CestaTicketPrintView data={cestaTicketData || DEFAULT_CESTA_TICKET} worker={worker} />
            )}

            {documentType === 'formato_14100' && formato14100Data && (
              <Formato14100PrintView data={formato14100Data} worker={worker} />
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Verificación digital activa · Ficha OESVICA: {worker.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            Cerrar visor
          </button>
        </div>
      </div>
    </div>
  );
};

// 1. Recibo de Pago Component View
const PaystubPrintView: React.FC<{ stub: PaystubData; worker: WorkerProfile }> = ({ stub, worker }) => {
  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Header */}
      <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-base font-bold text-slate-950 tracking-tight">{COMPANY_INFO.nombre}</h1>
          <p className="font-mono text-slate-600">RIF: {COMPANY_INFO.rif} | N° Patronal IVSS: {COMPANY_INFO.numeroPatronalIVSS}</p>
          <p className="text-slate-500 text-[11px]">{COMPANY_INFO.direccion}</p>
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">
            RECIBO DE PAGO
          </div>
          <p className="mt-1 font-mono font-semibold text-slate-700">N° {stub.id}</p>
          <p className="text-slate-500 text-[10px]">Fecha de Pago: {stub.fechaPago}</p>
        </div>
      </div>

      {/* Worker Info Grid */}
      <div className="bg-slate-50 p-4 border border-slate-200 rounded grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
        <div>
          <span className="text-slate-500 block text-[10px]">TRABAJADOR</span>
          <span className="font-bold text-slate-900">{worker.nombres} {worker.apellidos}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">CÉDULA DE IDENTIDAD</span>
          <span className="font-bold text-slate-900 font-mono">{worker.cedula}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">CÓDIGO DE FICHA</span>
          <span className="font-bold text-blue-900 font-mono">{worker.id}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">CARGO</span>
          <span className="font-medium text-slate-800">{worker.cargo}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">UBICACIÓN / SERVICIO</span>
          <span className="font-medium text-slate-800">{worker.ubicacion || 'OPERACIONES'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">FECHA DE INGRESO</span>
          <span className="font-mono text-slate-800">{worker.fechaIngreso}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">PERÍODO DE PAGO</span>
          <span className="font-semibold text-blue-900">{stub.periodo}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">BANCO NÓMINA</span>
          <span className="text-slate-800">{worker.banco}</span>
        </div>
      </div>

      {/* Tables: Asignaciones & Deducciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asignaciones */}
        <div className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-emerald-50 px-3 py-1.5 border-b border-emerald-100 font-bold text-emerald-900 text-xs">
            ASIGNACIONES / HABERES
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-left">
              <tr>
                <th className="py-1 px-2 font-medium">Cód.</th>
                <th className="py-1 px-2 font-medium">Concepto</th>
                <th className="py-1 px-2 font-medium text-right">Monto (Bs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stub.asignaciones.map((asig) => (
                <tr key={asig.codigo}>
                  <td className="py-1.5 px-2 font-mono text-slate-500">{asig.codigo}</td>
                  <td className="py-1.5 px-2 text-slate-800">{asig.concepto}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-900">
                    {asig.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Deducciones */}
        <div className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-rose-50 px-3 py-1.5 border-b border-rose-100 font-bold text-rose-900 text-xs">
            DEDUCCIONES DE LEY
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-left">
              <tr>
                <th className="py-1 px-2 font-medium">Cód.</th>
                <th className="py-1 px-2 font-medium">Concepto</th>
                <th className="py-1 px-2 font-medium text-right">Monto (Bs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stub.deducciones.map((ded) => (
                <tr key={ded.codigo}>
                  <td className="py-1.5 px-2 font-mono text-slate-500">{ded.codigo}</td>
                  <td className="py-1.5 px-2 text-slate-800">{ded.concepto}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-medium text-rose-700">
                    -{ded.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Summary Card */}
      <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-6 text-xs text-slate-300">
          <div>
            <span className="block text-slate-400 text-[10px]">TOTAL ASIGNACIONES</span>
            <span className="font-mono font-semibold text-emerald-400">
              Bs. {stub.totalAsignaciones.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 text-[10px]">TOTAL DEDUCCIONES</span>
            <span className="font-mono font-semibold text-rose-400">
              -Bs. {stub.totalDeducciones.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-slate-400 text-[10px] tracking-wider uppercase font-semibold">NETO A PAGAR</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
            Bs. {stub.netoPagar.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </span>
          <span className="block text-[10px] text-slate-400 font-mono">
            Ref. BCV (~${(stub.netoPagar / stub.tasaCambioBcv).toFixed(2)} USD)
          </span>
        </div>
      </div>

      {/* Signatures & Stamps */}
      <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 items-end text-center">
        <div>
          <div className="h-14 flex items-center justify-center">
            <div className="border-2 border-dashed border-blue-600 rounded-full w-24 h-24 flex items-center justify-center p-1 text-[8px] font-bold text-blue-800 rotate-[-12deg] opacity-75">
              <span>OESVICA · TALENTO HUMANO · VENEZUELA</span>
            </div>
          </div>
          <div className="border-t border-slate-400 pt-1 mt-2">
            <p className="font-bold text-slate-900">{COMPANY_INFO.gerenteRRHH}</p>
            <p className="text-[10px] text-slate-500">{COMPANY_INFO.cargoFirmante}</p>
          </div>
        </div>

        <div>
          <div className="h-14"></div>
          <div className="border-t border-slate-400 pt-1 mt-2">
            <p className="font-bold text-slate-900">{worker.nombres} {worker.apellidos}</p>
            <p className="text-[10px] text-slate-500">C.I. {worker.cedula} · Ficha: {worker.id}</p>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-slate-400 text-center pt-2">
        Comprobante de nómina emitido por {COMPANY_INFO.nombre}. RIF: {COMPANY_INFO.rif}.
      </div>
    </div>
  );
};

// 2. Carta de Trabajo View
const WorkLetterPrintView: React.FC<{ config: WorkLetterConfig; worker: WorkerProfile }> = ({ config, worker }) => {
  return (
    <div className="space-y-6 text-sm text-slate-800 leading-relaxed">
      {/* Membrete Oficial */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-lg font-bold text-slate-950 uppercase tracking-tight">{COMPANY_INFO.nombre}</h1>
          <p className="font-mono text-xs text-slate-600">RIF: {COMPANY_INFO.rif}</p>
          <p className="text-xs text-slate-500">{COMPANY_INFO.direccion}</p>
          <p className="text-xs text-slate-500">Teléfono: {COMPANY_INFO.telefono}</p>
        </div>
        <div className="w-16 h-16 border border-slate-300 rounded flex flex-col items-center justify-center p-1 bg-slate-50">
          <div className="w-10 h-10 border border-slate-800 grid grid-cols-3 gap-0.5 p-0.5">
            <div className="bg-slate-900"></div>
            <div></div>
            <div className="bg-slate-900"></div>
            <div></div>
            <div className="bg-slate-900"></div>
            <div></div>
            <div className="bg-slate-900"></div>
            <div></div>
            <div className="bg-slate-900"></div>
          </div>
          <span className="text-[8px] font-mono mt-0.5 text-slate-600">QR VAL</span>
        </div>
      </div>

      <div className="text-right text-xs text-slate-600 font-medium">
        {COMPANY_INFO.ciudad}, a los {new Date().getDate()} días del mes de {new Date().toLocaleDateString('es-VE', { month: 'long' })} de {new Date().getFullYear()}.
      </div>

      <div className="pt-2">
        <p className="font-bold text-slate-900 text-sm">SEÑORES:</p>
        <p className="font-semibold text-slate-950 uppercase text-sm">{config.destinatario}</p>
        <p className="text-xs text-slate-600">Presente.-</p>
      </div>

      <div className="text-center py-4">
        <h2 className="text-base font-bold uppercase tracking-widest text-slate-950 underline decoration-2 underline-offset-4">
          CONSTANCIA DE TRABAJO
        </h2>
      </div>

      <div className="text-justify space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800">
        <p>
          Por medio de la presente se hace constar que el ciudadano(a) <strong>{worker.nombres.toUpperCase()} {worker.apellidos.toUpperCase()}</strong>, titular de la Cédula de Identidad N° <strong>{worker.cedula}</strong>, portador del Código de Ficha N° <strong>{worker.id}</strong>, presta sus servicios en esta empresa desde el día <strong>{worker.fechaIngreso}</strong>, desempeñando actualmente las funciones en el cargo de <strong>{worker.cargo.toUpperCase()}</strong> en <strong>{worker.ubicacion || 'OPERACIONES NACIONALES'}</strong>, bajo la modalidad de contrato a tiempo indeterminado.
        </p>

        {config.incluirSueldo ? (
          <p>
            Asimismo, se certifica que devenga una remuneración mensual ordinaria de <strong>DIECIOCHO MIL QUINIENTOS BOLÍVARES CON 00/100 (Bs. {worker.sueldoMensualBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })})</strong>, equivalente como referencia referencial a <strong>CUATROCIENTOS CINCUENTA DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA (USD {worker.sueldoMensualUsdRef.toFixed(2)})</strong>, calculados conforme al tipo de cambio oficial del Banco Central de Venezuela (BCV), más los beneficios de ley aplicables (Cestaticket Socialista y Bono Vacacional).
          </p>
        ) : (
          <p>
            Durante su trayectoria laboral en nuestra institución, el mencionado trabajador ha demostrado alto sentido de la responsabilidad, disciplina, probidad y cumplimiento de sus deberes.
          </p>
        )}

        <p>
          Constancia que se expide a solicitud de la parte interesada, a los fines pertinentes.
        </p>
      </div>

      <div className="pt-12 grid grid-cols-2 gap-8 items-end text-center">
        <div>
          <div className="h-16 flex items-center justify-center">
            <div className="border-2 border-blue-700 text-blue-900 rounded-full w-24 h-24 flex flex-col items-center justify-center text-[7px] font-bold rotate-[-8deg] opacity-80 leading-tight">
              <span>★ OESVICA ★</span>
              <span className="my-0.5 text-blue-700">TALENTO HUMANO</span>
              <span>RIF {COMPANY_INFO.rif}</span>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-2 mt-2">
            <p className="font-bold text-slate-950 text-xs">{COMPANY_INFO.gerenteRRHH}</p>
            <p className="text-[11px] text-slate-600">{COMPANY_INFO.cargoFirmante}</p>
            <p className="text-[10px] text-slate-500 font-mono">{COMPANY_INFO.nombre}</p>
          </div>
        </div>

        <div className="text-left bg-slate-50 p-3 rounded border border-slate-200 text-[10px]">
          <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            VALIDACIÓN DIGITAL ELECTRÓNICA
          </p>
          <p className="text-slate-600">Código Único: <strong className="font-mono text-slate-900">{config.codigoValidacion}</strong></p>
          <p className="text-slate-500 mt-1">Este documento posee firma electrónica autorizada. La veracidad puede ser corroborada contactando al departamento de RRHH vía {COMPANY_INFO.telefono}.</p>
        </div>
      </div>
    </div>
  );
};

// 3. Cesta Ticket Component View
const CestaTicketPrintView: React.FC<{ data: CestaTicketData; worker: WorkerProfile }> = ({ data, worker }) => {
  return (
    <div className="space-y-6 text-xs text-slate-800">
      <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-base font-bold text-slate-950 tracking-tight">{COMPANY_INFO.nombre}</h1>
          <p className="font-mono text-slate-600">RIF: {COMPANY_INFO.rif}</p>
          <p className="text-slate-500 text-[11px]">{COMPANY_INFO.direccion}</p>
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono font-bold text-xs rounded">
            CESTATICKET SOCIALISTA
          </div>
          <p className="mt-1 font-mono font-semibold text-slate-700">Período: {data.mes} {data.ano}</p>
          <p className="text-slate-500 text-[10px]">Fecha de Abono: {data.fechaAbono}</p>
        </div>
      </div>

      <div className="bg-slate-50 p-4 border border-slate-200 rounded grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
        <div>
          <span className="text-slate-500 block text-[10px]">TRABAJADOR</span>
          <span className="font-bold text-slate-900">{worker.nombres} {worker.apellidos}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">CÉDULA DE IDENTIDAD</span>
          <span className="font-bold text-slate-900 font-mono">{worker.cedula}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">CÓDIGO DE FICHA</span>
          <span className="font-bold text-blue-900 font-mono">{worker.id}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">CARGO</span>
          <span className="font-medium text-slate-800">{worker.cargo}</span>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500 block text-[10px]">MEDIO DE ACREDITACIÓN</span>
          <span className="font-medium text-slate-800">{data.medioPago}</span>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500 block text-[10px]">ESTATUS DEL BENEFICIO</span>
          <span className="font-semibold text-emerald-700">{data.estatus}</span>
        </div>
      </div>

      {/* Monto Destacado o Estatus de Acreditación */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-amber-900 block">
            BENEFICIO DE ALIMENTACIÓN (CESTA TICKET SOCIALISTA)
          </span>
          <p className="text-xs text-amber-800 mt-0.5">
            Conforme a la Ley del Cestaticket Socialista de los Trabajadores y Trabajadoras
          </p>
          {data.linkPdf && (
            <a
              href={data.linkPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Comprobante Oficial PDF (S3)
            </a>
          )}
        </div>
        {data.montoBs !== undefined && data.montoBs > 0 ? (
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-slate-950">
              Bs. {data.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
            {data.montoUsdRef !== undefined && (
              <span className="block text-[11px] text-slate-600 font-mono">
                Equivalente BCV: ~${data.montoUsdRef.toFixed(2)} USD
              </span>
            )}
          </div>
        ) : (
          <div className="text-right">
            <span className="text-sm font-bold font-mono text-emerald-700 uppercase bg-emerald-100 px-2.5 py-1 rounded">
              {data.estatus || 'Acreditado'}
            </span>
          </div>
        )}
      </div>

      {/* Historial de Cestaticket si está disponible */}
      {data.historico && data.historico.length > 0 && (
        <div className="border border-slate-200 rounded overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 text-xs border-b border-slate-200">
            HISTORIAL DE ACREDITACIONES RECIENTES
          </div>
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-left">
              <tr>
                <th className="py-1.5 px-3 font-medium">Mes / Año</th>
                <th className="py-1.5 px-3 font-medium">Fecha de Pago</th>
                <th className="py-1.5 px-3 font-medium">Comprobante</th>
                <th className="py-1.5 px-3 font-medium text-right">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.historico.map((h, i) => (
                <tr key={i}>
                  <td className="py-2 px-3 font-medium text-slate-900">{h.mes}</td>
                  <td className="py-2 px-3 text-slate-600">{h.fecha}</td>
                  <td className="py-2 px-3 font-mono text-slate-500">{h.comprobante}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                    {h.montoBs !== undefined ? `Bs. ${h.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : 'Acreditado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-center">
        <div>
          <div className="border-t border-slate-400 pt-1 w-48 mx-auto">
            <p className="font-bold text-slate-900">{COMPANY_INFO.gerenteRRHH}</p>
            <p className="text-[10px] text-slate-500">{COMPANY_INFO.cargoFirmante}</p>
          </div>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-1 w-48 mx-auto">
            <p className="font-bold text-slate-900">{worker.nombres} {worker.apellidos}</p>
            <p className="text-[10px] text-slate-500">C.I. {worker.cedula} · Ficha: {worker.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Formato 14-100 IVSS Official Replica
const Formato14100PrintView: React.FC<{ data: Formato14100Data; worker: WorkerProfile }> = ({ data, worker }) => {
  return (
    <div className="space-y-4 text-slate-900 text-[11px] leading-tight font-sans">
      <div className="border border-slate-800 p-2.5 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-300 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-slate-900 text-xs">
              IVSS
            </div>
            <div>
              <p className="font-bold text-[11px] uppercase tracking-wider text-slate-900">
                REPÚBLICA BOLIVARIANA DE VENEZUELA
              </p>
              <p className="font-bold text-[10px] text-slate-700">
                INSTITUTO VENEZOLANO DE LOS SEGUROS SOCIALES (I.V.S.S.)
              </p>
              <p className="text-[9px] text-slate-600">DIRECCIÓN GENERAL DE AFILIACIÓN Y PRESTACIONES EN DINERO</p>
            </div>
          </div>
          <div className="text-right">
            <div className="border-2 border-slate-900 px-2 py-0.5 bg-white font-mono font-bold text-xs inline-block">
              FORMA 14-100
            </div>
            <p className="font-mono text-[9px] text-slate-700 mt-0.5">Control N°: {data.numeroFormato}</p>
            <p className="text-[9px] text-slate-500">Fecha: {data.fechaSolicitud}</p>
          </div>
        </div>

        <div className="text-center pt-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">
            CONSTANCIA DE TRABAJO PARA EL I.V.S.S.
          </h2>
          <p className="text-[9px] text-slate-600">(Para solicitudes de Prestaciones en Dinero: Pensiones / Reposos / Indemnizaciones)</p>
        </div>
      </div>

      {/* PARTE I: DATOS DEL PATRONO */}
      <div className="border border-slate-800">
        <div className="bg-slate-800 text-white px-2 py-0.5 font-bold text-[10px] tracking-wide uppercase">
          PARTE I: DATOS DEL EMPLEADOR O PATRONO
        </div>
        <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
          <div className="col-span-2">
            <span className="text-slate-500 block text-[9px]">RAZÓN SOCIAL DE LA EMPRESA:</span>
            <strong className="text-slate-900 font-semibold">{COMPANY_INFO.nombre}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">N° PATRONAL IVSS:</span>
            <strong className="font-mono text-slate-950 bg-slate-100 px-1 py-0.5 border">{COMPANY_INFO.numeroPatronalIVSS}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">R.I.F. DE LA EMPRESA:</span>
            <strong className="font-mono text-slate-900">{COMPANY_INFO.rif}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 block text-[9px]">DIRECCIÓN FISCAL:</span>
            <span className="text-slate-800">{COMPANY_INFO.direccion}</span>
          </div>
        </div>
      </div>

      {/* PARTE II: DATOS DEL ASEGURADO */}
      <div className="border border-slate-800">
        <div className="bg-slate-800 text-white px-2 py-0.5 font-bold text-[10px] tracking-wide uppercase">
          PARTE II: DATOS DEL TRABAJADOR / ASEGURADO
        </div>
        <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div className="col-span-2">
            <span className="text-slate-500 block text-[9px]">APELLIDOS Y NOMBRES:</span>
            <strong className="text-slate-900 uppercase font-semibold">{worker.nombres} {worker.apellidos}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">CÉDULA DE IDENTIDAD:</span>
            <strong className="font-mono text-slate-900">{worker.cedula}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">CÓDIGO DE FICHA:</span>
            <strong className="font-mono text-blue-900">{worker.id}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">FECHA DE INGRESO:</span>
            <strong className="font-mono text-slate-900">{worker.fechaIngreso}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">FECHA DE RETIRO O EGRESO:</span>
            <strong className="text-slate-900">{data.estatusAsegurado === 'Activo' ? 'ACTIVO (Vigente)' : 'Cesante'}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500 block text-[9px]">CARGO O OCUPACIÓN PRINCIPAL:</span>
            <strong className="text-slate-900">{worker.cargo}</strong>
          </div>
        </div>
      </div>

      {/* PARTE III: RELACIÓN DE SALARIOS COTIZADOS */}
      <div className="border border-slate-800">
        <div className="bg-slate-800 text-white px-2 py-0.5 font-bold text-[10px] tracking-wide uppercase flex justify-between">
          <span>PARTE III: RELACIÓN DE SALARIOS DEVENGADOS (HISTORIAL DE COTIZACIONES)</span>
          <span className="text-[9px] font-normal">Base de Cálculo según Art. 67 y 143 Reglamento IVSS</span>
        </div>
        <table className="w-full text-center text-[10px] border-collapse">
          <thead className="bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="p-1 border-r border-slate-300">Año</th>
              <th className="p-1 border-r border-slate-300">Semanas Cotizadas</th>
              <th className="p-1 border-r border-slate-300">Salario Promedio Semanal (Bs.)</th>
              <th className="p-1 border-r border-slate-300">Salario Mensual Cotizado (Bs.)</th>
              <th className="p-1">Total Devengado en el Año (Bs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.historialSalarios.map((item) => (
              <tr key={item.ano}>
                <td className="p-1 border-r border-slate-200 font-mono font-bold text-slate-900">{item.ano}</td>
                <td className="p-1 border-r border-slate-200 font-mono">{item.semanasCotizadas}</td>
                <td className="p-1 border-r border-slate-200 font-mono text-right pr-2">
                  {item.salarioPromedioSemanal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1 border-r border-slate-200 font-mono text-right pr-2">
                  {item.salarioMensual.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1 font-mono text-right pr-2 font-medium">
                  {(item.salarioMensual * 12).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-800 font-bold">
            <tr>
              <td colSpan={2} className="p-1 text-left pl-2 font-mono">
                TOTAL SEMANAS COTIZADAS EMPRESA: {data.semanasTotalesAcreditadas}
              </td>
              <td colSpan={3} className="p-1 text-right pr-2 text-blue-900">
                MOTIVO: TRAMITACIÓN DE PENSIÓN POR {data.motivoSolicitud.toUpperCase()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* PARTE IV: DECLARACIÓN JURADA Y FIRMAS */}
      <div className="border border-slate-800 p-2 text-[9px] bg-slate-50">
        <p className="text-justify text-slate-700">
          <strong>DECLARACIÓN JURADA DEL PATRONO O REPRESENTANTE LEGAL:</strong> Certifico bajo fe de juramento que los datos contenidos en este documento son copia fiel y exacta de los libros de nómina de {COMPANY_INFO.nombre}, conforme a la Ley del Seguro Social y su Reglamento.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-6 text-center items-end">
          <div>
            <div className="border-t border-slate-800 pt-1">
              <p className="font-bold text-[10px] text-slate-900">{COMPANY_INFO.gerenteRRHH}</p>
              <p className="text-[9px] text-slate-600">{COMPANY_INFO.cargoFirmante}</p>
              <p className="text-[8px] text-slate-500 font-mono">Firma y Sello de la Empresa Empleadora</p>
            </div>
          </div>

          <div>
            <div className="border-t border-slate-800 pt-1">
              <p className="font-bold text-[10px] text-slate-900">{worker.nombres} {worker.apellidos}</p>
              <p className="text-[9px] text-slate-600">C.I. {worker.cedula} · Ficha: {worker.id}</p>
              <p className="text-[8px] text-slate-500">Firma del Trabajador Asegurado</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-300 mt-4 pt-1 flex justify-between text-[8px] text-slate-500">
          <span>Código Electrónico IVSS: {data.codigoVerificacion}</span>
          <span>Forma oficial aprobada por el IVSS conforme a la Gaceta Oficial de la República</span>
        </div>
      </div>
    </div>
  );
};
