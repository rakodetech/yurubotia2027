import express from 'express';
import dotenv from 'dotenv';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

dotenv.config();

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// En el entorno de AI Studio y Cloud Run, la aplicación DEBE escuchar en el puerto 3000 (nginx se encarga del puerto 80/8080)
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Permitir embedding en iframe desde cualquier sitio web externo y habilitar CORS universal
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Servir widget.js con CORS y Content-Type adecuado para cualquier página externa
const serveWidgetJs = (_req: express.Request, res: express.Response) => {
  const publicPath = path.resolve(__dirname, 'public/interface/widget.js');
  const distPath = path.resolve(__dirname, 'dist/widget.js');
  const widgetPath = fs.existsSync(publicPath) ? publicPath : distPath;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(widgetPath);
};

app.get('/widget.js', serveWidgetJs);
app.get('/interface/widget.js', serveWidgetJs);
app.get('/inteface/widget.js', serveWidgetJs);


// ---------------------------------------------------------------------------
// Configuración de MySQL
// ---------------------------------------------------------------------------
const mysqlConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'atc2026',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 4000,
};

let mysqlPool: mysql.Pool | null = null;
let isMysqlConnected = false;
let mysqlLastError: string | null = null;

// Memoria de respaldo en caso de que MySQL no esté disponible en el entorno actual
interface FallbackSession {
  id_sesion: string;
  cod_ficha: string | null;
  cedula: string | null;
  nombre_trabajador: string | null;
  cargo: string | null;
  seccion_usuario: string;
  ubicacion: string | null;
  cliente_asignado: string | null;
  ip_cliente: string;
  user_agent: string | null;
  estado: 'activa' | 'cerrada' | 'expirada';
  total_mensajes: number;
  fecha_inicio: string;
  fecha_cierre: string | null;
  duracion_segundos: number;
  ultima_actividad: string;
}

interface FallbackMessage {
  id: number;
  id_sesion: string;
  id_mensaje: string | null;
  cod_ficha: string | null;
  seccion_usuario: string | null;
  remitente: 'usuario' | 'asistente' | 'sistema';
  mensaje: string;
  tipo_accion: string | null;
  opciones_rapidas: any | null;
  datos_documento: any | null;
  tipo_documento: string | null;
  enlace_documento: string | null;
  fecha_envio: string;
}

const memorySessions: Map<string, FallbackSession> = new Map();
const memoryMessages: FallbackMessage[] = [];
let memoryMsgSeq = 1;

// Configuración y textos dinámicos desde MySQL (con respaldo en memoria)
interface MenuOptionItem {
  id_opcion: string;
  label: string;
  action: string;
  categoria: 'primary' | 'secondary' | 'neutral';
  icono?: string;
  endpoint_url?: string;
  endpoint_method?: 'GET' | 'POST' | 'PUT';
  endpoint_body_type?: 'url_encoded' | 'json' | 'none';
  endpoint_body_template?: string;
  mensaje_confirmacion?: string;
  orden: number;
  activo: number;
}

const memoryConfig: Record<string, string> = {
  mensaje_bienvenida: 'Hola, Mi Nombre es OESVICA y  estoy aqui para asistirte con cualquier consulta o gestion relacionada con tu bienestar laboral .Puedo ayudarte con temas como Recibos de pagos , Carta de trabajo , Cesta Tickets y otros asuntos de atencion social para los trabjadores,Si necesita información o apoyo  !no dudes en preguntarme !',
  mensaje_solicitud_ficha: 'Me puede suministrar el codigo de su ficha que aparece en el carnet oesvica , por ejemplo:00???? coloque todos los digitos .',
  titulo_menu: 'Menú de opciones para **{nombre}** (Ficha `{ficha}`):'
};

