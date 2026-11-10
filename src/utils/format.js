// Utilidades de formato puras (sin dependencias de React Native, probadas con npm test).
export const miles = (n) =>
  typeof n === 'number' && Number.isFinite(n) ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'N/D';

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// "2026-11-09" → "lun". Se usa mediodía local para evitar saltos de día por zona horaria.
export function diaCorto(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00`);
  return Number.isNaN(d.getTime()) ? fechaISO : DIAS[d.getDay()];
}

// Fecha ISO → "hace 5 min", "hace 2 h", "ayer", "12 nov".
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function hace(fechaISO, ahora = Date.now()) {
  const t = new Date(fechaISO).getTime();
  if (Number.isNaN(t)) return '';
  const seg = Math.max(0, Math.round((ahora - t) / 1000));
  if (seg < 60) return 'justo ahora';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  const d = new Date(t);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export const redondear = (n) => (typeof n === 'number' ? Math.round(n) : n);
