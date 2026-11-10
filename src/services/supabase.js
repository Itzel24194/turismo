import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONFIGURADO } from '../config';

// La sesión se guarda en AsyncStorage: al cerrar y abrir la app el usuario sigue siendo el mismo
// y por eso puede volver a ver sus incidencias e imágenes.
export const supabase = SUPABASE_CONFIGURADO
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
