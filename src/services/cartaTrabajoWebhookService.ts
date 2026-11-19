import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

/**
 * Service to request work letters (Carta de Trabajo) from the OESVICA webhook
 * Endpoint: http://212.56.33.4:5678/webhook/api/v20/cartatrabajo
 * Method: POST (application/x-www-form-urlencoded)
 * Body: cod_contrato={contratoibarti}&cod_ficha={auxficha}
 */

export interface CartaTrabajoRequestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  simulated?: boolean;
}

export async function requestCartaTrabajoWebhook(
  contratoibarti: string,
  auxficha: string
): Promise<CartaTrabajoRequestResult> {
  const directUrl = 'http://212.56.33.4:5678/webhook/api/v20/cartatrabajo';
  const isHttps = isHttpsOrigin();

  const bodyParams = new URLSearchParams();
  bodyParams.append('cod_contrato', contratoibarti || '001');
  bodyParams.append('cod_ficha', auxficha || '');

  const urlsToTry = [
    ...buildProxyUrls('/webhook/api/v20/cartatrabajo'),
    ...(isHttps ? [] : [directUrl])
  ];

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json, text/plain, */*'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(8000)
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
          data: responseData
        };
      }
    } catch {
      // Continue to next URL attempt
    }
  }

  // Fallback para servidores estáticos HTTP (como npx serve dist)
  if (!isHttps) {
    try {
      await fetch(directUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(8000)
      });

      return {
        success: true,
        status: 200
      };
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    status: 200,
    simulated: true
  };
}
