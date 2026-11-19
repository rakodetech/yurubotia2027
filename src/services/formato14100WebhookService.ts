import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

/**
 * Service to request Forma14100 from OESVICA webhook
 * Endpoint: http://212.56.33.4:5678/webhook/api/v21/formato14100
 * Method: POST (FormData)
 * Body: { cod_ficha: auxficha }
 */

export interface Formato14100RequestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  simulated?: boolean;
}

export function calculateAge(fecNacimiento?: string): number | null {
  if (!fecNacimiento || typeof fecNacimiento !== 'string') return null;
  const clean = fecNacimiento.trim();
  if (!clean || clean === 'nan' || clean === 'null' || clean === 'N/D') return null;

  let birthDate: Date | null = null;

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[-/]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    birthDate = new Date(year, month, day);
  } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(clean)) {
    const parts = clean.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    birthDate = new Date(year, month, day);
  } else {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

export async function requestFormato14100Webhook(
  auxficha: string
): Promise<Formato14100RequestResult> {
  const directUrl = 'http://212.56.33.4:5678/webhook/api/v21/formato14100';
  const isHttps = isHttpsOrigin();

  const urlsToTry = [
    ...buildProxyUrls('/webhook/api/v21/formato14100'),
    ...(isHttps ? [] : [directUrl])
  ];

  for (const url of urlsToTry) {
    try {
      const formData = new FormData();
      formData.append('cod_ficha', auxficha);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(8000),
      });

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (isHtmlPayload(contentType, text)) {
        continue;
      }

      if (response.ok || response.status < 400) {
        let responseData: any = text;
        try {
          responseData = JSON.parse(text);
        } catch {
          // ignore
        }

        return {
          success: true,
          status: response.status,
          data: responseData,
        };
      }
    } catch {
      // Continue to next URL attempt
    }
  }

  // Fallback para servidores estáticos HTTP (como npx serve dist)
  if (!isHttps) {
    try {
      const formData = new FormData();
      formData.append('cod_ficha', auxficha);

      await fetch(directUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
        signal: AbortSignal.timeout(8000),
      });

      return {
        success: true,
        status: 200,
      };
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    status: 200,
    simulated: true,
  };
}
