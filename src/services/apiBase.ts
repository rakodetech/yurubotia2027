/**
 * Utilidades compartidas para resolver rutas de API y Webhooks
 * tanto en desarrollo (npm run dev), producción con Express (npm start),
 * Vite preview (npm run preview) y despliegues estáticos (npx serve dist).
 */

export function getConfiguredApiBase(): string {
  try {
    const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
    if (typeof envBase === 'string' && envBase.trim()) {
      return envBase.trim().replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }
  return '';
}

export function isLocalNon3000(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const port = window.location.port;
  return (host === 'localhost' || host === '127.0.0.1') && port !== '3000';
}

export function isHttpsOrigin(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

export function isHtmlPayload(contentType: string, text: string): boolean {
  const ct = (contentType || '').toLowerCase();
  const t = (text || '').trim().toLowerCase();
  return (
    ct.includes('text/html') ||
    t.startsWith('<!doctype') ||
    t.startsWith('<html') ||
    t.startsWith('<')
  );
}

/**
 * Construye las URLs candidatas para rutas relativas del backend/proxy (/api/* o /webhook/*)
 */
export function buildProxyUrls(relativePath: string): string[] {
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  const urls: string[] = [];

  const configuredBase = getConfiguredApiBase();
  if (configuredBase) {
    urls.push(`${configuredBase}${cleanPath}`);
  }

  urls.push(cleanPath);

  if (isLocalNon3000()) {
    urls.push(`http://localhost:3000${cleanPath}`);
    urls.push(`http://127.0.0.1:3000${cleanPath}`);
  }

  return Array.from(new Set(urls));
}
