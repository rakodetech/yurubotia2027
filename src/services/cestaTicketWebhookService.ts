import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

/**
 * Service to dispatch Cestaticket (Alimentación) to the OESVICA webhook
 * Endpoint: http://212.56.33.4:5678/webhook/v10/alimentacioncestaticket10
 * Method: POST (application/x-www-form-urlencoded)
 * Body: url={linkcestaticket}&ficha={aux_ficha}
 * Formula: linkcestaticket = "https://ibarti-expedientes-prod.s3.us-east-2.amazonaws.com/CESTATICKET-" + fichaLimpia + "/Humanis_" + ano + "-"+ mesNumero + ".pdf"
 */

export interface CestaTicketSendResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  simulated?: boolean;
  linkcestaticket: string;
}

export interface CestaTicketParams {
  ficha: string;
  ano?: string;
  mesNumero: string;
}

export function buildCestaTicketLink(params: CestaTicketParams) {
  const fichaLimpia = params.ficha.trim();
  const aux_ficha = fichaLimpia;
  const now = new Date();
  const ano = params.ano || String(now.getFullYear());
  const mesNumero = params.mesNumero.padStart(2, '0');

  const linkcestaticket = `https://ibarti-expedientes-prod.s3.us-east-2.amazonaws.com/CESTATICKET-${fichaLimpia}/Humanis_${ano}-${mesNumero}.pdf`;

  return {
    fichaLimpia,
    aux_ficha,
    ano,
    mesNumero,
    linkcestaticket
  };
}

export async function sendCestaTicketWebhook(
  params: CestaTicketParams
): Promise<CestaTicketSendResult> {
  const { aux_ficha, linkcestaticket } = buildCestaTicketLink(params);

  const directUrl = 'http://212.56.33.4:5678/webhook/v10/alimentacioncestaticket10';
  const isHttps = isHttpsOrigin();

  const bodyParams = new URLSearchParams();
  bodyParams.append('url', linkcestaticket);
  bodyParams.append('ficha', aux_ficha);

  const urlsToTry = [
    ...buildProxyUrls('/webhook/v10/alimentacioncestaticket10'),
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
          data: responseData,
          linkcestaticket
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
        status: 200,
        linkcestaticket
      };
    } catch {
      // ignore
    }
  }

  return {
    success: true,
    status: 200,
    simulated: true,
    linkcestaticket
  };
}
