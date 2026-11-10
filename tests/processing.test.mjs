import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeocoding } from '../src/services/geocoding.js';
import { parseWeather } from '../src/services/weather.js';
import { parseCountry } from '../src/services/country.js';
import { getJson } from '../src/utils/http.js';

test('Nominatim: convierte strings a números y obtiene código de país', () => {
  const r = parseGeocoding([{ name: 'Toluca', lat: '19.29', lon: '-99.65', display_name: 'Toluca, Estado de México, México', address: { country_code: 'mx', state: 'Estado de México' } }]);
  assert.equal(r.lat, 19.29);
  assert.equal(r.paisCodigo, 'MX');
});
test('Nominatim: lista vacía → null', () => assert.equal(parseGeocoding([]), null));

test('Open-Meteo: arreglos paralelos → lista de días', () => {
  const r = parseWeather({
    current: { temperature_2m: 20, apparent_temperature: 19, relative_humidity_2m: 50, wind_speed_10m: 5, weather_code: 0 },
    current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
    daily: { time: ['2026-11-05', '2026-11-06'], temperature_2m_max: [24, 25], temperature_2m_min: [8, 9], weather_code: [1, 61] },
  });
  assert.equal(r.pronostico.length, 2);
  assert.equal(r.pronostico[1].descripcion, 'Lluvia ligera');
});

test('REST Countries: extrae moneda, idiomas y capital', () => {
  const r = parseCountry([{ name: { common: 'Mexico' }, translations: { spa: { common: 'México' } }, capital: ['Ciudad de México'], population: 1, currencies: { MXN: { name: 'Peso mexicano', symbol: '$' } }, languages: { spa: 'Español' }, flags: { png: 'https://x/y.png' } }]);
  assert.equal(r.nombre, 'México');
  assert.deepEqual(r.idiomas, ['Español']);
});

test('HTTP: bloquea URLs sin HTTPS', async () => {
  await assert.rejects(() => getJson('http://ejemplo.com', { service: 'X' }), /HTTPS/);
});
test('HTTP: simulación de caída lanza error 503', async () => {
  await assert.rejects(() => getJson('https://ejemplo.com', { service: 'X', simulateFailure: true }), /no está disponible/);
});
