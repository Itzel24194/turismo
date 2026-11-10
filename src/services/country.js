// API 3: REST Countries (información del país). No requiere API key.
// Si la respuesta viene vacía/incompleta o el servicio falla, se prueba otro formato de consulta y,
// como último recurso, el Banco Mundial (capital, región y población).
import { getJson, ApiError } from '../utils/http';

const BASE = 'https://restcountries.com/v3.1/alpha';
const BM = 'https://api.worldbank.org/v2/country';
const SERVICE = 'REST Countries';
const CAMPOS = 'name,translations,capital,region,subregion,population,currencies,languages,flags,cca2';

const bandera = (codigo) => `https://flagcdn.com/w160/${String(codigo).toLowerCase()}.png`;

export function parseCountry(json, codigo) {
  const c = Array.isArray(json) ? json[0] : json;
  if (!c || typeof c !== 'object') return null;
  const monedas = Object.values(c.currencies || {}).map((m) => (m.symbol ? `${m.name} (${m.symbol})` : m.name));
  const nombre = c.translations?.spa?.common || c.name?.common || null;
  // Respuesta inservible (p. ej. un objeto de error): se considera inválida para no mostrar "N/D" en todo.
  if (!nombre && typeof c.population !== 'number') return null;
  return {
    nombre,
    capital: (c.capital || []).join(', ') || null,
    region: c.subregion || c.region || null,
    poblacion: typeof c.population === 'number' ? c.population : null,
    idiomas: Object.values(c.languages || {}),
    monedas,
    bandera: c.flags?.png || c.flags?.svg || (codigo ? bandera(codigo) : null),
  };
}

// Banco Mundial: [meta, [ { name, region: {value}, capitalCity } ]]
export function parseBancoMundial(jsonPais, jsonPob, codigo, nombreHint) {
  const p = Array.isArray(jsonPais) ? jsonPais[1]?.[0] : null;
  if (!p) return null;
  const pob = Array.isArray(jsonPob) ? jsonPob[1]?.[0]?.value : null;
  return {
    nombre: nombreHint || p.name,
    capital: p.capitalCity || null,
    region: p.region?.value || null,
    poblacion: typeof pob === 'number' ? pob : null,
    idiomas: [],
    monedas: [],
    bandera: bandera(codigo),
  };
}

export async function obtenerPais(codigo, { simulateFailure, nombre } = {}) {
  const cod = encodeURIComponent(codigo);
  const intentos = [
    () => getJson(`${BASE}/${cod}?fields=${CAMPOS}`, { service: SERVICE, simulateFailure }),
    () => getJson(`${BASE}/${cod}`, { service: SERVICE }),
    () => getJson(`${BASE}?codes=${cod}`, { service: SERVICE }),
  ];
  let ultimoError = null;
  for (const [i, intento] of intentos.entries()) {
    try {
      const pais = parseCountry(await intento(), codigo);
      if (pais) return pais;
    } catch (e) {
      ultimoError = e;
      // La caída simulada (modo prueba) no debe "arreglarse" con alternativas.
      if (simulateFailure) throw e;
    }
  }
  // Respaldo: Banco Mundial (sin idiomas ni monedas).
  try {
    const [a, b] = await Promise.all([
      getJson(`${BM}/${cod}?format=json`, { service: 'Banco Mundial' }),
      getJson(`${BM}/${cod}/indicator/SP.POP.TOTL?format=json&mrnev=1`, { service: 'Banco Mundial' }).catch(() => null),
    ]);
    const pais = parseBancoMundial(a, b, codigo, nombre);
    if (pais) return pais;
  } catch (e) {
    ultimoError = ultimoError ?? e;
  }
  throw ultimoError ?? new ApiError('No se pudieron obtener los datos del país.', { service: SERVICE });
}
