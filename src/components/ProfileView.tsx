import React from 'react';
import { COMPANY_INFO, CURRENT_WORKER } from '../data/mockData';
import {
  User,
  Briefcase,
  Calendar,
  CreditCard,
  Building,
  ShieldCheck,
  Palmtree,
  Mail,
  Phone,
  MapPin,
  Clock
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 space-y-4">
      {/* Worker Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
            {CURRENT_WORKER.nombres[0]}{CURRENT_WORKER.apellidos[0]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {CURRENT_WORKER.nombres} {CURRENT_WORKER.apellidos}
              </h1>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                Activo
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">
              {CURRENT_WORKER.cargo}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              C.I. {CURRENT_WORKER.cedula} · Ficha: {CURRENT_WORKER.id}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row (Ionic Cards) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Palmtree className="w-4 h-4 text-emerald-500" />
            <span>Vacaciones</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {CURRENT_WORKER.diasVacacionesDisponibles} <span className="text-xs font-normal text-slate-500">días hábiles</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Acumuladas según LOTTT</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Antigüedad</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            5 <span className="text-xs font-normal text-slate-500">años de servicio</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ingreso: {CURRENT_WORKER.fechaIngreso}</p>
        </div>
      </div>

      {/* Labor Details (Ionic List) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Ficha Laboral & Contractual
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400" /> Departamento
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{CURRENT_WORKER.departamento}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Tipo de Contrato
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{CURRENT_WORKER.tipoContrato}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" /> Salario Mensual Base
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              Bs. {CURRENT_WORKER.sueldoMensualBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              <span className="text-slate-400 font-normal ml-1">(Ref. ${CURRENT_WORKER.sueldoMensualUsdRef})</span>
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" /> Depósito de Nómina
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {CURRENT_WORKER.banco} ({CURRENT_WORKER.numeroCuenta.slice(-4)})
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Afiliación IVSS
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {CURRENT_WORKER.afiliacionIVSS}
            </span>
          </div>
        </div>
      </div>

      {/* Contact & Company Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Datos de Contacto & Empresa
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{CURRENT_WORKER.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{CURRENT_WORKER.telefono}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{COMPANY_INFO.nombre} (RIF: {COMPANY_INFO.rif})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
