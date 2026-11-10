// Configuración pública. La "anon key" (o "publishable key") de Supabase está pensada para vivir en la app:
// por sí sola NO da acceso a nada; las reglas RLS (supabase/setup.sql) deciden qué puede hacer cada usuario.
// NUNCA pongas aquí la "service_role key" ni ninguna clave administrativa.
//
// En Expo solo se leen variables que empiezan con EXPO_PUBLIC_ (NEXT_PUBLIC_ NO funciona).
// Cada variable se referencia de forma literal para que Expo pueda sustituirla al compilar.
const limpiar = (v) => String(v ?? '').trim().replace(/^["']|["']$/g, '');

const URL_CRUDA = limpiar(process.env.EXPO_PUBLIC_SUPABASE_URL);
const KEY_CRUDA = limpiar(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// Si pegaste la URL con "/rest/v1" o una "/" al final, nos quedamos solo con el origen.
const origen = URL_CRUDA.match(/^https:\/\/[^/\s]+/i);

export const SUPABASE_URL = origen ? origen[0] : '';
export const SUPABASE_ANON_KEY = KEY_CRUDA;
export const BUCKET = 'incidencias';
export const SUPABASE_CONFIGURADO = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;

// Para mostrar en pantalla qué falta exactamente.
export const CONFIG_FALTANTE = [
  !SUPABASE_URL && 'EXPO_PUBLIC_SUPABASE_URL',
  SUPABASE_ANON_KEY.length <= 20 && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter(Boolean);