const memoryMenu: MenuOptionItem[] = [
  {
    id_opcion: 'opt_recibos',
    label: '📄 Recibos de pagos',
    action: 'action_recibos',
    categoria: 'primary',
    icono: 'FileText',
    endpoint_url: 'http://212.56.33.4:5678/webhook/v9/reciboaplicacionoesvica',
    endpoint_method: 'POST',
    endpoint_body_type: 'url_encoded',
    endpoint_body_template: '{"url":"{linkRecibo}","ficha":"{ficha}"}',
    mensaje_confirmacion: 'Consulta de recibos de nómina por año, mes y quincena.',
    orden: 1,
    activo: 1
  },
  {
    id_opcion: 'opt_carta',
    label: '📜 Carta de Trabajo',
    action: 'action_carta',
    categoria: 'primary',
    icono: 'FileCheck',
    endpoint_url: 'http://212.56.33.4:5678/webhook/api/v20/cartatrabajo',
    endpoint_method: 'POST',
    endpoint_body_type: 'url_encoded',
    endpoint_body_template: '{"cod_contrato":"{contrato}","cod_ficha":"{ficha}"}',
    mensaje_confirmacion: 'Emisión de carta de trabajo con o sin sueldo.',
    orden: 2,
    activo: 1
  },
  {
    id_opcion: 'opt_cesta',
    label: '🍽️ Cesta Ticket',
    action: 'action_cesta_ticket',
    categoria: 'primary',
    icono: 'Utensils',
    endpoint_url: 'http://212.56.33.4:5678/webhook/v10/alimentacioncestaticket10',
    endpoint_method: 'POST',
    endpoint_body_type: 'url_encoded',
    endpoint_body_template: '{"url":"{linkCesta}","ficha":"{ficha}"}',
    mensaje_confirmacion: 'Consulta del comprobante de alimentación Cesta Ticket.',
    orden: 3,
    activo: 1
  },
  {
    id_opcion: 'opt_14100',
    label: '🏛️ Forma14100',
    action: 'action_14100',
    categoria: 'primary',
    icono: 'Building2',
    endpoint_url: 'http://212.56.33.4:5678/webhook/api/v21/formato14100',
    endpoint_method: 'POST',
    endpoint_body_type: 'url_encoded',
    endpoint_body_template: '{"cod_ficha":"{ficha}"}',
    mensaje_confirmacion: 'Verificación de edad y solicitud de Forma 14-100 IVSS.',
    orden: 4,
    activo: 1
  }
];

