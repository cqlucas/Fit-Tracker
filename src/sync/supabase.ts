import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';

/**
 * Variáveis públicas do Expo (embutidas no bundle em build-time).
 * Defina em `.env` (veja `.env.example`). Nunca coloque a service_role key aqui.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

/**
 * `null` enquanto o .env não estiver configurado — o app continua 100% funcional offline
 * e o SyncEngine simplesmente fica inativo.
 *
 * Sessão de auth persistida no próprio SQLite (expo-sqlite/kv-store), sem AsyncStorage extra.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
