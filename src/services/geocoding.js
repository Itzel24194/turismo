// API 1: OpenStreetMap Nominatim (información geográfica).
// Nominatim EXIGE un User-Agent que identifique la app (https://operations.osmfoundation.org/policies/nominatim/);
// sin él responde HTTP 403. Si aun así falla, se usa el geocodificador de Open-Meteo como respaldo.
import { getJson, ApiError } from '../utils/http';

const BASE = 'https://nominatim.openstreetmap.org/search';
const BASE_RESPALDO = 'https://geocoding-api.open-meteo.com/v1/search';
const SERVICE = 'OpenStreetMap (Nominatim)';
const SERVICE_RESPALDO = 'Open-Meteo Geocoding';
const HEADERS = {
  'User-Agent': 'TurismoIncidenciasApp/1.0 (proyecto escolar, Expo/React Native)',
  'Accept-Language': 'es',
};

const osmUrl = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=11/${lat}/${lon}`;

export function parseGeocoding(json) {
  if (!Array.isArray(json) || json.length === 0) return null;
  const p = json[0];
  const a = p.address || {};
  return {
    nombre: p.name || a.city || a.town || a.village || (p.display_name || '').split(',')[0],
    direccion: p.display_name,
    lat: parseFloat(p.lat), // Nominatim devuelve strings
    lon: parseFloat(p.lon),
    estado: a.state || a.region || null,
    paisCodigo: a.country_code ? a.country_code.toUpperCase() : null,
    paisNombre: a.country || null,
    osmUrl: osmUrl(p.lat, p.lon),
    fuente: 'OpenStreetMap',
  };
}

// Respuesta del geocodificador de respaldo: { results: [{ name, latitude, longitude, country_code, country, admin1 }] }
export function parseGeocodingRespaldo(json) {
  const p = json?.results?.[0];
  if (!p) return null;
  const direccion = [p.name, p.admin1, p.country].filter(Boolean).join(', ');
  return {
    nombre: p.name,
    direccion,
    lat: p.latitude,
    lon: p.longitude,
    estado: p.admin1 || null,
    paisCodigo: p.country_code ? p.country_code.toUpperCase() : null,
    paisNombre: p.country || null,
    osmUrl: osmUrl(p.latitude, p.longitude),
    fuente: 'Open-Meteo (respaldo)',
  };
}

async function viaNominatim(q) {
  const url = `${BASE}?q=${q}&format=jsonv2&addressdetails=1&limit=1&accept-language=es`;
  return parseGeocoding(await getJson(url, { service: SERVICE, headers: HEADERS }));
}

async function viaRespaldo(q) {
  const url = `${BASE_RESPALDO}?name=${q}&count=1&language=es&format=json`;
  return parseGeocodingRespaldo(await getJson(url, { service: SERVICE_RESPALDO }));
}

export async function buscarCiudad(texto, { simulateFailure } = {}) {
  // Modo prueba: la caída simulada de OpenStreetMap NO usa el respaldo, para poder demostrar el error.
  if (simulateFailure) {
    throw new ApiError(`${SERVICE} no está disponible (simulado).`, { service: SERVICE, status: 503 });
  }
  const q = encodeURIComponent(texto.trim());
  let lugar = null;
  let errorPrincipal = null;
  try {
    lugar = await viaNominatim(q);
  } catch (e) {
    errorPrincipal = e;
  }
  if (!lugar) {
    try {
      lugar = await viaRespaldo(q);
    } catch (e) {
      // Si los dos fallan se informa el error del servicio principal.
      throw errorPrincipal ?? e;
    }
  }
  if (!lugar) {
    throw new ApiError(`No se encontró la ciudad "${texto.trim()}".`, { service: SERVICE, status: 404 });
  }
  return lugar;
}
