// Cliente HTTP común: fuerza HTTPS, aplica timeout, valida el código de estado y reintenta una vez
// ante fallos transitorios (red caída un instante, 502/503/504).
const TIMEOUT_MS = 10000;
const ESPERA_REINTENTO_MS = 400;

export class ApiError extends Error {
  constructor(message, { service, status, reintentable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.service = service;
    this.status = status;
    this.reintentable = reintentable;
  }
}

async function pedir(url, service, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ApiError(`${service} respondió con error HTTP ${res.status}.`, {
        service,
        status: res.status,
        reintentable: [502, 503, 504].includes(res.status),
      });
    }
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') {
      throw new ApiError(`${service} tardó demasiado en responder.`, { service, reintentable: true });
    }
    throw new ApiError(`No se pudo conectar con ${service}.`, { service, reintentable: true });
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson(url, { service, headers = {}, simulateFailure = false, retries = 1 } = {}) {
  // Seguridad: nunca se permiten peticiones sin cifrar.
  if (!url.startsWith('https://')) {
    throw new ApiError('Se bloqueó una petición que no usa HTTPS.', { service });
  }
  // Prueba de indisponibilidad: simula que el servicio no responde.
  if (simulateFailure) {
    throw new ApiError(`${service} no está disponible (simulado).`, { service, status: 503 });
  }
  for (let intento = 0; ; intento++) {
    try {
      return await pedir(url, service, headers);
    } catch (e) {
      if (!e.reintentable || intento >= retries) throw e;
      await new Promise((r) => setTimeout(r, ESPERA_REINTENTO_MS));
    }
  }
}
