// Búsquedas recientes (persisten en el dispositivo).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'destinos:recientes';
const MAX = 6;

export async function leerRecientes() {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function guardarReciente(ciudad) {
  const actual = await leerRecientes();
  const lista = [ciudad, ...actual.filter((c) => c.toLowerCase() !== ciudad.toLowerCase())].slice(0, MAX);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(lista)); } catch {}
  return lista;
}

export async function borrarRecientes() {
  try { await AsyncStorage.removeItem(KEY); } catch {}
  return [];
}
