import { OesvicaApiResponse } from '../types';
import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

export interface FichaVerificationResult {
  exists: boolean;
  worker?: OesvicaApiResponse;
  error?: string;
}

/**
 * Normaliza y extrae el código numérico de ficha ingresado por el usuario
 * (ej: "001337", "ficha 001337", "001337.")
 */
function extractFichaCandidate(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:ficha|codigo|código)?\s*[:#-]?\s*([0-9]{3,8})/i);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Consulta y verifica en tiempo real la ficha del trabajador directamente en el endpoint:
 * http://ibarti.ddns.net/api-ibarti2/ficha/verify/?ficha=<codigo>
 */
export async function verifyFichaApi(fichaCode: string): Promise<FichaVerificationResult> {
  const rawClean = fichaCode.trim();
  if (!rawClean) {
    return { exists: false, error: 'Código de ficha no especificado' };
  }

  const candidate = extractFichaCandidate(rawClean);

  const codesToTry: string[] = [candidate];
  if (/^\d+$/.test(candidate) && candidate.length < 6) {
    const padded = candidate.padStart(6, '0');
    if (!codesToTry.includes(padded)) {
      codesToTry.push(padded);
    }
  }

  let connectionError: string | null = null;
  let receivedExplicitFalse = false;
  const isHttps = isHttpsOrigin();

  for (const code of codesToTry) {
    const urlsToTry = [
      ...buildProxyUrls(`/api/verify-ficha?ficha=${encodeURIComponent(code)}`),
      ...buildProxyUrls(`/api-ibarti2/ficha/verify/?ficha=${encodeURIComponent(code)}`),
      ...(isHttps ? [] : [`http://ibarti.ddns.net/api-ibarti2/ficha/verify/?ficha=${encodeURIComponent(code)}`])
    ];

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*'
          },
          signal: AbortSignal.timeout(8000)
        });

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        const trimmed = text.trim();

        // Ignorar respuestas HTML (por ejemplo fallback SPA index.html en npx serve dist)
        if (isHtmlPayload(contentType, trimmed)) {
          connectionError = 'El servidor actual solo sirve archivos estáticos sin proxy backend';
          continue;
        }

        if (!response.ok) {
          try {
            const errJson = JSON.parse(trimmed);
            connectionError = errJson?.error || `HTTP ${response.status}`;
          } catch {
            connectionError = `HTTP ${response.status}`;
          }
          continue;
        }

        if (
          trimmed === 'false' ||
          trimmed === 'null' ||
          trimmed === '""' ||
          !trimmed ||
          trimmed === '[]'
        ) {
          receivedExplicitFalse = true;
          continue;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          parsed = trimmed;
        }

        if (parsed === false || parsed === null || parsed === 'false') {
          receivedExplicitFalse = true;
          continue;
        }

        const workerData: OesvicaApiResponse | null = Array.isArray(parsed)
          ? parsed[0]
          : typeof parsed === 'object' && parsed !== null
          ? parsed
          : null;

        if (workerData && (workerData.cod_ficha || workerData.ap_nombre || workerData.cedula)) {
          return {
            exists: true,
            worker: {
              cod_ficha: workerData.cod_ficha || code,
              ap_nombre: workerData.ap_nombre || 'TRABAJADOR OESVICA',
              cedula: workerData.cedula || 'N/D',
              cargo: workerData.cargo || 'PERSONAL DE SEGURIDAD',
              telefono: workerData.telefono || 'N/D',
              correo: workerData.correo || 'N/D',
              fec_ingreso: workerData.fec_ingreso || '',
              ubicacion: workerData.ubicacion || 'VALENCIA',
              cliente: workerData.cliente || 'ORGANIZACION ESTRATEGICA DE VIGILANCIA, OESVICA, C.A.',
              region: workerData.region || 'CENTRAL',
              cod_status: workerData.cod_status || 'A',
              status: workerData.status || 'ACTIVO',
              cod_contrato: workerData.cod_contrato || '01',
              contrato: workerData.contrato || 'OPERACIONES',
              fec_nacimiento:
                workerData.fec_nacimiento ||
                (workerData as any).fec_nac ||
                (workerData as any).fecha_nacimiento ||
                '',
              sexo: workerData.sexo || ''
            }
          };
        }
      } catch (err: any) {
        connectionError = err?.message || 'Error de conexión';
      }
    }
  }

  if (!receivedExplicitFalse && connectionError) {
    return {
      exists: false,
      error: `No se pudo conectar con el servidor de fichas OESVICA (${connectionError}). En producción ejecute el servidor con "npm start" o "npm run preview" para habilitar los proxies de API/webhooks.`
    };
  }

  return { exists: false };
}
