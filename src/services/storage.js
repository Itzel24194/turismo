// Almacenamiento de imágenes en Supabase Storage (bucket PRIVADO).
import { supabase } from './supabase';
import { BUCKET } from '../config';
import { SIGNED_URL_TTL, buildPath } from '../utils/validation';
import { base64ToBytes } from '../utils/base64';
import { traducirError } from '../utils/errors';

// Sesión anónima autenticada: el usuario recibe un JWT propio, que es lo que permite
// a las reglas de Storage saber QUIÉN sube y QUIÉN lee cada archivo.
export async function asegurarSesion() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  } catch (e) {
    throw traducirError(e);
  }
}

// Sube bytes al bucket. Devuelve la RUTA (referencia permanente), no una URL.
export async function subirBytes(bytes, mime, userId, rutaPersonalizada) {
  const path = rutaPersonalizada || buildPath(userId, mime);
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes.buffer, { contentType: mime, upsert: false });
    if (error) throw error;
    return { path, mime, size: bytes.length };
  } catch (e) {
    throw traducirError(e);
  }
}

export const subirImagenBase64 = (base64, mime, userId) =>
  subirBytes(base64ToBytes(base64), mime, userId);

// URL firmada: enlace temporal (1 h) generado solo si el usuario tiene permiso de lectura.
export async function urlFirmada(path) {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    if (error) throw error;
    return data.signedUrl;
  } catch (e) {
    throw traducirError(e);
  }
}

export async function urlsFirmadas(paths) {
  if (!paths.length) return {};
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    if (error) throw error;
    const mapa = {};
    for (const r of data) if (r.signedUrl) mapa[r.path] = r.signedUrl;
    return mapa;
  } catch (e) {
    throw traducirError(e);
  }
}

export async function borrarImagen(path) {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  } catch (e) {
    throw traducirError(e);
  }
}
