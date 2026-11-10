// API 2: Open-Meteo (clima). No requiere API key.
import { getJson } from '../utils/http';

const BASE = 'https://api.open-meteo.com/v1/forecast';

const WMO = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa',
  56: 'Llovizna helada', 57: 'Llovizna helada intensa',
  61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte', 66: 'Lluvia helada', 67: 'Lluvia helada fuerte',
  71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte', 77: 'Granizo fino',
  80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos fuertes', 85: 'Chubascos de nieve', 86: 'Chubascos de nieve fuertes',
  95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta fuerte con granizo',
};
export const describirClima = (code) => WMO[code] ?? 'Sin descripción';

// Emoji según el código WMO (y si es de día o de noche).
export function iconoClima(code, esDia = true) {
  if (code === 0) return esDia ? '☀️' : '🌙';
  if (code === 1 || code === 2) return esDia ? '🌤️' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

export function parseWeather(json) {
  const c = json.current;
  const d = json.daily;
  const esDia = c.is_day === undefined ? true : c.is_day === 1;
  return {
    actual: {
      temp: c.temperature_2m,
      sensacion: c.apparent_temperature,
      humedad: c.relative_humidity_2m,
      viento: c.wind_speed_10m,
      descripcion: describirClima(c.weather_code),
      icono: iconoClima(c.weather_code, esDia),
    },
    // Se convierten los arreglos paralelos de "daily" en una lista de objetos.
    pronostico: d.time.map((fecha, i) => ({
      fecha,
      max: d.temperature_2m_max[i],
      min: d.temperature_2m_min[i],
      descripcion: describirClima(d.weather_code[i]),
      icono: iconoClima(d.weather_code[i]),
      lluvia: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
    })),
    unidades: { temp: json.current_units.temperature_2m, viento: json.current_units.wind_speed_10m },
  };
}

export async function obtenerClima(lat, lon, { simulateFailure } = {}) {
  const url =
    `${BASE}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&forecast_days=3&timezone=auto`;
  const json = await getJson(url, { service: 'Open-Meteo', simulateFailure });
  return parseWeather(json);
}
