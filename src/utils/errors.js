import { ApiError } from './http';

// Traduce errores técnicos de Supabase a mensajes comprensibles (y dice cómo arreglarlos).
export function traducirError(e) {
  if (e instanceof ApiError) return e;
  const msg = String(e?.message ?? '');
  const code = String(e?.code ?? e?.error_code ?? '');
  const status = String(e?.statusCode ?? e?.status ?? '');
  const todo = `${msg} ${code} ${status}`;
  const service = 'Supabase';
  const err = (m, st) => new ApiError(m, { service, status: st });

  if (/network request failed|failed to fetch|timeout|offline|abort/i.test(msg)) {
    return err('Sin conexión a internet. No se envió el reporte; revisa tu red y reintenta.');
  }
  if (/anonymous_provider_disabled|anonymous sign-ins are disabled/i.test(todo)) {
    return err('Los inicios de sesión anónimos están desactivados. En Supabase: Authentication → Sign In / Providers → activa "Allow anonymous sign-ins".', 422);
  }
  if (/invalid api key|no api key|apikey/i.test(msg)) {
    return err('La clave de Supabase no es válida. Revisa EXPO_PUBLIC_SUPABASE_ANON_KEY en tu .env y reinicia con: npx expo start -c', 401);
  }
  if (/PGRST205|could not find the table|relation .* does not exist/i.test(todo)) {
    return err('La tabla "incidencias" no existe todavía. En Supabase abre SQL Editor y ejecuta el archivo supabase/setup.sql.', 404);
  }
  if (/bucket not found/i.test(msg)) {
    return err('El bucket "incidencias" no existe todavía. En Supabase abre SQL Editor y ejecuta el archivo supabase/setup.sql.', 404);
  }
  if (status === '415' || /mime|not supported|invalid.*type/i.test(msg)) {
    return err('El servidor rechazó el tipo de archivo (solo JPG, PNG o WebP).', 415);
  }
  if (status === '413' || /exceed|too large|maximum/i.test(msg)) {
    return err('El servidor rechazó el archivo por superar el tamaño máximo (5 MB).', 413);
  }
  if (/row-level security|unauthorized|not authorized|403|jwt/i.test(todo)) {
    return err('No tienes autorización para esta operación.', 403);
  }
  return err(msg || 'Error desconocido en el servicio de almacenamiento.');
}