// Inicialización de conexión a MySQL
async function initMysql() {
  try {
    mysqlPool = mysql.createPool(mysqlConfig);
    const connection = await mysqlPool.getConnection();
    isMysqlConnected = true;
    mysqlLastError = null;
    console.log(`[MySQL] Conexión establecida con éxito en ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);

    // Crear tablas básicas si no existen
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`sesiones_usuario\` (
        \`id_sesion\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`cod_ficha\` VARCHAR(30) NULL,
        \`cedula\` VARCHAR(25) NULL,
        \`nombre_trabajador\` VARCHAR(200) NULL,
        \`cargo\` VARCHAR(150) NULL,
        \`seccion_usuario\` VARCHAR(150) NOT NULL DEFAULT 'Seguridad y Vigilancia Operativa',
        \`ubicacion\` VARCHAR(150) NULL,
        \`cliente_asignado\` VARCHAR(150) NULL,
        \`ip_cliente\` VARCHAR(45) NULL DEFAULT '127.0.0.1',
        \`user_agent\` TEXT NULL,
        \`estado\` ENUM('activa', 'cerrada', 'expirada') NOT NULL DEFAULT 'activa',
        \`total_mensajes\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`fecha_inicio\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`fecha_cierre\` TIMESTAMP NULL DEFAULT NULL,
        \`duracion_segundos\` INT UNSIGNED NULL DEFAULT 0,
        \`ultima_actividad\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_sesion_ficha\` (\`cod_ficha\`),
        INDEX \`idx_sesion_seccion\` (\`seccion_usuario\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`historial_conversaciones\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`id_sesion\` VARCHAR(64) NOT NULL,
        \`id_mensaje\` VARCHAR(64) NULL,
        \`cod_ficha\` VARCHAR(30) NULL,
        \`seccion_usuario\` VARCHAR(150) NULL,
        \`remitente\` ENUM('usuario', 'asistente', 'sistema') NOT NULL,
        \`mensaje\` LONGTEXT NOT NULL,
        \`tipo_accion\` VARCHAR(100) NULL,
        \`opciones_rapidas\` LONGTEXT NULL,
        \`datos_documento\` LONGTEXT NULL,
        \`tipo_documento\` VARCHAR(60) NULL,
        \`enlace_documento\` VARCHAR(750) NULL,
        \`fecha_envio\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_hist_sesion\` (\`id_sesion\`),
        INDEX \`idx_hist_ficha\` (\`cod_ficha\`),
        INDEX \`idx_hist_seccion\` (\`seccion_usuario\`),
        CONSTRAINT \`fk_historial_sesion\`
          FOREIGN KEY (\`id_sesion\`) REFERENCES \`sesiones_usuario\` (\`id_sesion\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Crear tabla configuracion_chatbot
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`configuracion_chatbot\` (
        \`clave\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`valor\` LONGTEXT NOT NULL,
        \`descripcion\` VARCHAR(255) NULL,
        \`fecha_actualizacion\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Sembrar configuraciones si no existen
    for (const [clave, valor] of Object.entries(memoryConfig)) {
      await connection.query(
        `INSERT IGNORE INTO \`configuracion_chatbot\` (\`clave\`, \`valor\`, \`descripcion\`) VALUES (?, ?, ?)`,
        [clave, valor, `Configuración ${clave}`]
      );
    }

    // Crear tabla menu_principal_opciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`menu_principal_opciones\` (
        \`id_opcion\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`label\` VARCHAR(150) NOT NULL,
        \`action\` VARCHAR(64) NOT NULL,
        \`categoria\` ENUM('primary', 'secondary', 'neutral') NOT NULL DEFAULT 'primary',
        \`icono\` VARCHAR(50) NULL DEFAULT 'FileText',
        \`endpoint_url\` VARCHAR(500) NULL,
        \`endpoint_method\` ENUM('GET', 'POST', 'PUT') NOT NULL DEFAULT 'POST',
        \`endpoint_body_type\` ENUM('url_encoded', 'json', 'none') NOT NULL DEFAULT 'url_encoded',
        \`endpoint_body_template\` TEXT NULL,
        \`mensaje_confirmacion\` TEXT NULL,
        \`orden\` INT UNSIGNED NOT NULL DEFAULT 10,
        \`activo\` TINYINT(1) NOT NULL DEFAULT 1,
        \`fecha_creacion\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`fecha_actualizacion\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_menu_activo_orden\` (\`activo\`, \`orden\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Sembrar opciones de menú si la tabla está vacía
    const [existingRows]: any = await connection.query(`SELECT COUNT(*) as count FROM \`menu_principal_opciones\``);
    if (existingRows[0]?.count === 0) {
      for (const item of memoryMenu) {
        await connection.query(
          `INSERT INTO \`menu_principal_opciones\`
            (\`id_opcion\`, \`label\`, \`action\`, \`categoria\`, \`icono\`, \`endpoint_url\`, \`endpoint_method\`, \`endpoint_body_type\`, \`endpoint_body_template\`, \`mensaje_confirmacion\`, \`orden\`, \`activo\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id_opcion, item.label, item.action, item.categoria, item.icono || 'FileText',
            item.endpoint_url || null, item.endpoint_method || 'POST', item.endpoint_body_type || 'url_encoded',
            item.endpoint_body_template || null, item.mensaje_confirmacion || null, item.orden, item.activo
          ]
        );
      }
    }

    connection.release();
  } catch (err: any) {
    isMysqlConnected = false;
    mysqlLastError = err?.message || 'Error de conexión MySQL';
    console.warn(`[MySQL] Aviso: No se pudo conectar a MySQL (${mysqlLastError}). Los datos se mantendrán sincronizados en memoria local y listos para exportar con database.sql.`);
  }
}

initMysql();

// ---------------------------------------------------------------------------
// API ENDPOINTS: Sesiones e Historial de Conversaciones
// ---------------------------------------------------------------------------

// 1. Estado de la base de datos
app.get('/api/chat/db-status', async (_req, res) => {
  let mysqlStats = { sessionCount: 0, messageCount: 0 };
  if (isMysqlConnected && mysqlPool) {
    try {
      const [sessions]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM sesiones_usuario');
      const [messages]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM historial_conversaciones');
      mysqlStats = {
        sessionCount: sessions[0]?.count || 0,
        messageCount: messages[0]?.count || 0
      };
    } catch {
      // ignore
    }
  }

  res.json({
    isMysqlConnected,
    mysqlConfig: {
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      database: mysqlConfig.database,
    },
    mysqlLastError,
    memoryStats: {
      sessionCount: memorySessions.size,
      messageCount: memoryMessages.length
    },
    mysqlStats,
    sqlFile: 'database.sql'
  });
});

// 1A. Actualizar parámetros de conexión MySQL y reintentar conexión
app.post('/api/chat/db-config', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (host) mysqlConfig.host = String(host).trim();
  if (port) mysqlConfig.port = Number(port);
  if (user) mysqlConfig.user = String(user).trim();
  if (password !== undefined) mysqlConfig.password = String(password);
  if (database) mysqlConfig.database = String(database).trim();

  try {
    if (mysqlPool) {
      await mysqlPool.end().catch(() => {});
      mysqlPool = null;
    }
    await initMysql();
    res.json({
      success: isMysqlConnected,
      isMysqlConnected,
      mysqlConfig: {
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        database: mysqlConfig.database
      },
      mysqlLastError
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      isMysqlConnected: false,
      error: err?.message
    });
  }
});

// Reintentar conexión con MySQL
app.post('/api/chat/db-reconnect', async (_req, res) => {
  try {
    if (mysqlPool) {
      await mysqlPool.end().catch(() => {});
      mysqlPool = null;
    }
    await initMysql();
    res.json({
      success: isMysqlConnected,
      isMysqlConnected,
      mysqlConfig: {
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        database: mysqlConfig.database
      },
      mysqlLastError
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 1B. Obtener mensajes de configuración (Mensaje de Bienvenida y Solicitud de Ficha desde MySQL)
app.get('/api/chat/config', async (_req, res) => {
  if (isMysqlConnected && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(
        'SELECT clave, valor FROM configuracion_chatbot'
      );
      const configMap: Record<string, string> = { ...memoryConfig };
      for (const row of rows) {
        configMap[row.clave] = row.valor;
      }
      return res.json({
        welcomeMessage: configMap.mensaje_bienvenida || memoryConfig.mensaje_bienvenida,
        promptFichaMessage: configMap.mensaje_solicitud_ficha || memoryConfig.mensaje_solicitud_ficha,
        menuTitle: configMap.titulo_menu || memoryConfig.titulo_menu,
        isMysql: true
      });
    } catch (err: any) {
      console.warn('[Config Error MySQL]:', err?.message);
    }
  }

  res.json({
    welcomeMessage: memoryConfig.mensaje_bienvenida,
    promptFichaMessage: memoryConfig.mensaje_solicitud_ficha,
    menuTitle: memoryConfig.titulo_menu,
    isMysql: false
  });
});

// Actualizar textos de configuración en MySQL
app.post('/api/chat/config', async (req, res) => {
  const { welcomeMessage, promptFichaMessage, menuTitle } = req.body;

  if (welcomeMessage) memoryConfig.mensaje_bienvenida = welcomeMessage;
  if (promptFichaMessage) memoryConfig.mensaje_solicitud_ficha = promptFichaMessage;
  if (menuTitle) memoryConfig.titulo_menu = menuTitle;

  if (isMysqlConnected && mysqlPool) {
    try {
      if (welcomeMessage) {
        await mysqlPool.query(
          'INSERT INTO configuracion_chatbot (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
          ['mensaje_bienvenida', welcomeMessage, welcomeMessage]
        );
      }
      if (promptFichaMessage) {
        await mysqlPool.query(
          'INSERT INTO configuracion_chatbot (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
          ['mensaje_solicitud_ficha', promptFichaMessage, promptFichaMessage]
        );
      }
      if (menuTitle) {
        await mysqlPool.query(
          'INSERT INTO configuracion_chatbot (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
          ['titulo_menu', menuTitle, menuTitle]
        );
      }
    } catch (err: any) {
      console.error('[Update Config Error]:', err?.message);
      return res.status(500).json({ error: err?.message });
    }
  }

  res.json({ success: true, memoryConfig });
});

// 1C. Obtener opciones activas del menú principal desde MySQL
app.get('/api/chat/menu', async (_req, res) => {
  if (isMysqlConnected && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(
        'SELECT * FROM menu_principal_opciones WHERE activo = 1 ORDER BY orden ASC'
      );
      return res.json({ menu: rows, isMysql: true });
    } catch (err: any) {
      console.warn('[Menu Error MySQL]:', err?.message);
    }
  }

  const active = memoryMenu.filter((m) => m.activo === 1).sort((a, b) => a.orden - b.orden);
  res.json({ menu: active, isMysql: false });
});

// Obtener todas las opciones (activas e inactivas) para el panel de administración
app.get('/api/chat/menu/all', async (_req, res) => {
  if (isMysqlConnected && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(
        'SELECT * FROM menu_principal_opciones ORDER BY orden ASC'
      );
      return res.json({ menu: rows, isMysql: true });
    } catch (err: any) {
      console.warn('[Menu All Error MySQL]:', err?.message);
    }
  }

  res.json({ menu: memoryMenu, isMysql: false });
});

// Crear o actualizar opción de menú con su respectivo endpoint
app.post('/api/chat/menu', async (req, res) => {
  const {
    id_opcion,
    label,
    action,
    categoria,
    icono,
    endpoint_url,
    endpoint_method,
    endpoint_body_type,
    endpoint_body_template,
    mensaje_confirmacion,
    orden,
    activo
  } = req.body;

  if (!label || !action) {
    return res.status(400).json({ error: 'label y action son obligatorios' });
  }

  const resolvedId = id_opcion || `opt_${Date.now()}`;
  const item: MenuOptionItem = {
    id_opcion: resolvedId,
    label,
    action,
    categoria: categoria || 'primary',
    icono: icono || 'FileText',
    endpoint_url: endpoint_url || null,
    endpoint_method: endpoint_method || 'POST',
    endpoint_body_type: endpoint_body_type || 'url_encoded',
    endpoint_body_template: endpoint_body_template || null,
    mensaje_confirmacion: mensaje_confirmacion || null,
    orden: Number(orden) || 10,
    activo: activo !== undefined ? (activo ? 1 : 0) : 1
  };

  // Actualizar en memoria
  const idx = memoryMenu.findIndex((m) => m.id_opcion === resolvedId);
  if (idx >= 0) {
    memoryMenu[idx] = item;
  } else {
    memoryMenu.push(item);
  }

  // Actualizar en MySQL
  if (isMysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO menu_principal_opciones
          (id_opcion, label, action, categoria, icono, endpoint_url, endpoint_method, endpoint_body_type, endpoint_body_template, mensaje_confirmacion, orden, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          label = VALUES(label),
          action = VALUES(action),
          categoria = VALUES(categoria),
          icono = VALUES(icono),
          endpoint_url = VALUES(endpoint_url),
          endpoint_method = VALUES(endpoint_method),
          endpoint_body_type = VALUES(endpoint_body_type),
          endpoint_body_template = VALUES(endpoint_body_template),
          mensaje_confirmacion = VALUES(mensaje_confirmacion),
          orden = VALUES(orden),
          activo = VALUES(activo)`,
        [
          item.id_opcion, item.label, item.action, item.categoria, item.icono,
          item.endpoint_url, item.endpoint_method, item.endpoint_body_type,
          item.endpoint_body_template, item.mensaje_confirmacion, item.orden, item.activo
        ]
      );
    } catch (err: any) {
      console.error('[MySQL Menu Save Error]:', err?.message);
      return res.status(500).json({ error: err?.message });
    }
  }

  res.json({ success: true, item });
});

