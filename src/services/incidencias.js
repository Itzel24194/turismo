// Tabla "incidencias": guarda texto + la REFERENCIA (image_path) a la imagen. Nunca la imagen.
import { supabase } from './supabase';
import { borrarImagen, urlsFirmadas } from './storage';
import { traducirError } from '../utils/errors';

export async function crearIncidencia({ titulo, descripcion, imagen }) {
  try {
    const { data, error } = await supabase
      .from('incidencias')
      .insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        image_path: imagen?.path ?? null,
        image_mime: imagen?.mime ?? null,
        image_size: imagen?.size ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    // Si el registro falló, se elimina la imagen ya subida para no dejar archivos huérfanos.
    if (imagen?.path) borrarImagen(imagen.path).catch(() => {});
    throw traducirError(e);
  }
}

export async function listarIncidencias() {
  try {
    const { data, error } = await supabase
      .from('incidencias')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    const urls = await urlsFirmadas(data.map((r) => r.image_path).filter(Boolean));
    return data.map((r) => ({ ...r, imageUrl: r.image_path ? urls[r.image_path] ?? null : null }));
  } catch (e) {
    throw traducirError(e);
  }
}

// Elimina la fila y, después, su imagen en el bucket.
export async function eliminarIncidencia({ id, image_path }) {
  try {
    const { error } = await supabase.from('incidencias').delete().eq('id', id);
    if (error) throw error;
    if (image_path) await borrarImagen(image_path).catch(() => {});
  } catch (e) {
    throw traducirError(e);
  }
}
