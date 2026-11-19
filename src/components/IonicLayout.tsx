import React, { useState } from 'react';
import { DocumentType, PaystubData, WorkLetterConfig, Formato14100Data, WorkerProfile, CestaTicketData } from '../types';
import { ChatWindow } from './ChatWindow';
import { DocumentModal } from './DocumentModal';
import corporateAvatarImg from '../assets/images/corporate_avatar_neutral_1793718425841.jpg';
import { CURRENT_WORKER } from '../data/mockData';
import {
  Smartphone,
  Maximize2,
  Signal,
  Wifi,
  Battery
} from 'lucide-react';

export const IonicLayout: React.FC = () => {
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  // Document Modal State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [selectedPaystub, setSelectedPaystub] = useState<PaystubData | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<WorkLetterConfig | null>(null);
  const [selectedCestaTicket, setSelectedCestaTicket] = useState<CestaTicketData | null>(null);
  const [selectedFormato14100, setSelectedFormato14100] = useState<Formato14100Data | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);

  const handleOpenDocument = (
    type: DocumentType,
    paystub?: PaystubData,
    letter?: WorkLetterConfig,
    formato?: Formato14100Data,
    worker?: WorkerProfile,
    cestaTicket?: CestaTicketData
  ) => {
    setSelectedDocType(type);
    setSelectedPaystub(paystub || null);
    setSelectedLetter(letter || null);
    setSelectedFormato14100(formato || null);
    setSelectedWorker(worker || null);
    setSelectedCestaTicket(cestaTicket || null);
    setIsDocModalOpen(true);
  };

  const isEmbedded = typeof window !== 'undefined' && (
    window.self !== window.top ||
    new URLSearchParams(window.location.search).get('embed') === 'true'
  );

  if (isEmbedded) {
    return (
      <div className="w-full h-full min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
        <ChatWindow onOpenDocument={handleOpenDocument} className="flex-1 h-full w-full" />
        <DocumentModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          documentType={selectedDocType}
          paystubData={selectedPaystub}
          letterConfig={selectedLetter}
          cestaTicketData={selectedCestaTicket}
          formato14100Data={selectedFormato14100}
          workerProfile={selectedWorker}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Minimal Top Control Bar (Screen mode & Angular Ionic code) */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-200">
            Chatbot de Atención al Trabajador
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Alternar entre vista simulador móvil y vista completa"
          >
            {isMobileFrame ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Vista Completa</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Modo Móvil</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Chatbot Workspace (Without menu oesvica and without bottom navigation) */}
      <main className="flex-1 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
        {isMobileFrame ? (
          /* IONIC SMARTPHONE SIMULATOR FRAME */
          <div className="relative w-full max-w-[440px] h-[100dvh] sm:h-[860px] sm:max-h-[94vh] bg-slate-900 sm:rounded-[42px] sm:border-[10px] sm:border-slate-800 sm:shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-700/50">
            {/* Phone Notch / Island (iOS Style) */}
            <div className="bg-slate-900 text-white px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-medium shrink-0 select-none z-20">
              <span className="font-mono">9:41</span>
              <div className="w-20 h-4 bg-black rounded-full mx-auto hidden sm:block"></div>
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Simulated Ionic Header (ion-header) */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-4 py-3 shadow-md shrink-0 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white/70 overflow-hidden shadow-inner ring-2 ring-blue-300/40">
                    <img
                      src={corporateAvatarImg}
                      alt="Asistente Corporativo OESVICA"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-blue-700 rounded-full">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold tracking-tight leading-tight">
                      Atención al Trabajador
                    </h1>
                    <span className="bg-red-500 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider text-white shadow-sm flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      EN VIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-100 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Asistente Virtual • Video Presenter OESVICA
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Chat Content (ion-content) - No bottom tabs */}
            <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-950 flex flex-col">
              <ChatWindow onOpenDocument={handleOpenDocument} className="flex-1" />
            </div>

            {/* Phone Home Bar Affordance */}
            <div className="bg-white dark:bg-slate-900 pb-1.5 pt-0.5 flex justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
        ) : (
          /* EXPANDED DESKTOP VIEW - Pure Chatbot, No Sidebar, No Bottom Menu */
          <div className="w-full max-w-4xl h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden relative">
            <ChatWindow onOpenDocument={handleOpenDocument} className="flex-1" />
          </div>
        )}
      </main>

      {/* Official Printable Document Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        documentType={selectedDocType}
        paystubData={selectedPaystub}
        letterConfig={selectedLetter}
        cestaTicketData={selectedCestaTicket}
        formato14100Data={selectedFormato14100}
        workerProfile={selectedWorker}
      />
    </div>
  );
};
