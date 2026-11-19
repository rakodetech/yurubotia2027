import React, { useState } from 'react';
import { FAQ_DATA, COMPANY_INFO } from '../data/mockData';
import { ChevronDown, ChevronUp, HelpCircle, PhoneCall, Mail, BookOpen, AlertCircle } from 'lucide-react';

interface HelpFaqViewProps {
  onSelectTopic: (question: string) => void;
}

export const HelpFaqView: React.FC<HelpFaqViewProps> = ({ onSelectTopic }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" /> Centro de Ayuda Laboral
        </div>
        <h1 className="text-lg font-bold">Preguntas Frecuentes & Normativa</h1>
        <p className="text-xs text-blue-100 mt-1">
          Información legal fundamentada en la LOTTT, reglamentos del IVSS y políticas internas.
        </p>
      </div>

      {/* FAQs List */}
      <div className="space-y-2.5">
        {FAQ_DATA.map((faq, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
          >
            <button
              onClick={() => toggleAccordion(idx)}
              className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                {faq.pregunta}
              </span>
              {openIndex === idx ? (
                <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {openIndex === idx && (
              <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                <p>{faq.respuesta}</p>
                <div className="mt-3">
                  <button
                    onClick={() => onSelectTopic(faq.pregunta)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Consultar este tema en el Chatbot →
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Emergency Contact RRHH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
          Contacto Directo con Gestión del Talento
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          Si requieres atención especializada o presentar un caso especial, comunícate con nosotros:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 block">TELÉFONO RRHH</span>
            <span className="font-semibold text-slate-900 dark:text-white">{COMPANY_INFO.telefono}</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 block">CORREO ELECTRÓNICO</span>
            <span className="font-semibold text-slate-900 dark:text-white">rrhh@empresa.com.ve</span>
          </div>
        </div>
      </div>
    </div>
  );
};
