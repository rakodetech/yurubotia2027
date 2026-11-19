import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

/**
 * Service to dispatch OTP verification codes to the OESVICA webhook
 * Endpoint: http://212.56.33.4:5678/webhook/v8/otpapplicationoesvica
 * Method: POST (application/x-www-form-urlencoded)
 * Body: codigo={codigootp}&ficha={auxficha}
 */

export interface OtpSendResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  simulated?: boolean;
}

export async function sendOtpWebhook(
  codigootp: string,
  auxficha: string
): Promise<OtpSendResult> {
  const cleanCodigo = String(codigootp).trim();
  const cleanFicha = String(auxficha).trim();

  // 1. Endpoint backend dedicado (/api/send-otp): despacha desde Node evitando CORS
  for (const endpoint of buildProxyUrls('/api/send-otp')) {
    try {
      const apiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify({
          codigo: cleanCodigo,
          ficha: cleanFicha
        }),
        signal: AbortSignal.timeout(8000)
      });

      const contentType = apiResponse.headers.get('content-type') || '';
      const text = await apiResponse.text();

      if (isHtmlPayload(contentType, text)) {
        continue;
      }

      if (apiResponse.ok || apiResponse.status < 400) {
        let parsedData: any = text;
        try {
          parsedData = JSON.parse(text);
        } catch {
          // ignore
        }
        return {
          success: true,
          status: apiResponse.status,
          data: parsedData
        };
      }
    } catch {
      // Continuar con siguiente ruta
    }
  }

  // 2. Proxies secundarios (/webhook/...) y llamada directa
  const bodyParams = new URLSearchParams();
  bodyParams.append('codigo', cleanCodigo);
  bodyParams.append('ficha', cleanFicha);

  const isHttps = isHttpsOrigin();
  const directUrl = 'http://212.56.33.4:5678/webhook/v8/otpapplicationoesvica';
  const fallbackUrls = [
    ...buildProxyUrls('/webhook/v8/otpapplicationoesvica'),
    ...(isHttps ? [] : [directUrl])
  ];

  for (const url of fallbackUrls) {
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
      // Continuar con siguiente intento
    }
  }

  // 3. En servidores estáticos HTTP (como npx serve dist), enviar vía no-cors simple request
  // para que el webhook n8n reciba el POST sin bloqueo de lectura CORS
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
        status: 200,
        data: { dispatched: true, mode: 'no-cors' }
      };
    } catch {
      // ignore
    }
  }

  return {
    success: false,
    error: 'No se pudo contactar el webhook de mensajería OESVICA'
  };
}
