import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';

// Evitar demoras por resolución IPv6 en entornos locales (Windows/Linux)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const proxyConfig = {
  '/api-ibarti2': {
    target: 'http://ibarti.ddns.net',
    changeOrigin: true,
    secure: false,
  },
  '/webhook-oesvica': {
    target: 'http://212.56.33.4:5678',
    changeOrigin: true,
    secure: false,
    rewrite: (p: string) => p.replace(/^\/webhook-oesvica/, '/webhook/v9/reciboaplicacionoesvica'),
  },
  '/webhook': {
    target: 'http://212.56.33.4:5678',
    changeOrigin: true,
    secure: false,
  },
};

function createOesvicaMiddleware() {
  return async (req: any, res: any, next: () => void) => {
    const reqUrl = req.url || '';

    // 1. Endpoint proxy local para /api/verify-ficha (funciona en vite dev y vite preview)
    if (reqUrl.startsWith('/api/verify-ficha')) {
      try {
        const parsed = new URL(reqUrl, 'http://localhost');
        const rawFicha = (parsed.searchParams.get('ficha') || '').trim();
        if (!rawFicha) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Código de ficha requerido' }));
          return;
        }

        const match = rawFicha.match(/(?:ficha|codigo|código)?\s*[:#-]?\s*([0-9]{3,8})/i);
        const cleanFicha =
          match && match[1]
            ? match[1]
            : rawFicha.replace(/^[^0-9]+/, '').replace(/[^0-9]+$/, '').trim() || rawFicha;

        const candidates = [cleanFicha];
        if (/^\d+$/.test(cleanFicha) && cleanFicha.length < 6) {
          candidates.push(cleanFicha.padStart(6, '0'));
        }

        let foundData: any = null;
        let gotValidHttp = false;
        let lastError: string | null = null;

        for (const code of candidates) {
          const targetUrl = `http://ibarti.ddns.net/api-ibarti2/ficha/verify/?ficha=${encodeURIComponent(code)}`;
          try {
            const response = await fetch(targetUrl, {
              method: 'GET',
              headers: { Accept: 'application/json, text/plain, */*' },
              signal: AbortSignal.timeout(10000),
            });
            if (response.ok) {
              gotValidHttp = true;
            }
            const text = (await response.text()).trim();
            if (text && text !== 'false' && text !== 'null' && text !== '""' && text !== '[]') {
              let data: any;
              try {
                data = JSON.parse(text);
              } catch {
                data = text;
              }
              if (data && data !== 'false' && (data.cod_ficha || data.ap_nombre || (Array.isArray(data) && data[0]))) {
                foundData = Array.isArray(data) ? data[0] : data;
                break;
              }
            }
          } catch (err: any) {
            lastError = err?.message || 'Error de conexión con ibarti';
          }
        }

        res.setHeader('Content-Type', 'application/json');
        if (foundData) {
          res.statusCode = 200;
          res.end(JSON.stringify(foundData));
          return;
        }
        if (!gotValidHttp && lastError) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: lastError }));
          return;
        }
        res.statusCode = 200;
        res.end('false');
        return;
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message || 'Error verificando ficha' }));
        return;
      }
    }

    // 2. Endpoint proxy local para /api/send-otp (funciona en vite dev y vite preview)
    if (reqUrl.startsWith('/api/send-otp') && req.method === 'POST') {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const rawBody = Buffer.concat(chunks).toString('utf8');
        let bodyObj: any = {};
        try {
          bodyObj = JSON.parse(rawBody);
        } catch {
          const sp = new URLSearchParams(rawBody);
          bodyObj = { codigo: sp.get('codigo'), ficha: sp.get('ficha') };
        }

        const cleanCodigo = String(bodyObj?.codigo || '').trim();
        const cleanFicha = String(bodyObj?.ficha || '').trim();
        if (!cleanCodigo || !cleanFicha) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Parámetros "codigo" y "ficha" requeridos' }));
          return;
        }

        const formParams = new URLSearchParams();
        formParams.append('codigo', cleanCodigo);
        formParams.append('ficha', cleanFicha);

        const upstream = await fetch('http://212.56.33.4:5678/webhook/v8/otpapplicationoesvica', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json, text/plain, */*',
          },
          body: formParams.toString(),
          signal: AbortSignal.timeout(10000),
        });

        const text = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(text || JSON.stringify({ success: upstream.ok }));
        return;
      } catch (err: any) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message || 'Error enviando OTP' }));
        return;
      }
    }

    next();
  };
}

function oesvicaLocalApiPlugin(): Plugin {
  return {
    name: 'oesvica-local-api-proxy',
    configureServer(server) {
      server.middlewares.use(createOesvicaMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createOesvicaMiddleware());
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), oesvicaLocalApiPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: proxyConfig,
    },
    preview: {
      proxy: proxyConfig,
    },
  };
});
