-- =============================================================================
-- BASE DE DATOS: atc2026 (o oesvica_chatbot)
-- SISTEMA DE ATENCION AL TRABAJADOR OESVICA - Ionic RRHH
-- Archivo: database.sql
-- Propósito: Registro y control de historial de conversaciones, sesiones de
--            usuarios (con sección laboral), mensajes dinámicos de bienvenida y
--            menú principal configurable con llamadas a endpoints.
-- Compatibilidad: MySQL 5.7, MySQL 8.0, MySQL 8.4+, MariaDB 10+, phpMyAdmin
-- Codificación: UTF-8 Unicode (utf8mb4)
-- =============================================================================

-- 1. CREACIÓN Y SELECCIÓN DE BASE DE DATOS
CREATE DATABASE IF NOT EXISTS `atc2026`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `atc2026`;

-- Desactivar temporalmente revisión de claves foráneas para recreación segura
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `menu_principal_opciones`;
DROP TABLE IF EXISTS `configuracion_chatbot`;
DROP TABLE IF EXISTS `auditoria_solicitudes`;
DROP TABLE IF EXISTS `historial_conversaciones`;
DROP TABLE IF EXISTS `sesiones_usuario`;
DROP TABLE IF EXISTS `trabajadores_oesvica`;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 2. TABLA: configuracion_chatbot (Mensaje de bienvenida y textos desde MySQL)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `configuracion_chatbot` (
  `clave` VARCHAR(64) NOT NULL COMMENT 'Clave de configuración (ej: mensaje_bienvenida, mensaje_solicitud_ficha)',
  `valor` LONGTEXT NOT NULL COMMENT 'Texto o contenido configurable del chatbot',
  `descripcion` VARCHAR(255) NULL COMMENT 'Descripción del propósito del texto',
  `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuración de textos y mensajes de bienvenida del chatbot OESVICA';

-- =============================================================================
-- 3. TABLA: menu_principal_opciones (Menú dinámico con llamadas a endpoints)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `menu_principal_opciones` (
  `id_opcion` VARCHAR(64) NOT NULL COMMENT 'ID único de la opción (ej: opt_recibos, opt_carta, opt_cesta, opt_14100)',
  `label` VARCHAR(150) NOT NULL COMMENT 'Texto mostrado en el botón del menú (ej: 📄 Recibos de pagos)',
  `action` VARCHAR(64) NOT NULL COMMENT 'Identificador de la acción ejecutada en el chatbot',
  `categoria` ENUM('primary', 'secondary', 'neutral') NOT NULL DEFAULT 'primary',
  `icono` VARCHAR(50) NULL DEFAULT 'FileText',
  `endpoint_url` VARCHAR(500) NULL COMMENT 'URL del endpoint que se invoca para este trámite o webhook',
  `endpoint_method` ENUM('GET', 'POST', 'PUT') NOT NULL DEFAULT 'POST',
  `endpoint_body_type` ENUM('url_encoded', 'json', 'none') NOT NULL DEFAULT 'url_encoded',
  `endpoint_body_template` TEXT NULL COMMENT 'Plantilla de parámetros para el body (soporta {ficha}, {cedula}, {nombre})',
  `mensaje_confirmacion` TEXT NULL COMMENT 'Mensaje explicativo o de respuesta que presentará el chatbot',
  `orden` INT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Orden de presentación en el menú',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Visible en el menú, 0 = Inactivo',
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_opcion`),
  INDEX `idx_menu_activo_orden` (`activo`, `orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Opciones dinámicas del menú principal del chatbot con llamadas a endpoints';

-- =============================================================================
-- 4. TABLA: trabajadores_oesvica (Catálogo referencial de trabajadores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `trabajadores_oesvica` (
  `cod_ficha` VARCHAR(30) NOT NULL COMMENT 'Código de carnet/ficha OESVICA (ejemplo: 00????)',
  `cedula` VARCHAR(25) NOT NULL COMMENT 'Cédula de identidad venezolana (ej: V-8668069)',
  `nombres` VARCHAR(100) NOT NULL COMMENT 'Nombres del trabajador',
  `apellidos` VARCHAR(100) NOT NULL COMMENT 'Apellidos del trabajador',
  `cargo` VARCHAR(150) NOT NULL COMMENT 'Cargo desempeñado (ej: Analista de Sistemas)',
  `seccion` VARCHAR(150) NOT NULL DEFAULT 'Seguridad y Vigilancia Operativa' COMMENT 'Sección, departamento o área asignada del usuario',
  `ubicacion` VARCHAR(150) NULL DEFAULT 'Valencia - Oficinas Admon',
  `cliente` VARCHAR(150) NULL DEFAULT 'ORGANIZACION ESTRATEGICA DE VIGILANCIA, OESVICA, C.A.',
  `telefono` VARCHAR(30) NULL COMMENT 'Teléfono de contacto',
  `correo` VARCHAR(120) NULL COMMENT 'Correo electrónico corporativo o personal',
  `fecha_ingreso` DATE NULL COMMENT 'Fecha de ingreso a la empresa',
  `fecha_nacimiento` DATE NULL COMMENT 'Fecha de nacimiento',
  `status_laboral` VARCHAR(50) NOT NULL DEFAULT 'ACTIVO',
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cod_ficha`),
  INDEX `idx_trabajador_cedula` (`cedula`),
  INDEX `idx_trabajador_seccion` (`seccion`),
  INDEX `idx_trabajador_cargo` (`cargo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Directorio maestro de trabajadores OESVICA con su sección y cargo';

-- =============================================================================
-- 5. TABLA: sesiones_usuario (Registro de sesiones de chat y sección del usuario)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `sesiones_usuario` (
  `id_sesion` VARCHAR(64) NOT NULL COMMENT 'Identificador único de la sesión (UUID o hash)',
  `cod_ficha` VARCHAR(30) NULL COMMENT 'Ficha del trabajador autenticado (si ya ingresó carnet)',
  `cedula` VARCHAR(25) NULL COMMENT 'Cédula del usuario en la sesión',
  `nombre_trabajador` VARCHAR(200) NULL COMMENT 'Nombre completo registrado durante la sesión',
  `cargo` VARCHAR(150) NULL COMMENT 'Cargo del usuario al iniciar la sesión',
  `seccion_usuario` VARCHAR(150) NOT NULL DEFAULT 'Seguridad y Vigilancia Operativa' COMMENT 'SECCIÓN O DEPARTAMENTO DEL USUARIO (campo solicitado)',
  `ubicacion` VARCHAR(150) NULL COMMENT 'Ubicación física o base de operaciones',
  `cliente_asignado` VARCHAR(150) NULL COMMENT 'Cliente o puesto asignado',
  `ip_cliente` VARCHAR(45) NULL DEFAULT '127.0.0.1' COMMENT 'Dirección IP de conexión (soporta IPv4 e IPv6)',
  `user_agent` TEXT NULL COMMENT 'Navegador o dispositivo utilizado',
  `estado` ENUM('activa', 'cerrada', 'expirada') NOT NULL DEFAULT 'activa' COMMENT 'Estado actual de la sesión',
  `total_mensajes` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Contador de mensajes intercambiados',
  `fecha_inicio` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Hora y fecha de inicio de la sesión',
  `fecha_cierre` TIMESTAMP NULL DEFAULT NULL COMMENT 'Hora y fecha de término de la conversación',
  `duracion_segundos` INT UNSIGNED NULL DEFAULT 0 COMMENT 'Tiempo total de la sesión en segundos',
  `ultima_actividad` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Último timestamp de interacción',
  PRIMARY KEY (`id_sesion`),
  INDEX `idx_sesion_ficha` (`cod_ficha`),
  INDEX `idx_sesion_seccion` (`seccion_usuario`),
  INDEX `idx_sesion_estado` (`estado`),
  INDEX `idx_sesion_fecha_inicio` (`fecha_inicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de sesiones de usuario del chatbot con su sección y métricas';

-- =============================================================================
-- 6. TABLA: historial_conversaciones (Mensajes enviados y recibidos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `historial_conversaciones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID secuencial autoincremental',
  `id_sesion` VARCHAR(64) NOT NULL COMMENT 'Clave foránea hacia la sesión del usuario',
  `id_mensaje` VARCHAR(64) NULL COMMENT 'ID de mensaje generado por la interfaz cliente',
  `cod_ficha` VARCHAR(30) NULL COMMENT 'Ficha del trabajador asociada al mensaje',
  `seccion_usuario` VARCHAR(150) NULL COMMENT 'Sección laboral del usuario al momento de enviar el mensaje',
  `remitente` ENUM('usuario', 'asistente', 'sistema') NOT NULL COMMENT 'Quién emitió el mensaje',
  `mensaje` LONGTEXT NOT NULL COMMENT 'Texto plano o formateado del mensaje',
  `tipo_accion` VARCHAR(100) NULL COMMENT 'Tipo de acción (show_menu, recibo_pago, carta_trabajo, etc.)',
  `opciones_rapidas` LONGTEXT NULL COMMENT 'Botones de respuesta rápida presentados al usuario en formato JSON',
  `datos_documento` LONGTEXT NULL COMMENT 'Información o payload estructurado del documento en formato JSON',
  `tipo_documento` VARCHAR(60) NULL COMMENT 'recibo_pago, carta_trabajo, cesta_ticket, formato_14100',
  `enlace_documento` VARCHAR(750) NULL COMMENT 'URL o link del documento generado',
  `fecha_envio` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp exacto del mensaje',
  PRIMARY KEY (`id`),
  INDEX `idx_hist_sesion` (`id_sesion`),
  INDEX `idx_hist_ficha` (`cod_ficha`),
  INDEX `idx_hist_seccion` (`seccion_usuario`),
  INDEX `idx_hist_remitente` (`remitente`),
  INDEX `idx_hist_tipo_accion` (`tipo_accion`),
  INDEX `idx_hist_fecha_envio` (`fecha_envio`),
  CONSTRAINT `fk_historial_sesion`
    FOREIGN KEY (`id_sesion`) REFERENCES `sesiones_usuario` (`id_sesion`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial completo de mensajes y respuestas del chatbot OESVICA';

-- =============================================================================
-- 7. TABLA: auditoria_solicitudes (Trámites específicos solicitados)
-- =============================================================================
CREATE TABLE IF NOT EXISTS `auditoria_solicitudes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_sesion` VARCHAR(64) NOT NULL,
  `cod_ficha` VARCHAR(30) NOT NULL,
  `seccion_usuario` VARCHAR(150) NULL,
  `tipo_tramite` VARCHAR(100) NOT NULL,
  `detalle_solicitud` VARCHAR(255) NULL,
  `parametros_json` LONGTEXT NULL,
  `url_resultado` VARCHAR(750) NULL,
  `estado_resultado` ENUM('exitoso', 'fallido', 'rechazado_edad', 'pendiente') NOT NULL DEFAULT 'exitoso',
  `mensaje_respuesta` TEXT NULL,
  `fecha_registro` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_solicitud_sesion` (`id_sesion`),
  INDEX `idx_solicitud_ficha` (`cod_ficha`),
  INDEX `idx_solicitud_tipo` (`tipo_tramite`),
  INDEX `idx_solicitud_fecha` (`fecha_registro`),
  CONSTRAINT `fk_solicitud_sesion`
    FOREIGN KEY (`id_sesion`) REFERENCES `sesiones_usuario` (`id_sesion`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de auditoría de trámites laborales generados desde el chatbot';

-- =============================================================================
-- 8. VISTAS DE CONSULTA Y ANÁLISIS (Compatibles con MySQL 5.7+ y 8.0+)
-- =============================================================================
CREATE OR REPLACE VIEW `vista_conversaciones_completas` AS
SELECT
  h.`id` AS `mensaje_id`,
  h.`id_sesion`,
  s.`cod_ficha`,
  COALESCE(s.`nombre_trabajador`, 'Usuario no identificado') AS `nombre_trabajador`,
  COALESCE(s.`seccion_usuario`, 'Sin sección asignada') AS `seccion_usuario`,
  s.`cargo`,
  h.`remitente`,
  h.`mensaje`,
  h.`tipo_accion`,
  h.`tipo_documento`,
  h.`enlace_documento`,
  h.`fecha_envio`,
  s.`fecha_inicio` AS `inicio_sesion`,
  s.`estado` AS `estado_sesion`
FROM `historial_conversaciones` h
LEFT JOIN `sesiones_usuario` s ON h.`id_sesion` = s.`id_sesion`;

CREATE OR REPLACE VIEW `vista_resumen_por_seccion` AS
SELECT
  COALESCE(s.`seccion_usuario`, 'Sin Sección') AS `seccion`,
  COUNT(DISTINCT s.`id_sesion`) AS `total_sesiones`,
  COUNT(DISTINCT s.`cod_ficha`) AS `trabajadores_unicos`,
  COUNT(h.`id`) AS `total_mensajes_intercambiados`,
  SUM(CASE WHEN h.`tipo_accion` LIKE '%recibo%' THEN 1 ELSE 0 END) AS `consultas_recibos`,
  SUM(CASE WHEN h.`tipo_accion` LIKE '%cesta%' THEN 1 ELSE 0 END) AS `consultas_cesta_tickets`,
  SUM(CASE WHEN h.`tipo_accion` LIKE '%carta%' THEN 1 ELSE 0 END) AS `consultas_cartas_trabajo`,
  SUM(CASE WHEN h.`tipo_accion` LIKE '%14100%' THEN 1 ELSE 0 END) AS `consultas_forma_14100`,
  MIN(s.`fecha_inicio`) AS `primera_sesion`,
  MAX(s.`ultima_actividad`) AS `ultima_interaccion`
FROM `sesiones_usuario` s
LEFT JOIN `historial_conversaciones` h ON s.`id_sesion` = h.`id_sesion`
GROUP BY s.`seccion_usuario`;

-- =============================================================================
-- 9. DATOS SEMILLA DE CONFIGURACIÓN & MENÚ DINÁMICO (SEED DATA)
-- =============================================================================

-- Mensajes de bienvenida y solicitud de ficha leídos de MySQL
REPLACE INTO `configuracion_chatbot` (`clave`, `valor`, `descripcion`) VALUES
  ('mensaje_bienvenida', 'Hola, Mi Nombre es OESVICA y  estoy aqui para asistirte con cualquier consulta o gestion relacionada con tu bienestar laboral .Puedo ayudarte con temas como Recibos de pagos , Carta de trabajo , Cesta Tickets y otros asuntos de atencion social para los trabjadores,Si necesita información o apoyo  !no dudes en preguntarme !', 'Mensaje de saludo inicial que reproduce el bot'),
  ('mensaje_solicitud_ficha', 'Me puede suministrar el codigo de su ficha que aparece en el carnet oesvica , por ejemplo:00???? coloque todos los digitos .', 'Mensaje para solicitar el código de carnet al inicio'),
  ('titulo_menu', 'Menú de opciones para **{nombre}** (Ficha `{ficha}`):', 'Encabezado del menú principal interactivo');

-- Opciones del menú principal leídas de MySQL con llamada a sus respectivos endpoints
REPLACE INTO `menu_principal_opciones`
  (`id_opcion`, `label`, `action`, `categoria`, `icono`, `endpoint_url`, `endpoint_method`, `endpoint_body_type`, `endpoint_body_template`, `mensaje_confirmacion`, `orden`, `activo`)
VALUES
  (
    'opt_recibos',
    '📄 Recibos de pagos',
    'action_recibos',
    'primary',
    'FileText',
    'http://212.56.33.4:5678/webhook/v9/reciboaplicacionoesvica',
    'POST',
    'url_encoded',
    '{"url":"{linkRecibo}","ficha":"{ficha}"}',
    'Consulta de recibos de nómina por año, mes y quincena.',
    1,
    1
  ),
  (
    'opt_carta',
    '📜 Carta de Trabajo',
    'action_carta',
    'primary',
    'FileCheck',
    'http://212.56.33.4:5678/webhook/api/v20/cartatrabajo',
    'POST',
    'url_encoded',
    '{"cod_contrato":"{contrato}","cod_ficha":"{ficha}"}',
    'Emisión de carta de trabajo con o sin sueldo.',
    2,
    1
  ),
  (
    'opt_cesta',
    '🍽️ Cesta Ticket',
    'action_cesta_ticket',
    'primary',
    'Utensils',
    'http://212.56.33.4:5678/webhook/v10/alimentacioncestaticket10',
    'POST',
    'url_encoded',
    '{"url":"{linkCesta}","ficha":"{ficha}"}',
    'Consulta del comprobante de alimentación Cesta Ticket.',
    3,
    1
  ),
  (
    'opt_14100',
    '🏛️ Forma14100',
    'action_14100',
    'primary',
    'Building2',
    'http://212.56.33.4:5678/webhook/api/v21/formato14100',
    'POST',
    'url_encoded',
    '{"cod_ficha":"{ficha}"}',
    'Verificación de edad y solicitud de Forma 14-100 IVSS.',
    4,
    1
  ),
  (
    'opt_atencion_social',
    '🤝 Atención Social',
    'action_dynamic_social',
    'secondary',
    'HeartHandshake',
    'http://212.56.33.4:5678/webhook/v1/atencionsocial',
    'POST',
    'url_encoded',
    '{"ficha":"{ficha}","nombre":"{nombre}","seccion":"{seccion}"}',
    'Se ha registrado su requerimiento de atención social y canalizado con RRHH.',
    5,
    1
  );

-- Trabajadores de prueba base
REPLACE INTO `trabajadores_oesvica`
  (`cod_ficha`, `cedula`, `nombres`, `apellidos`, `cargo`, `seccion`, `ubicacion`, `cliente`, `telefono`, `correo`, `fecha_ingreso`, `fecha_nacimiento`, `status_laboral`)
VALUES
  ('001337', 'V-8668069', 'CIRILO RAMON', 'LINARES URBINA', 'ANALISTA DE SISTEMAS', 'Sistemas y Tecnología', 'OFICINAS DE ADMON VALENCIA', 'ORGANIZACION ESTRATEGICA DE VIGILANCIA, OESVICA, C.A.', '04241043148', 'CIRILORAMONLINARESURBINA@GMAIL.COM', '2016-05-25', '1967-10-20', 'ACTIVO'),
  ('000000', 'V-18234567', 'SUPERVISOR', 'GENERAL', 'SUPERVISOR GENERAL DE SEGURIDAD', 'Supervisión y Operaciones Central', 'Caracas - Centro Empresarial', 'Corporativo OESVICA', '0414-1234567', 'supervisor@oesvica.com', '2018-03-15', '1968-04-12', 'ACTIVO');

-- =============================================================================
-- FIN DE SCRIPT: database.sql
-- =============================================================================