// Eliminar opción de menú
app.delete('/api/chat/menu/:id', async (req, res) => {
  const { id } = req.params;
  const idx = memoryMenu.findIndex((m) => m.id_opcion === id);
  if (idx >= 0) {
    memoryMenu.splice(idx, 1);
  }

  if (isMysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM menu_principal_opciones WHERE id_opcion = ?', [id]);
    } catch (err: any) {
      console.error('[MySQL Menu Delete Error]:', err?.message);
    }
  }

  res.json({ success: true, id });
});

// Ejecución dinámica de endpoint configurado en cualquier opción de menú
app.post('/api/chat/execute-endpoint', async (req, res) => {
  const { endpointUrl, method = 'POST', bodyType = 'url_encoded', payload = {} } = req.body;

  if (!endpointUrl) {
    return res.status(400).json({ error: 'endpointUrl es requerido' });
  }

  try {
    let body: any;
    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*'
    };

    if (method.toUpperCase() !== 'GET') {
      if (bodyType === 'json') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(payload);
      } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(payload)) {
          params.append(k, String(v));
        }
        body = params.toString();
      }
    }

    console.log(`[Dynamic Endpoint] Invocando ${method} ${endpointUrl}...`);
    const resp = await fetch(endpointUrl, {
      method: method.toUpperCase(),
      headers,
      body,
      signal: AbortSignal.timeout(12000)
    });

    const responseText = await resp.text();
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = responseText;
    }

    console.log(`[Dynamic Endpoint] Respuesta (${resp.status}):`, responseText.substring(0, 150));
    res.json({
      success: resp.ok || resp.status < 400,
      status: resp.status,
      data: parsed
    });
  } catch (err: any) {
    console.error('[Dynamic Endpoint Error]:', err?.message);
    res.status(500).json({ error: err?.message || 'Error al ejecutar endpoint dinámico' });
  }
});

