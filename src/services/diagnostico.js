// Comprueba, paso por paso, que Supabase está bien configurado y dice exactamente qué falta.
import { supabase } from './supabase';
import { BUCKET } from '../config';
import { asegurarSesion } from './storage';
import { traducirError } from '../utils/errors';

async function paso(id, label, fn) {
  try {
    await fn();
    return { id, label, ok: true };
  } catch (e) {
    return { id, label, ok: false, detalle: traducirError(e).message };
  }
}

export async function diagnosticar() {
  let usuario = null;
  const pasos = [];

  pasos.push(await paso('sesion', 'Sesión anónima', async () => {
    usuario = await asegurarSesion();
  }));

  pasos.push(await paso('tabla', 'Tabla "incidencias"', async () => {
    const { error } = await supabase.from('incidencias').select('id', { count: 'exact', head: true });
    if (error) throw error;
  }));

  pasos.push(await paso('bucket', `Bucket privado "${BUCKET}"`, async () => {
    const { error } = await supabase.storage.from(BUCKET).list(usuario?.id ?? '', { limit: 1 });
    if (error) throw error;
  }));

  return { usuario, pasos };
}
