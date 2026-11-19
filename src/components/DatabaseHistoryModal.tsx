import React, { useEffect, useState } from 'react';
import {
  Database,
  X,
  RefreshCw,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Search,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Play,
  Check,
  Save,
  Globe,
  Code2,
  Server,
  RotateCcw
} from 'lucide-react';
import {
  historyDatabaseService,
  DbStatusResponse,
  UserSessionRecord
} from '../services/historyDatabaseService';

interface DatabaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

interface MenuEditForm {
  id_opcion: string;
  label: string;
  action: string;
  categoria: 'primary' | 'secondary' | 'neutral';
  icono?: string;
  endpoint_url?: string;
  endpoint_method: 'GET' | 'POST' | 'PUT';
  endpoint_body_type: 'url_encoded' | 'json' | 'none';
  endpoint_body_template?: string;
  mensaje_confirmacion?: string;
  orden: number;
  activo: number;
}

export const DatabaseHistoryModal: React.FC<DatabaseHistoryModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sesiones' | 'menu_config' | 'db_config' | 'sql'>('sesiones');

  // Config & Dynamic Menu states from MySQL
  const [welcomeText, setWelcomeText] = useState('');
  const [promptFichaText, setPromptFichaText] = useState('');
  const [menuTitleText, setMenuTitleText] = useState('');
  const [menuList, setMenuList] = useState<any[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Menu item CRUD state (no window.alert / window.confirm)
  const [editingItem, setEditingItem] = useState<MenuEditForm | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; data?: any; error?: string } | null>(null);
  const [crudNotice, setCrudNotice] = useState<string | null>(null);

  // MySQL Connection Settings state
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('atc2026');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, sessionList, config, allMenu] = await Promise.all([
        historyDatabaseService.getDbStatus(),
        historyDatabaseService.getSessions(),
        historyDatabaseService.getChatConfig(),
        historyDatabaseService.getAllMenu()
      ]);
      setDbStatus(status);
      setSessions(sessionList);
      if (sessionList.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessionList[0].id_sesion);
      }

      if (config) {
        setWelcomeText(config.welcomeMessage || '');
        setPromptFichaText(config.promptFichaMessage || '');
        setMenuTitleText(config.menuTitle || '');
      }

      if (status?.mysqlConfig) {
        setDbHost(status.mysqlConfig.host || 'localhost');
        setDbPort(String(status.mysqlConfig.port || 3306));
        setDbUser(status.mysqlConfig.user || 'root');
        setDbName(status.mysqlConfig.database || 'atc2026');
      }

      setMenuList(allMenu || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSessionId) {
      setLoadingMessages(true);
      historyDatabaseService.getSessionHistory(selectedSessionId).then((msgs) => {
        setSessionMessages(msgs);
        setLoadingMessages(false);
      });
    }
  }, [selectedSessionId]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setCrudNotice(msg);
    setTimeout(() => setCrudNotice(null), 3500);
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigSuccess(false);
    const ok = await historyDatabaseService.updateChatConfig({
      welcomeMessage: welcomeText,
      promptFichaMessage: promptFichaText,
      menuTitle: menuTitleText
    });
    setIsSavingConfig(false);
    if (ok) {
      setConfigSuccess(true);
      showNotification('✅ Mensajes guardados en la configuración de MySQL con éxito');
      setTimeout(() => setConfigSuccess(false), 3000);
      if (onConfigUpdated) onConfigUpdated();
    }
  };

  const handleToggleMenuItem = async (item: any) => {
    const updated = { ...item, activo: item.activo === 1 ? 0 : 1 };
    await historyDatabaseService.saveMenuOption(updated);
    setMenuList((prev) => prev.map((m) => (m.id_opcion === item.id_opcion ? updated : m)));
    showNotification(`Opción "${item.label}" ${updated.activo === 1 ? 'activada' : 'desactivada'}`);
    if (onConfigUpdated) onConfigUpdated();
  };

  const handleConfirmDelete = async (id: string) => {
    await historyDatabaseService.deleteMenuOption(id);
    setMenuList((prev) => prev.filter((m) => m.id_opcion !== id));
    setDeletingId(null);
    showNotification('Opción de menú eliminada de MySQL');
    if (onConfigUpdated) onConfigUpdated();
  };

  const handleSaveMenuItem = async () => {
    setFormError(null);
    if (!editingItem) return;

    if (!editingItem.label.trim()) {
      setFormError('El texto del botón (label) es obligatorio');
      return;
    }
    if (!editingItem.action.trim()) {
      setFormError('El identificador de acción (action) es obligatorio');
      return;
    }

    await historyDatabaseService.saveMenuOption(editingItem);
    const updatedAll = await historyDatabaseService.getAllMenu();
    setMenuList(updatedAll);
    setEditingItem(null);
    setIsNewItem(false);
    showNotification(`✅ Opción "${editingItem.label}" guardada exitosamente en MySQL`);
    if (onConfigUpdated) onConfigUpdated();
  };

  const handleResetDefaults = async () => {
    const ok = await historyDatabaseService.resetMenuDefaults();
    if (ok) {
      const updated = await historyDatabaseService.getAllMenu();
      setMenuList(updated);
      showNotification('✅ Opciones restauradas a los valores predeterminados de OESVICA');
      if (onConfigUpdated) onConfigUpdated();
    }
  };

  const handleSaveDbConnection = async () => {
    setIsTestingConnection(true);
    setConnectionNotice(null);
    try {
      const res = await historyDatabaseService.updateDbConfig({
        host: dbHost.trim(),
        port: Number(dbPort) || 3306,
        user: dbUser.trim(),
        password: dbPassword,
        database: dbName.trim()
      });

      const updatedStatus = await historyDatabaseService.getDbStatus();
      setDbStatus(updatedStatus);

      if (res.isMysqlConnected) {
        setConnectionNotice({
          ok: true,
          msg: `¡Conexión establecida con éxito a MySQL (${dbHost}:${dbPort}/${dbName})! Las tablas y datos están sincronizados.`
        });
        showNotification('MySQL conectado exitosamente');
      } else {
        setConnectionNotice({
          ok: false,
          msg: `No se pudo conectar a MySQL: ${res.error || 'Asegúrese de que el servidor MySQL esté activo y ejecute database.sql'}`
        });
      }
    } catch (err: any) {
      setConnectionNotice({
        ok: false,
        msg: `Error al probar conexión: ${err?.message || 'Error desconocido'}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestEndpoint = async (item: any) => {
    if (!item.endpoint_url) {
      setTestResult({
        id: item.id_opcion,
        success: false,
        error: 'Esta opción no tiene una URL de endpoint configurada.'
      });
      return;
    }

    setTestingEndpointId(item.id_opcion);
    setTestResult(null);

    let samplePayload: Record<string, any> = {};
    if (item.endpoint_body_template) {
      try {
        const templated = item.endpoint_body_template
          .replace(/{ficha}/g, '001337')
          .replace(/{cod_ficha}/g, '001337')
          .replace(/{nombre}/g, 'CIRILO RAMON LINARES URBINA')
          .replace(/{cedula}/g, 'V-8668069')
          .replace(/{seccion}/g, 'Sistemas y Tecnología');
        samplePayload = JSON.parse(templated);
      } catch {
        samplePayload = {
          ficha: '001337',
          cod_ficha: '001337',
          nombre: 'CIRILO RAMON LINARES URBINA',
          seccion: 'Sistemas y Tecnología'
        };
      }
    } else {
      samplePayload = {
        ficha: '001337',
        cod_ficha: '001337',
        nombre: 'CIRILO RAMON LINARES URBINA',
        seccion: 'Sistemas y Tecnología'
      };
    }

    const res = await historyDatabaseService.executeDynamicEndpoint(
      item.endpoint_url,
      item.endpoint_method || 'POST',
      item.endpoint_body_type || 'url_encoded',
      samplePayload
    );

    setTestingEndpointId(null);
    setTestResult({
      id: item.id_opcion,
      success: res.success,
      data: res.data,
      error: res.error
    });
  };

  const filteredSessions = sessions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.cod_ficha && s.cod_ficha.toLowerCase().includes(term)) ||
      (s.nombre_trabajador && s.nombre_trabajador.toLowerCase().includes(term)) ||
      (s.seccion_usuario && s.seccion_usuario.toLowerCase().includes(term)) ||
      (s.cargo && s.cargo.toLowerCase().includes(term)) ||
      s.id_sesion.toLowerCase().includes(term)
    );
  });

  const selectedSession = sessions.find((s) => s.id_sesion === selectedSessionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Panel MySQL: Sesiones, Bienvenida y Menú Dinámico
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historial con sección del trabajador, CRUD de menú con endpoints y configuración en <span className="font-mono text-blue-600 dark:text-blue-400">database.sql</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Conexión MySQL:</span>
            {dbStatus?.isMysqlConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Conectado ({dbStatus.mysqlConfig.host}:{dbStatus.mysqlConfig.port}/{dbStatus.mysqlConfig.database})
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 cursor-pointer"
                onClick={() => setActiveTab('db_config')}
                title="Haga clic aquí para configurar o reconectar MySQL"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Servidor Local Activo (Haga clic para configurar conexión MySQL)
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400">Total Sesiones:</span> <span className="font-bold">{sessions.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Opciones Menú:</span> <span className="font-bold">{menuList.filter((m) => m.activo === 1).length} activas</span>
            </div>
          </div>
        </div>

        {/* Notice toast */}
        {crudNotice && (
          <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{crudNotice}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-5 pt-2 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sesiones')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'sesiones'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Sesiones & Historial ({filteredSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('menu_config')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'menu_config'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Bienvenida & Menú con Endpoints MySQL</span>
          </button>

          <button
            onClick={() => setActiveTab('db_config')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'db_config'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Conexión MySQL</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              activeTab === 'sql'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Script database.sql</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === 'sesiones' && (
            <>
              {/* Left Column: Sessions List */}
              <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por ficha, nombre, sección..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSessions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No se encontraron sesiones registradas.
                    </div>
                  ) : (
                    filteredSessions.map((ses) => {
                      const isSelected = ses.id_sesion === selectedSessionId;
                      return (
                        <div
                          key={ses.id_sesion}
                          onClick={() => setSelectedSessionId(ses.id_sesion)}
                          className={`p-3.5 cursor-pointer transition-colors text-left ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-3 border-blue-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {ses.cod_ficha ? `Ficha #${ses.cod_ficha}` : 'Sin Ficha'}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                ses.estado === 'activa'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {ses.estado}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {ses.nombre_trabajador || 'Usuario en chat'}
                          </div>

                          {/* SECCIÓN DEL USUARIO REGISTRADA */}
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <span className="text-slate-400 dark:text-slate-500 font-normal">Sección:</span>
                            <span className="truncate">{ses.seccion_usuario || 'Seguridad y Vigilancia Operativa'}</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ses.fecha_inicio).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>{ses.total_mensajes || 0} mensajes</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Messages Transcript */}
              <div className="w-full md:w-7/12 flex flex-col bg-slate-50 dark:bg-slate-950/40">
                {selectedSession ? (
                  <>
                    <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {selectedSession.nombre_trabajador || 'Sesión'} ({selectedSession.id_sesion})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Sección: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedSession.seccion_usuario}</span> • Cargo: {selectedSession.cargo || 'No especificado'}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                      {loadingMessages ? (
                        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                          Cargando historial de mensajes...
                        </div>
                      ) : sessionMessages.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          Esta sesión aún no tiene mensajes registrados en la base de datos.
                        </div>
                      ) : (
                        sessionMessages.map((m: any, idx: number) => {
                          const isBot = m.remitente === 'asistente' || m.remitente === 'bot';
                          return (
                            <div
                              key={m.id || idx}
                              className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                            >
                              <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                <span className="font-semibold">{isBot ? 'OESVICA Bot' : 'Trabajador'}</span>
                                {m.seccion_usuario && (
                                  <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-1 py-0.2 rounded">
                                    {m.seccion_usuario}
                                  </span>
                                )}
                                <span>• {new Date(m.fecha_envio || Date.now()).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>

                              <div
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                                  isBot
                                    ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                    : 'bg-blue-600 text-white font-medium'
                                }`}
                              >
                                {m.mensaje}
                                {m.enlace_documento && (
                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                                    <a
                                      href={m.enlace_documento}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-500 hover:underline break-all"
                                    >
                                      🔗 Ver documento ({m.tipo_documento || 'PDF'})
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400">
                    Selecciona una sesión de la izquierda para ver su historial completo.
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'menu_config' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs bg-slate-50/50 dark:bg-slate-900">
              {/* 1. SECCIÓN: Mensajes leídos desde MySQL */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold">1</span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      Mensajes Dinámicos desde MySQL (<span className="font-mono text-xs">configuracion_chatbot</span>)
                    </h3>
                  </div>
                  {configSuccess && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                      <Check className="w-3.5 h-3.5" /> ¡Guardado en MySQL con éxito!
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      1. Mensaje de Bienvenida al Iniciar Chatbot:
                    </label>
                    <textarea
                      rows={3}
                      value={welcomeText}
                      onChange={(e) => setWelcomeText(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-sans"
                      placeholder="Ingrese el mensaje de bienvenida..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      2. Mensaje de Solicitud de Ficha (Carnet):
                    </label>
                    <textarea
                      rows={2}
                      value={promptFichaText}
                      onChange={(e) => setPromptFichaText(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-sans"
                      placeholder="Mensaje solicitando el código de ficha..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      3. Título del Menú de Opciones (Soporta <span className="font-mono">{'{nombre}'}</span> y <span className="font-mono">{'{ficha}'}</span>):
                    </label>
                    <input
                      type="text"
                      value={menuTitleText}
                      onChange={(e) => setMenuTitleText(e.target.value)}
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-sans"
                      placeholder="Menú de opciones para {nombre} (Ficha {ficha}):"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingConfig ? 'Guardando en MySQL...' : 'Guardar Mensajes en MySQL'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. SECCIÓN: Menú Principal con llamadas a Endpoints */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold">2</span>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        Menú Principal Dinámico con Endpoints (<span className="font-mono text-xs">menu_principal_opciones</span>)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Crea, edita o elimina botones del menú y asócialos a cualquier endpoint HTTP (POST/GET) con soporte de variables.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetDefaults}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                      title="Restaurar las 4 opciones oficiales de OESVICA"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Restaurar Predeterminados</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingItem({
                          id_opcion: `opt_${Date.now()}`,
                          label: '📌 Nueva Opción',
                          action: `action_custom_${Math.floor(Math.random() * 1000)}`,
                          categoria: 'primary',
                          icono: 'FileText',
                          endpoint_url: 'http://212.56.33.4:5678/webhook/api/v20/custom',
                          endpoint_method: 'POST',
                          endpoint_body_type: 'url_encoded',
                          endpoint_body_template: '{"ficha":"{ficha}","seccion":"{seccion}"}',
                          mensaje_confirmacion: 'Su solicitud ha sido procesada y enviada a la plataforma OESVICA.',
                          orden: (menuList.length + 1) * 10,
                          activo: 1
                        });
                        setIsNewItem(true);
                        setFormError(null);
                        setTestResult(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear Nuevo Menú con Endpoint</span>
                    </button>
                  </div>
                </div>

                {/* Formulario de edición/creación de opción */}
                {editingItem && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-blue-600" />
                        {isNewItem ? 'Crear Nuevo Botón de Menú con Endpoint' : `Editando: ${editingItem.label}`}
                      </h4>
                      <button
                        onClick={() => {
                          setEditingItem(null);
                          setIsNewItem(false);
                          setFormError(null);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {formError && (
                      <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Texto del Botón (Label):
                        </label>
                        <input
                          type="text"
                          value={editingItem.label}
                          onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                          placeholder="Ej: 📜 Certificado Laboral"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Acción Identificadora (action):
                        </label>
                        <input
                          type="text"
                          value={editingItem.action}
                          onChange={(e) => setEditingItem({ ...editingItem, action: e.target.value })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                          placeholder="action_certificado"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          URL del Endpoint a Invocar:
                        </label>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={editingItem.endpoint_url || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, endpoint_url: e.target.value })}
                            className="flex-1 p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                            placeholder="http://212.56.33.4:5678/webhook/..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Método HTTP:
                        </label>
                        <select
                          value={editingItem.endpoint_method}
                          onChange={(e) => setEditingItem({ ...editingItem, endpoint_method: e.target.value as any })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                          <option value="PUT">PUT</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Formato de Body:
                        </label>
                        <select
                          value={editingItem.endpoint_body_type}
                          onChange={(e) => setEditingItem({ ...editingItem, endpoint_body_type: e.target.value as any })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        >
                          <option value="url_encoded">x-www-form-urlencoded (Estándar OESVICA)</option>
                          <option value="json">application/json</option>
                          <option value="none">Sin Cuerpo (GET Query)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Plantilla de Parámetros (Variables: <span className="font-mono">{'{ficha}'}</span>, <span className="font-mono">{'{cedula}'}</span>, <span className="font-mono">{'{nombre}'}</span>, <span className="font-mono">{'{seccion}'}</span>):
                        </label>
                        <input
                          type="text"
                          value={editingItem.endpoint_body_template || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, endpoint_body_template: e.target.value })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                          placeholder='{"ficha":"{ficha}", "seccion":"{seccion}"}'
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Mensaje de Confirmación del Asistente:
                        </label>
                        <input
                          type="text"
                          value={editingItem.mensaje_confirmacion || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, mensaje_confirmacion: e.target.value })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                          placeholder="Su solicitud ha sido generada y enviada a la plataforma OESVICA."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Orden de aparición:
                        </label>
                        <input
                          type="number"
                          value={editingItem.orden}
                          onChange={(e) => setEditingItem({ ...editingItem, orden: Number(e.target.value) })}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={editingItem.activo === 1}
                            onChange={(e) => setEditingItem({ ...editingItem, activo: e.target.checked ? 1 : 0 })}
                            className="rounded text-blue-600 w-4 h-4"
                          />
                          <span className="font-semibold text-xs">Activo en el Menú Principal</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleTestEndpoint(editingItem)}
                        disabled={testingEndpointId === editingItem.id_opcion}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        <Play className="w-3.5 h-3.5 text-blue-600" />
                        <span>{testingEndpointId === editingItem.id_opcion ? 'Probando...' : 'Probar Endpoint'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(null);
                            setIsNewItem(false);
                            setFormError(null);
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium cursor-pointer text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveMenuItem}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Opción en MySQL</span>
                        </button>
                      </div>
                    </div>

                    {testResult && testResult.id === editingItem.id_opcion && (
                      <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-700">
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                          {testResult.success ? (
                            <span className="text-emerald-400">✅ Respuesta de Endpoint:</span>
                          ) : (
                            <span className="text-amber-400">⚠️ Resultado de Endpoint:</span>
                          )}
                        </div>
                        <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.data || testResult.error, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de opciones de menú configuradas */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {menuList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No hay opciones de menú configuradas en MySQL.
                    </div>
                  ) : (
                    menuList.map((item) => (
                      <div
                        key={item.id_opcion}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.activo === 1 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-950/40 opacity-70'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                              {item.label}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {item.action}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                item.endpoint_method === 'GET'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {item.endpoint_method || 'POST'}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                item.activo === 1
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {item.activo === 1 ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 truncate">
                            {item.endpoint_url || 'Sin endpoint configurado'}
                          </div>

                          {item.mensaje_confirmacion && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {item.mensaje_confirmacion}
                            </div>
                          )}

                          {deletingId === item.id_opcion && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between text-xs text-red-700 dark:text-red-300">
                              <span>¿Confirma eliminar <strong>{item.label}</strong>?</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleConfirmDelete(item.id_opcion)}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer text-[11px]"
                                >
                                  Sí, eliminar
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium cursor-pointer text-[11px]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleTestEndpoint(item)}
                            disabled={testingEndpointId === item.id_opcion}
                            title="Probar llamada a este endpoint"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer transition-colors"
                          >
                            <Play className={`w-3.5 h-3.5 text-blue-600 ${testingEndpointId === item.id_opcion ? 'animate-pulse' : ''}`} />
                          </button>

                          <button
                            onClick={() => handleToggleMenuItem(item)}
                            title={item.activo === 1 ? 'Desactivar del menú' : 'Activar en el menú'}
                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                              item.activo === 1
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {item.activo === 1 ? 'Desactivar' : 'Activar'}
                          </button>

                          <button
                            onClick={() => {
                              setEditingItem({ ...item });
                              setIsNewItem(false);
                              setFormError(null);
                              setTestResult(null);
                            }}
                            title="Editar opción y endpoint"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeletingId(item.id_opcion)}
                            title="Eliminar de MySQL"
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'db_config' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs bg-slate-50/50 dark:bg-slate-900">
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      Configuración de Conexión MySQL
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Cambia la IP/host, puerto, credenciales o base de datos en caliente
                  </span>
                </div>

                {connectionNotice && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                      connectionNotice.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {connectionNotice.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    )}
                    <span>{connectionNotice.msg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Servidor Host MySQL:
                    </label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={(e) => setDbHost(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                      placeholder="localhost o IP del servidor MySQL"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Puerto (Default: 3306):
                    </label>
                    <input
                      type="number"
                      value={dbPort}
                      onChange={(e) => setDbPort(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                      placeholder="3306"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Usuario MySQL:
                    </label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                      placeholder="root"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña MySQL:
                    </label>
                    <input
                      type="password"
                      value={dbPassword}
                      onChange={(e) => setDbPassword(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                      placeholder="Ingrese contraseña si aplica"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre de la Base de Datos (ej: atc2026 u oesvica_chatbot):
                    </label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                      placeholder="atc2026"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">
                    Al guardar, el servidor intentará conectar y sincronizar las tablas de sesiones y menú.
                  </span>

                  <button
                    onClick={handleSaveDbConnection}
                    disabled={isTestingConnection}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    <span>{isTestingConnection ? 'Verificando...' : 'Guardar y Probar Conexión MySQL'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <div className="font-bold text-sm mb-1">Archivo MySQL: database.sql</div>
                <p className="leading-relaxed">
                  Se ha generado el archivo <span className="font-mono font-bold">/database.sql</span> en la raíz del proyecto.
                  Incluye la creación de la base de datos <span className="font-mono font-bold">atc2026</span>, las tablas <span className="font-mono font-bold">configuracion_chatbot</span> (mensajes dinámicos de bienvenida y ficha), <span className="font-mono font-bold">menu_principal_opciones</span> (menú con endpoints HTTP), <span className="font-mono font-bold">sesiones_usuario</span> (con registro de <span className="font-mono font-bold">seccion_usuario</span>) e <span className="font-mono font-bold">historial_conversaciones</span>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Instrucciones para importar en su servidor MySQL / phpMyAdmin:
                </h4>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto space-y-2">
                  <div># Vía terminal Linux / Windows:</div>
                  <code>mysql -u root -p &lt; database.sql</code>
                  <div className="pt-1 text-slate-400"># O desde phpMyAdmin:</div>
                  <div>1. Abra phpMyAdmin y cree o seleccione su base de datos (ej: atc2026).</div>
                  <div>2. Vaya a la pestaña "Importar" (Import).</div>
                  <div>3. Seleccione el archivo database.sql y haga clic en "Continuar".</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Variables de entorno (.env) para conexión directa:
                </h4>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] space-y-1">
                  <div>MYSQL_HOST=localhost</div>
                  <div>MYSQL_PORT=3306</div>
                  <div>MYSQL_USER=root</div>
                  <div>MYSQL_PASSWORD=tu_clave_aqui</div>
                  <div>MYSQL_DATABASE=atc2026</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <a
                  href="/api/chat/database-sql"
                  download="database.sql"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Descargar database.sql</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Base de datos OESVICA • Control dinámico de bienvenida, menú con endpoints y sección del trabajador
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