// 2. Iniciar o actualizar sesión con la sección del usuario
app.post('/api/chat/session/start', async (req, res) => {
  const {
    sessionId,
    codFicha,
    cedula,
    nombreTrabajador,
    cargo,
    seccionUsuario,
    ubicacion,
    clienteAsignado,
    userAgent
  } = req.body;

  const resolvedSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const resolvedSeccion = seccionUsuario || 'Seguridad y Vigilancia Operativa';
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const agent = userAgent || req.headers['user-agent'] || null;

  // Actualizar memoria
  const existing = memorySessions.get(resolvedSessionId);
  const sessionRecord: FallbackSession = {
    id_sesion: resolvedSessionId,
    cod_ficha: codFicha || existing?.cod_ficha || null,
    cedula: cedula || existing?.cedula || null,
    nombre_trabajador: nombreTrabajador || existing?.nombre_trabajador || null,
    cargo: cargo || existing?.cargo || null,
    seccion_usuario: resolvedSeccion,
    ubicacion: ubicacion || existing?.ubicacion || null,
    cliente_asignado: clienteAsignado || existing?.cliente_asignado || null,
    ip_cliente: ip,
    user_agent: agent,
    estado: 'activa',
    total_mensajes: existing?.total_mensajes || 0,
    fecha_inicio: existing?.fecha_inicio || new Date().toISOString(),
    fecha_cierre: null,
    duracion_segundos: 0,
    ultima_actividad: new Date().toISOString()
  };
  memorySessions.set(resolvedSessionId, sessionRecord);

  // Guardar en MySQL si está conectado
  if (isMysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO sesiones_usuario (
          id_sesion, cod_ficha, cedula, nombre_trabajador, cargo,
          seccion_usuario, ubicacion, cliente_asignado, ip_cliente,
          user_agent, estado, fecha_inicio, ultima_actividad
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          cod_ficha = COALESCE(VALUES(cod_ficha), cod_ficha),
          cedula = COALESCE(VALUES(cedula), cedula),
          nombre_trabajador = COALESCE(VALUES(nombre_trabajador), nombre_trabajador),
          cargo = COALESCE(VALUES(cargo), cargo),
          seccion_usuario = COALESCE(VALUES(seccion_usuario), seccion_usuario),
          ubicacion = COALESCE(VALUES(ubicacion), ubicacion),
          cliente_asignado = COALESCE(VALUES(cliente_asignado), cliente_asignado),
          ultima_actividad = NOW()`,
        [
          resolvedSessionId,
          codFicha || null,
          cedula || null,
          nombreTrabajador || null,
          cargo || null,
          resolvedSeccion,
          ubicacion || null,
          clienteAsignado || null,
          ip,
          agent
        ]
      );
    } catch (e: any) {
      console.error('[MySQL Error] Error registrando sesión:', e?.message);
    }
  }

  res.json({
    success: true,
    sessionId: resolvedSessionId,
    seccionUsuario: resolvedSeccion,
    isMysqlConnected
  });
});

// 3. Cerrar sesión
app.post('/api/chat/session/end', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId requerido' });
  }

  const existing = memorySessions.get(sessionId);
  if (existing) {
    existing.estado = 'cerrada';
    existing.fecha_cierre = new Date().toISOString();
    const start = new Date(existing.fecha_inicio).getTime();
    existing.duracion_segundos = Math.max(0, Math.round((Date.now() - start) / 1000));
  }

  if (isMysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(
        `UPDATE sesiones_usuario
         SET estado = 'cerrada',
             fecha_cierre = NOW(),
             duracion_segundos = TIMESTAMPDIFF(SECOND, fecha_inicio, NOW()),
             ultima_actividad = NOW()
         WHERE id_sesion = ?`,
        [sessionId]
      );
    } catch (e: any) {
      console.error('[MySQL Error] Error cerrando sesión:', e?.message);
    }
  }

  res.json({ success: true, sessionId });
});

// 4. Guardar mensaje en el historial
app.post('/api/chat/message', async (req, res) => {
  const {
    sessionId,
    idMensaje,
    codFicha,
    seccionUsuario,
    remitente, // 'usuario' | 'asistente' | 'sistema'
    mensaje,
    tipoAccion,
    opcionesRapidas,
    datosDocumento,
    tipoDocumento,
    enlaceDocumento
  } = req.body;

  if (!sessionId || !mensaje) {
    return res.status(400).json({ error: 'sessionId y mensaje son requeridos' });
  }

  const resolvedRemitente = remitente === 'bot' || remitente === 'asistente' ? 'asistente' : 'usuario';
  const resolvedSeccion = seccionUsuario || memorySessions.get(sessionId)?.seccion_usuario || 'Seguridad y Vigilancia Operativa';
  const resolvedFicha = codFicha || memorySessions.get(sessionId)?.cod_ficha || null;

  // Registrar en memoria de respaldo
  const msgRecord: FallbackMessage = {
    id: memoryMsgSeq++,
    id_sesion: sessionId,
    id_mensaje: idMensaje || `msg-${Date.now()}`,
    cod_ficha: resolvedFicha,
    seccion_usuario: resolvedSeccion,
    remitente: resolvedRemitente,
    mensaje,
    tipo_accion: tipoAccion || null,
    opciones_rapidas: opcionesRapidas || null,
    datos_documento: datosDocumento || null,
    tipo_documento: tipoDocumento || null,
    enlace_documento: enlaceDocumento || null,
    fecha_envio: new Date().toISOString()
  };
  memoryMessages.push(msgRecord);

  const sessionObj = memorySessions.get(sessionId);
  if (sessionObj) {
    sessionObj.total_mensajes += 1;
    sessionObj.ultima_actividad = new Date().toISOString();
    if (resolvedFicha && !sessionObj.cod_ficha) sessionObj.cod_ficha = resolvedFicha;
    if (resolvedSeccion && sessionObj.seccion_usuario === 'Seguridad y Vigilancia Operativa') {
      sessionObj.seccion_usuario = resolvedSeccion;
    }
  }

  // Guardar en MySQL
  let dbInsertedId: number | null = null;
  if (isMysqlConnected && mysqlPool) {
    try {
      // Asegurarse de que la sesión exista
      await mysqlPool.query(
        `INSERT IGNORE INTO sesiones_usuario (id_sesion, cod_ficha, seccion_usuario, fecha_inicio, ultima_actividad)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [sessionId, resolvedFicha, resolvedSeccion]
      );

      const [result]: any = await mysqlPool.query(
        `INSERT INTO historial_conversaciones (
          id_sesion, id_mensaje, cod_ficha, seccion_usuario,
          remitente, mensaje, tipo_accion, opciones_rapidas,
          datos_documento, tipo_documento, enlace_documento, fecha_envio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          sessionId,
          idMensaje || null,
          resolvedFicha,
          resolvedSeccion,
          resolvedRemitente,
          mensaje,
          tipoAccion || null,
          opcionesRapidas ? JSON.stringify(opcionesRapidas) : null,
          datosDocumento ? JSON.stringify(datosDocumento) : null,
          tipoDocumento || null,
          enlaceDocumento || null
        ]
      );

      dbInsertedId = result?.insertId || null;

      // Actualizar contador en sesión
      await mysqlPool.query(
        `UPDATE sesiones_usuario
         SET total_mensajes = total_mensajes + 1,
             ultima_actividad = NOW(),
             cod_ficha = COALESCE(?, cod_ficha),
             seccion_usuario = COALESCE(?, seccion_usuario)
         WHERE id_sesion = ?`,
        [resolvedFicha, resolvedSeccion, sessionId]
      );
    } catch (e: any) {
      console.error('[MySQL Error] Error insertando mensaje:', e?.message);
    }
  }

  res.json({
    success: true,
    id: dbInsertedId || msgRecord.id,
    isMysqlConnected
  });
});

// 5. Obtener lista de sesiones
app.get('/api/chat/sessions', async (_req, res) => {
  if (isMysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query(
        `SELECT id_sesion, cod_ficha, cedula, nombre_trabajador, cargo,
                seccion_usuario, ubicacion, cliente_asignado, estado,
                total_mensajes, duracion_segundos, fecha_inicio, fecha_cierre, ultima_actividad
         FROM sesiones_usuario
         ORDER BY fecha_inicio DESC
         LIMIT 100`
      );
      return res.json({ sessions: rows, isMysql: true });
    } catch (e: any) {
      console.error('[MySQL Error] Listando sesiones:', e?.message);
    }
  }

  // Fallback
  const list = Array.from(memorySessions.values()).reverse().slice(0, 100);
  res.json({ sessions: list, isMysql: false });
});

// 6. Obtener historial de una sesión específica
app.get('/api/chat/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  if (isMysqlConnected && mysqlPool) {
    try {
      const [messages] = await mysqlPool.query(
        `SELECT id, id_sesion, id_mensaje, cod_ficha, seccion_usuario,
                remitente, mensaje, tipo_accion, opciones_rapidas,
                datos_documento, tipo_documento, enlace_documento, fecha_envio
         FROM historial_conversaciones
         WHERE id_sesion = ?
         ORDER BY fecha_envio ASC`,
        [sessionId]
      );
      return res.json({ messages, isMysql: true });
    } catch (e: any) {
      console.error('[MySQL Error] Obteniendo historial:', e?.message);
    }
  }

  // Fallback
  const messages = memoryMessages.filter((m) => m.id_sesion === sessionId);
  res.json({ messages, isMysql: false });
});

// 7. Descargar o consultar script database.sql
app.get('/api/chat/database-sql', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'database.sql'));
});

// ---------------------------------------------------------------------------
// Proxies para Webhooks y API Ibarti (para soporte idéntico a Vite dev)
// ---------------------------------------------------------------------------
// Endpoint dedicado para verificar ficha en el endpoint de OESVICA
app.get('/api/verify-ficha', async (req, res) => {
  try {
    const rawFicha = (req.query.ficha as string || '').trim();
    if (!rawFicha) {
      return res.status(400).json({ error: 'Código de ficha requerido' });
    }

    // Extraer número o limpiar caracteres no numéricos al inicio y final
    const match = rawFicha.match(/(?:ficha|codigo|código)?\s*[:#-]?\s*([0-9]{3,8})/i);
    const cleanFicha = match && match[1] ? match[1] : rawFicha.replace(/^[^0-9]+/, '').replace(/[^0-9]+$/, '').trim() || rawFicha;

    const candidates = [cleanFicha];
    if (/^\d+$/.test(cleanFicha) && cleanFicha.length < 6) {
      candidates.push(cleanFicha.padStart(6, '0'));
    }

    let foundData: any = null;
    let gotValidHttpResponse = false;
    let lastNetworkError: string | null = null;

    for (const code of candidates) {
      const targetUrl = `http://ibarti.ddns.net/api-ibarti2/ficha/verify/?ficha=${encodeURIComponent(code)}`;
      try {
        console.log(`[Verify Ficha] Consultando ibarti para ficha: "${code}"...`);
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          gotValidHttpResponse = true;
        } else {
          lastNetworkError = `HTTP ${response.status} desde ibarti`;
        }

        const text = await response.text();
        const trimmed = text.trim();

        if (trimmed && trimmed !== 'false' && trimmed !== 'null' && trimmed !== '""' && trimmed !== '[]') {
          let parsed: any;
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            parsed = trimmed;
          }

          if (parsed && parsed !== 'false' && (parsed.cod_ficha || parsed.ap_nombre || (Array.isArray(parsed) && parsed[0]))) {
            foundData = Array.isArray(parsed) ? parsed[0] : parsed;
            console.log(`[Verify Ficha] Ficha "${code}" verificada con éxito:`, foundData.ap_nombre || foundData.cod_ficha);
            break;
          }
        }
      } catch (subErr: any) {
        lastNetworkError = subErr?.message || 'Error de conexión con ibarti';
        console.warn(`[Verify Ficha Retry] Error al verificar "${code}":`, lastNetworkError);
      }
    }

    if (foundData) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(foundData);
    }

    if (!gotValidHttpResponse && lastNetworkError) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(502).json({ error: lastNetworkError });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send('false');
  } catch (err: any) {
    console.error('[Verify Ficha Error]:', err?.message);
    res.status(500).json({ error: err?.message || 'Error al conectar con endpoint de ficha' });
  }
});

