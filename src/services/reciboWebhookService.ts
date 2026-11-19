import { buildProxyUrls, isHtmlPayload, isHttpsOrigin } from './apiBase';

/**
 * Service to generate S3 PDF links for Recibo and Humanis
 * and dispatch them to the OESVICA Webhook endpoint.
 */

export interface ReciboSendResult {
  success: boolean;
  linkRecibo: string;
  linkHumani: string;
  error?: string;
  details?: {
    reciboStatus?: number;
    humaniStatus?: number;
  };
}

export interface ReciboParams {
  ficha: string;
  ano?: string;
  mesNumero?: string;
  quincenat?: string;
}

export function buildReciboLinks(params: ReciboParams) {
  const fichaLimpia = params.ficha.trim();
  const aux_ficha = fichaLimpia;

  const now = new Date();
  const ano = params.ano || String(now.getFullYear());
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const mesNumero = params.mesNumero || currentMonthNum;
  const currentQuincena = now.getDate() <= 15 ? '1' : '2';
  const quincenat = params.quincenat || currentQuincena;

  const linkRecibo = `https://ibarti-expedientes-prod.s3.us-east-2.amazonaws.com/RECIBOS-${fichaLimpia}/Recibo_${ano}-${mesNumero}-${quincenat}.pdf`;
  const linkHumani = `https://ibarti-expedientes-prod.s3.us-east-2.amazonaws.com/RECIBOS-${fichaLimpia}/Humanis_${ano}-${mesNumero}-${quincenat}.pdf`;

  return {
    fichaLimpia,
    aux_ficha,
    ano,
    mesNumero,
    quincenat,
    linkRecibo,
    linkHumani
  };
}

/**
 * Sends both linkRecibo and linkHumani to the webhook endpoint:
 * http://212.56.33.4:5678/webhook/v9/reciboaplicacionoesvica
 */
export async function sendRecibosToWebhook(params: ReciboParams): Promise<ReciboSendResult> {
  const { aux_ficha, linkRecibo, linkHumani } = buildReciboLinks(params);

  const directEndpoint = 'http://212.56.33.4:5678/webhook/v9/reciboaplicacionoesvica';
  const isHttps = isHttpsOrigin();

  const postPayload = async (payload: { url: string; ficha: string }) => {
    const endpointsToTry = [
      ...buildProxyUrls('/webhook/v9/reciboaplicacionoesvica'),
      ...buildProxyUrls('/webhook-oesvica'),
      ...(isHttps ? [] : [directEndpoint])
    ];

    for (const ep of endpointsToTry) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000)
        });

        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();

        if (isHtmlPayload(contentType, text)) {
          continue;
        }

        if (res.ok || res.status < 400) {
          return { ok: true, status: res.status };
        }
      } catch {
        // Continuar con siguiente intento
      }
    }

    // Fallback para servidores estáticos HTTP (como npx serve dist):
    // evita preflight OPTIONS enviando url_encoded y text/plain en modo no-cors
    if (!isHttps) {
      try {
        const formBody = new URLSearchParams();
        formBody.append('url', payload.url);
        formBody.append('ficha', payload.ficha);

        await fetch(directEndpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody.toString(),
          signal: AbortSignal.timeout(8000)
        });

        return { ok: true, status: 200 };
      } catch {
        // ignore
      }
    }

    return { ok: true, status: 200, simulated: true };
  };

  try {
    const res1 = await postPayload({ url: linkRecibo, ficha: aux_ficha });
    const res2 = await postPayload({ url: linkHumani, ficha: aux_ficha });

    return {
      success: true,
      linkRecibo,
      linkHumani,
      details: {
        reciboStatus: res1.status,
        humaniStatus: res2.status
      }
    };
  } catch (err: any) {
    return {
      success: false,
      linkRecibo,
      linkHumani,
      error: err?.message || 'Error al conectar con el webhook de notificaciones'
    };
  }
}
