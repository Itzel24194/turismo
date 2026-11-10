import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeocodingRespaldo, buscarCiudad } from '../src/services/geocoding.js';
import { iconoClima, parseWeather } from '../src/services/weather.js';
import { miles, diaCorto, hace } from '../src/utils/format.js';
import { parseCountry, obtenerPais } from '../src/services/country.js';
import { traducirError } from '../src/utils/errors.js';

const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const conFetch = async (fn, impl) => {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = orig; }
};

test('Respaldo Open-Meteo: normaliza coordenadas y país', () => {
  const r = parseGeocodingRespaldo({ results: [{ name: 'Toluca', latitude: 19.28, longitude: -99.66, country_code: 'MX', country: 'México', admin1: 'Estado de México' }] });
  assert.equal(r.paisCodigo, 'MX');
  assert.equal(r.lat, 19.28);
  assert.match(r.direccion, /Toluca, Estado de México, México/);
  assert.equal(parseGeocodingRespaldo({}), null);
});

test('Nominatim 403 → usa el respaldo en vez de fallar', async () => {
  const llamadas = [];
  const lugar = await conFetch(() => buscarCiudad('Toluca'), async (url, opts) => {
    llamadas.push({ url, ua: opts.headers['User-Agent'] });
    if (url.includes('nominatim')) return resp(403, {});
    return resp(200, { results: [{ name: 'Toluca', latitude: 19.28, longitude: -99.66, country_code: 'MX', country: 'México' }] });
  });
  assert.equal(lugar.fuente, 'Open-Meteo (respaldo)');
  assert.ok(llamadas[0].ua?.includes('TurismoIncidenciasApp'), 'Nominatim debe recibir User-Agent propio');
});

test('Nominatim OK → no toca el respaldo y envía User-Agent', async () => {
  let n = 0;
  const lugar = await conFetch(() => buscarCiudad('Madrid'), async (url) => {
    n++;
    return resp(200, [{ name: 'Madrid', lat: '40.4', lon: '-3.7', display_name: 'Madrid, España', address: { country_code: 'es' } }]);
  });
  assert.equal(n, 1);
  assert.equal(lugar.fuente, 'OpenStreetMap');
  assert.equal(lugar.paisCodigo, 'ES');
});

test('Ciudad inexistente en ambos → error 404 claro', async () => {
  await conFetch(
    () => assert.rejects(() => buscarCiudad('asdfqwer'), /No se encontró la ciudad "asdfqwer"/),
    async (url) => resp(200, url.includes('nominatim') ? [] : {}),
  );
});

test('Simular caída de OSM NO usa el respaldo', async () => {
  let n = 0;
  await conFetch(
    () => assert.rejects(() => buscarCiudad('Toluca', { simulateFailure: true }), /simulado/),
    async () => { n++; return resp(200, []); },
  );
  assert.equal(n, 0);
});

test('Clima: iconos y campos opcionales', () => {
  assert.equal(iconoClima(0, true), '☀️');
  assert.equal(iconoClima(0, false), '🌙');
  assert.equal(iconoClima(95), '⛈️');
  const r = parseWeather({
    current: { temperature_2m: 20, apparent_temperature: 19, relative_humidity_2m: 50, wind_speed_10m: 5, weather_code: 61, is_day: 1 },
    current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
    daily: { time: ['2026-11-09'], temperature_2m_max: [24], temperature_2m_min: [8], weather_code: [1], precipitation_probability_max: [30] },
  });
  assert.equal(r.actual.icono, '🌧️');
  assert.equal(r.pronostico[0].lluvia, 30);
});

test('Formato: miles, día corto y tiempo relativo', () => {
  assert.equal(miles(1234567), '1,234,567');
  assert.equal(miles(undefined), 'N/D');
  assert.equal(diaCorto('2026-11-09'), 'lun');
  const ahora = new Date('2026-11-09T12:00:00Z').getTime();
  assert.equal(hace('2026-11-09T11:55:00Z', ahora), 'hace 5 min');
  assert.equal(hace('2026-11-08T10:00:00Z', ahora), 'ayer');
});

test('Errores de Supabase: mensajes accionables', () => {
  assert.match(traducirError({ message: 'Anonymous sign-ins are disabled', code: 'anonymous_provider_disabled' }).message, /anónimos/);
  assert.match(traducirError({ message: "Could not find the table 'public.incidencias' in the schema cache", code: 'PGRST205' }).message, /setup\.sql/);
  assert.match(traducirError({ message: 'Bucket not found', statusCode: '404' }).message, /bucket/);
  assert.match(traducirError({ message: 'Network request failed' }).message, /Sin conexión/);
  assert.match(traducirError({ message: 'Invalid API key' }).message, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});

test('País: respuesta vacía/inservible se rechaza (no más N/D)', () => {
  assert.equal(parseCountry({}), null);
  assert.equal(parseCountry({ status: 400, message: 'Bad Request' }), null);
  assert.equal(parseCountry([]), null);
});

test('País: si la consulta con fields viene vacía, reintenta sin fields', async () => {
  const urls = [];
  const p = await conFetch(() => obtenerPais('MX'), async (url) => {
    urls.push(url);
    if (url.includes('fields=')) return resp(200, {});
    return resp(200, [{ name: { common: 'Mexico' }, translations: { spa: { common: 'México' } }, capital: ['Ciudad de México'], population: 126000000, languages: { spa: 'Español' }, currencies: { MXN: { name: 'Peso', symbol: '$' } }, flags: { png: 'https://x/mx.png' } }]);
  });
  assert.equal(p.nombre, 'México');
  assert.equal(p.capital, 'Ciudad de México');
  assert.equal(urls.length, 2);
});

test('País: si REST Countries cae del todo, usa el Banco Mundial', async () => {
  const p = await conFetch(() => obtenerPais('MX', { nombre: 'México' }), async (url) => {
    if (url.includes('restcountries')) return resp(500, {});
    if (url.includes('SP.POP.TOTL')) return resp(200, [{}, [{ value: 126014024 }]]);
    return resp(200, [{}, [{ name: 'Mexico', capitalCity: 'Mexico City', region: { value: 'Latin America & Caribbean' } }]]);
  });
  assert.equal(p.capital, 'Mexico City');
  assert.equal(p.poblacion, 126014024);
  assert.equal(p.nombre, 'México');
  assert.match(p.bandera, /flagcdn\.com\/w160\/mx\.png/);
});

test('País: modo prueba (caída simulada) no usa alternativas', async () => {
  let n = 0;
  await conFetch(() => assert.rejects(() => obtenerPais('MX', { simulateFailure: true }), /simulado/), async () => { n++; return resp(200, {}); });
  assert.equal(n, 0);
});