app.use('/api-ibarti2', async (req, res) => {
  try {
    const targetUrl = `http://ibarti.ddns.net/api-ibarti2${req.url}`;
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error proxy ibarti' });
  }
});

// Helper para serializar el cuerpo según el Content-Type real (incluyendo multipart/form-data)
async function serializeRequestBody(req: express.Request): Promise<{ body: any; contentType?: string }> {
  if (['GET', 'HEAD'].includes(req.method)) {
    return { body: undefined };
  }
  const rawContentType = req.headers['content-type'] || '';
  const contentType = rawContentType.toLowerCase();

  if (contentType.includes('multipart/form-data')) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return {
      body: Buffer.concat(chunks),
      contentType: rawContentType
    };
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    if (typeof req.body === 'string') {
      return { body: req.body, contentType: 'application/x-www-form-urlencoded' };
    }
    const params = new URLSearchParams();
    if (req.body && typeof req.body === 'object') {
      for (const [k, v] of Object.entries(req.body)) {
        params.append(k, String(v));
      }
    }
    return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
  }

  if (contentType.includes('application/json')) {
    return {
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      contentType: 'application/json'
    };
  }

  if (typeof req.body === 'string') {
    return { body: req.body, contentType: rawContentType || undefined };
  }

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.body)) {
      params.append(k, String(v));
    }
    return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
  }

  return { body: undefined, contentType: rawContentType || undefined };
}

