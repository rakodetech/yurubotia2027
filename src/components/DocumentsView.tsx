import React, { useState } from 'react';
import { CestaTicketData, Formato14100Data, PaystubData, WorkerProfile, WorkLetterConfig } from '../types';
import { COMPANY_INFO, CURRENT_WORKER, DEFAULT_CESTA_TICKET, INITIAL_FORMATO_14100, MOCK_PAYSTUBS } from '../data/mockData';
import {
  FileText,
  FileCheck,
  Building2,
  Utensils,
  ExternalLink
} from 'lucide-react';

interface DocumentsViewProps {
  onOpenDocument: (
    type: 'recibo_pago' | 'carta_trabajo' | 'cesta_ticket' | 'formato_14100',
    paystub?: PaystubData,
    letter?: WorkLetterConfig,
    formato?: Formato14100Data,
    worker?: WorkerProfile,
    cestaTicket?: CestaTicketData
  ) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onOpenDocument }) => {
  const [filterTab, setFilterTab] = useState<'all' | 'recibos' | 'cartas' | 'cesta' | 'ivss'>('all');

  const defaultLetter: WorkLetterConfig = {
    incluirSueldo: true,
    destinatario: 'A Quien Pueda Interesar',
    motivoTramite: 'Trámites Administrativos y Personales',
    fechaEmision: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }),
    codigoValidacion: 'VAL-OESVICA-2026-X99'
  };

  const defaultLetterBanco: WorkLetterConfig = {
    incluirSueldo: true,
    destinatario: 'Banco de Venezuela, S.A.',
    motivoTramite: 'Apertura de Cuenta y Trámite Crediticio',
    fechaEmision: '28 de Septiembre de 2026',
    codigoValidacion: 'VAL-OESVICA-2026-BDV01'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Documentos OESVICA</h1>
        <p className="text-xs text-slate-500">Recibos de pagos, Carta de Trabajo, Cesta Ticket y Forma14100</p>

        {/* Filter Segmented Control (Ionic Segment style) */}
        <div className="mt-3 grid grid-cols-5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
          <button
            onClick={() => setFilterTab('all')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterTab('recibos')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'recibos'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Recibos
          </button>
          <button
            onClick={() => setFilterTab('cartas')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'cartas'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Cartas
          </button>
          <button
            onClick={() => setFilterTab('cesta')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'cesta'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Cesta Ticket
          </button>
          <button
            onClick={() => setFilterTab('ivss')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'ivss'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Forma 14-100
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="p-4 space-y-3">
        {/* CESTA TICKET CARD */}
        {(filterTab === 'all' || filterTab === 'cesta') && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Cesta Ticket Socialista (Alimentación)
                    </h2>
                    <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                      Acreditado
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Beneficio de alimentación mensual indexado para trabajadores de OESVICA
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ley de Cestaticket Socialista</span>
                    <span>·</span>
                    <span>{DEFAULT_CESTA_TICKET.medioPago}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Estatus: {DEFAULT_CESTA_TICKET.estatus}</span>
              <button
                onClick={() => onOpenDocument('cesta_ticket', undefined, undefined, undefined, undefined, DEFAULT_CESTA_TICKET)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Comprobante
              </button>
            </div>
          </div>
        )}

        {/* FORMA 14-100 IVSS */}
        {(filterTab === 'all' || filterTab === 'ivss') && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Constancia IVSS Forma 14-100
                    </h2>
                    <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                      Oficial
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Certificación de semanas cotizadas y salarios devengados ante el IVSS
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-mono">
                    <span>N° Patronal: {COMPANY_INFO.numeroPatronalIVSS}</span>
                    <span>·</span>
                    <span>{INITIAL_FORMATO_14100.semanasTotalesAcreditadas} semanas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Control: {INITIAL_FORMATO_14100.numeroFormato}</span>
              <button
                onClick={() => onOpenDocument('formato_14100', undefined, undefined, INITIAL_FORMATO_14100)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Forma 14-100
              </button>
            </div>
          </div>
        )}

        {/* CARTAS DE TRABAJO */}
        {(filterTab === 'all' || filterTab === 'cartas') && (
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Carta de Trabajo (A Quien Pueda Interesar)
                      </h2>
                      <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                        Con Sueldo
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Constancia laboral certificada con QR y sello húmedo de OESVICA
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span>Emisión: {defaultLetter.fechaEmision}</span>
                      <span>·</span>
                      <span className="font-mono">Cód: {defaultLetter.codigoValidacion}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Bs. {CURRENT_WORKER.sueldoMensualBs.toLocaleString('es-VE')}</span>
                <button
                  onClick={() => onOpenDocument('carta_trabajo', undefined, defaultLetter)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Carta
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Carta de Trabajo (Banco de Venezuela)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Destinada a apertura de cuenta bancaria y solicitud crediticia
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span>Emisión: {defaultLetterBanco.fechaEmision}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Banco de Venezuela</span>
                <button
                  onClick={() => onOpenDocument('carta_trabajo', undefined, defaultLetterBanco)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Carta
                </button>
              </div>
            </div>
          </>
        )}

        {/* RECIBOS DE PAGO */}
        {(filterTab === 'all' || filterTab === 'recibos') && (
          <>
            {MOCK_PAYSTUBS.map((stub) => (
              <div
                key={stub.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          Recibo {stub.quincena} Quincena {stub.mes} {stub.ano}
                        </h2>
                        <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                          Pagado
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Período: {stub.periodo} · Fecha Pago: {stub.fechaPago}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                        <span>Asignaciones: Bs. {stub.totalAsignaciones.toLocaleString('es-VE')}</span>
                        <span>·</span>
                        <span>Deducciones: Bs. {stub.totalDeducciones.toLocaleString('es-VE')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Neto: </span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Bs. {stub.netoPagar.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <button
                    onClick={() => onOpenDocument('recibo_pago', stub)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver Recibo
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
