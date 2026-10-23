import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  getSupabaseCredentialsForService,
  registerCredentialsChangeListener,
} from '@/services/api-keys.service';

let cachedClient: SupabaseClient | null = null;
let cachedCredentialsKey: string | null = null;

// Ao mudar ou desvincular as credenciais no SecureStore, invalida o cache imediatamente
registerCredentialsChangeListener(() => {
  resetDynamicSupabaseClient();
});

/**
 * Cria uma instância efêmera de SupabaseClient com persistência de sessão desabilitada.
 * Muito útil para pré-validar a conexão e o schema na UI antes de salvar no SecureStore.
 */
export function createTemporarySupabaseClient(url: string, anonKey: string): SupabaseClient {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = anonKey.trim();

  return createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Reseta o cliente dinâmico do cache em memória.
 */
export function resetDynamicSupabaseClient(): void {
  cachedClient = null;
  cachedCredentialsKey = null;
}

/**
 * Retorna o cliente Supabase configurado dinamicamente para o usuário atual.
 * Se o usuário não tiver configurado URL e Anon Key no SecureStore, retorna `null`.
 * Reutiliza a instância em cache se as credenciais não foram alteradas.
 */
export async function getDynamicSupabaseClient(): Promise<SupabaseClient | null> {
  const credentials = await getSupabaseCredentialsForService();
  if (!credentials || !credentials.url || !credentials.anonKey) {
    resetDynamicSupabaseClient();
    return null;
  }

  const currentKey = `${credentials.url}:::${credentials.anonKey}`;
  if (cachedClient && cachedCredentialsKey === currentKey) {
    return cachedClient;
  }

  cachedClient = createClient(credentials.url, credentials.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  cachedCredentialsKey = currentKey;

  return cachedClient;
}

/**
 * Verifica de forma assíncrona se há um projeto Supabase configurado pelo usuário.
 */
export async function isSupabaseConfigured(): Promise<boolean> {
  const credentials = await getSupabaseCredentialsForService();
  return Boolean(credentials && credentials.url && credentials.anonKey);
}

/**
 * Exportação legada mantida como getter/null-safe para retrocompatibilidade.
 */
export const supabase: SupabaseClient | null = null;