// Endpoint dedicado para despacho directo de código OTP al webhook de mensajería OESVICA
app.post('/api/send-otp', async (req, res) => {
  try {
    const { codigo, ficha } = req.body;
    if (!codigo || !ficha) {
      return res.status(400).json({ error: 'Parámetros "codigo" y "ficha" requeridos' });
    }

    const cleanCodigo = String(codigo).trim();
    const cleanFicha = String(ficha).trim();
    const targetUrl = 'http://212.56.33.4:5678/webhook/v8/otpapplicationoesvica';

    const formParams = new URLSearchParams();
    formParams.append('codigo', cleanCodigo);
    formParams.append('ficha', cleanFicha);

    console.log(`[OTP Webhook] Despachando OTP "${cleanCodigo}" para ficha "${cleanFicha}" a ${targetUrl}...`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*'
      },
      body: formParams.toString(),
      signal: AbortSignal.timeout(10000)
    });

    const responseText = await response.text();
    console.log(`[OTP Webhook] Respuesta (${response.status}):`, responseText);
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(responseText);
  } catch (err: any) {
    console.error('[OTP Webhook Error]:', err?.message);
    res.status(500).json({ error: err?.message || 'Error al despachar código OTP' });
  }
});

app.use('/webhook-oesvica', async (req, res) => {
  try {
    const targetUrl = `http://212.56.33.4:5678/webhook/v9/reciboaplicacionoesvica${req.url.replace(/^\//, '')}`;
    const { body, contentType } = await serializeRequestBody(req);

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*'
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(12000)
    };

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err: any) {
    console.error('[Webhook OESVICA Error]:', err?.message);
    res.status(500).json({ error: err?.message || 'Error proxy webhook oesvica' });
  }
});

app.use('/webhook', async (req, res) => {
  try {
    const targetUrl = `http://212.56.33.4:5678/webhook${req.url}`;
    const { body, contentType } = await serializeRequestBody(req);

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*'
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(12000)
    };

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err: any) {
    console.error('[Webhook Error]:', err?.message);
    res.status(500).json({ error: err?.message || 'Error proxy webhook' });
  }
});

// ---------------------------------------------------------------------------
// Configuración de Frontend (Vite middleware en Dev, estático en Prod)
// ---------------------------------------------------------------------------
async function startServer() {
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexPath = path.join(distDir, 'index.html');
  const isProdMode =
    (process.env.NODE_ENV === 'production' || process.argv.includes('--prod')) &&
    fs.existsSync(distIndexPath);

  if (!isProdMode) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/webhook') ||
        req.path.startsWith('/api-ibarti2')
      ) {
        return res.status(404).json({ error: 'Endpoint no encontrado' });
      }
      res.sendFile(distIndexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor OESVICA] Ejecutando en puerto ${PORT} (${isProdMode ? 'Producción - sirviendo /dist' : 'Desarrollo - Vite middleware'})`);
  });
}

startServer();
