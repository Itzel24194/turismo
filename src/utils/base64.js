// Decodifica base64 a bytes sin dependencias externas.
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = {};
for (let i = 0; i < CHARS.length; i++) LOOKUP[CHARS[i]] = i;

export function base64ToBytes(b64) {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const n = Math.floor((len * 3) / 4);
  const out = new Uint8Array(n);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = LOOKUP[clean[i]];
    const e2 = LOOKUP[clean[i + 1]];
    const e3 = i + 2 < len ? LOOKUP[clean[i + 2]] : 0;
    const e4 = i + 3 < len ? LOOKUP[clean[i + 3]] : 0;
    if (p < n) out[p++] = (e1 << 2) | (e2 >> 4);
    if (p < n) out[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < n) out[p++] = ((e3 & 3) << 6) | e4;
  }
  return out;
}
