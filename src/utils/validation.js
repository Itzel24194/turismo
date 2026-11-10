// Validación de archivos (se ejecuta en el cliente ANTES de subir).
// El bucket de Supabase aplica las mismas reglas en el servidor (ver supabase/setup.sql).
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const SIGNED_URL_TTL = 3600; // segundos (1 hora)

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME_BY_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export function mimeFromName(name = '') {
  const ext = name.split('?')[0].split('.').pop().toLowerCase();
  return MIME_BY_EXT[ext] || null;
}

export function validateImage({ mimeType, fileName, size }) {
  const mime = mimeType || mimeFromName(fileName || '');
  if (!mime || !ALLOWED_MIME.includes(mime)) {
    return { ok: false, error: 'Formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP.' };
  }
  if (typeof size === 'number') {
    if (size <= 0) return { ok: false, error: 'El archivo está vacío.' };
    if (size > MAX_BYTES) {
      return { ok: false, error: `El archivo pesa ${(size / 1048576).toFixed(1)} MB; el máximo es 5 MB.` };
    }
  }
  return { ok: true, mime };
}

// Ruta en el bucket: <id-del-usuario>/<marca-de-tiempo>.<ext>
// La carpeta con el id del usuario es lo que usan las reglas de acceso (RLS).
export function buildPath(userId, mime, now = Date.now()) {
  return `${userId}/${now}.${EXT_BY_MIME[mime] || 'bin'}`;
}
