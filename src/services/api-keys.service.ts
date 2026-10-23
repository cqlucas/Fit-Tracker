import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AiProvider = 'gemini' | 'groq';

export interface ApiKeysStatus {
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  hasSupabaseLinked: boolean;
  lastSyncAt?: string | null;
}

const SECURE_KEYS: Record<AiProvider, string> = {
  gemini: 'secure_gemini_api_key',
  groq: 'secure_groq_api_key',
};

const SECURE_SUPABASE_URL = 'secure_supabase_url';
const SECURE_SUPABASE_ANON_KEY = 'secure_supabase_anon_key';
const SECURE_SUPABASE_LAST_SYNC_AT = 'secure_supabase_last_sync_at';

// Marcador especial quando o usuário desvincula explicitamente no app
// Isso impede que um valor local em .env (dev) sobrescreva a desvinculação da UI
const UNLINKED_SENTINEL = '__UNLINKED__';

// Fallback em memória caso o SecureStore não esteja disponível (ex: web sem suporte a keystore)
const memoryStore = new Map<string, string>();

let changeListeners: (() => void)[] = [];

export function registerCredentialsChangeListener(listener: () => void): () => void {
  changeListeners.push(listener);
  return () => {
    changeListeners = changeListeners.filter((l) => l !== listener);
  };
}

function notifyCredentialsChanged(): void {
  for (const listener of changeListeners) {
    try {
      listener();
    } catch {}
  }
}

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function setSecureItem(key: string, value: string): Promise<void> {
  const available = await isSecureStoreAvailable();
  if (available) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {}
  }
  memoryStore.set(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  const available = await isSecureStoreAvailable();
  if (available) {
    return await SecureStore.getItemAsync(key);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {}
  }
  return memoryStore.get(key) ?? null;
}

async function deleteSecureItem(key: string): Promise<void> {
  const available = await isSecureStoreAvailable();
  if (available) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
      return;
    } catch {}
  }
  memoryStore.delete(key);
}

function getDevEnvFallback(provider: AiProvider): string | null {
  if (provider === 'gemini') {
    const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
    if (key && key !== 'sua_chave_do_google_ai_studio_aqui') {
      return key;
    }
  } else if (provider === 'groq') {
    const key = process.env.EXPO_PUBLIC_GROQ_API_KEY?.trim();
    if (key && key !== 'sua_chave_da_groq_cloud_aqui') {
      return key;
    }
  }
  return null;
}

function getDevEnvSupabaseFallback(): { url: string; anonKey: string } | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim();
  if (
    url &&
    anonKey &&
    url.length > 0 &&
    anonKey.length > 0 &&
    !url.includes('sua_url_do_supabase') &&
    !anonKey.includes('sua_anon_key')
  ) {
    return {
      url: url.replace(/\/+$/, ''),
      anonKey,
    };
  }
  return null;
}

/**
 * Salva a API Key no cofre criptografado com .trim().
 */
export async function saveApiKey(provider: AiProvider, key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    await unlinkApiKey(provider);
    return;
  }
  await setSecureItem(SECURE_KEYS[provider], trimmed);
}

/**
 * Desvincula a API Key do SecureStore imediatamente.
 */
export async function unlinkApiKey(provider: AiProvider): Promise<void> {
  const devEnv = getDevEnvFallback(provider);
  if (devEnv) {
    await setSecureItem(SECURE_KEYS[provider], UNLINKED_SENTINEL);
  } else {
    await deleteSecureItem(SECURE_KEYS[provider]);
  }
}

/**
 * USO EXCLUSIVO INTERNO DOS SERVICES DE IA.
 */
export async function getApiKeyForService(provider: AiProvider): Promise<string | null> {
  const stored = await getSecureItem(SECURE_KEYS[provider]);
  if (stored === UNLINKED_SENTINEL) {
    return null;
  }
  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }
  return getDevEnvFallback(provider);
}

/**
 * Salva as credenciais do Supabase no cofre criptografado.
 * Normaliza a URL com .trim() e remove a barra final se houver.
 */
export async function saveSupabaseCredentials(url: string, anonKey: string): Promise<void> {
  const trimmedUrl = url.trim().replace(/\/+$/, '');
  const trimmedKey = anonKey.trim();

  if (!trimmedUrl || !trimmedKey) {
    await unlinkSupabaseCredentials();
    return;
  }

  await Promise.all([
    setSecureItem(SECURE_SUPABASE_URL, trimmedUrl),
    setSecureItem(SECURE_SUPABASE_ANON_KEY, trimmedKey),
  ]);

  notifyCredentialsChanged();
}

/**
 * Desvincula o Supabase do SecureStore e reseta registros de sincronização.
 */
export async function unlinkSupabaseCredentials(): Promise<void> {
  const devEnv = getDevEnvSupabaseFallback();
  if (devEnv) {
    await Promise.all([
      setSecureItem(SECURE_SUPABASE_URL, UNLINKED_SENTINEL),
      setSecureItem(SECURE_SUPABASE_ANON_KEY, UNLINKED_SENTINEL),
      deleteSecureItem(SECURE_SUPABASE_LAST_SYNC_AT),
    ]);
  } else {
    await Promise.all([
      deleteSecureItem(SECURE_SUPABASE_URL),
      deleteSecureItem(SECURE_SUPABASE_ANON_KEY),
      deleteSecureItem(SECURE_SUPABASE_LAST_SYNC_AT),
    ]);
  }

  notifyCredentialsChanged();
}

/**
 * USO EXCLUSIVO INTERNO DE supabase.ts e sync.service.ts.
 * Retorna a URL e Anon Key do Supabase ou null se desvinculado/não configurado.
 */
export async function getSupabaseCredentialsForService(): Promise<{ url: string; anonKey: string } | null> {
  const [url, anonKey] = await Promise.all([
    getSecureItem(SECURE_SUPABASE_URL),
    getSecureItem(SECURE_SUPABASE_ANON_KEY),
  ]);

  if (url === UNLINKED_SENTINEL || anonKey === UNLINKED_SENTINEL) {
    return null;
  }

  if (url && anonKey && url.trim().length > 0 && anonKey.trim().length > 0) {
    return {
      url: url.trim().replace(/\/+$/, ''),
      anonKey: anonKey.trim(),
    };
  }

  return getDevEnvSupabaseFallback();
}

/**
 * Salva o timestamp ISO da última sincronização com sucesso.
 */
export async function saveLastSyncTimestamp(isoTimestamp: string): Promise<void> {
  await setSecureItem(SECURE_SUPABASE_LAST_SYNC_AT, isoTimestamp);
}

/**
 * Obtém o timestamp ISO da última sincronização bem-sucedida.
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  return await getSecureItem(SECURE_SUPABASE_LAST_SYNC_AT);
}

/**
 * USO DA UI.
 * Retorna APENAS booleanos indicando se os serviços estão vinculados ou não.
 * Garante que a UI jamais leia ou exponha o valor real das credenciais salvas.
 */
export async function getApiKeysStatus(): Promise<ApiKeysStatus> {
  const [geminiKey, groqKey, supabaseCreds, lastSyncAt] = await Promise.all([
    getApiKeyForService('gemini'),
    getApiKeyForService('groq'),
    getSupabaseCredentialsForService(),
    getLastSyncTimestamp(),
  ]);

  return {
    hasGeminiKey: Boolean(geminiKey && geminiKey.trim().length > 0),
    hasGroqKey: Boolean(groqKey && groqKey.trim().length > 0),
    hasSupabaseLinked: Boolean(supabaseCreds && supabaseCreds.url && supabaseCreds.anonKey),
    lastSyncAt: lastSyncAt || null,
  };
}

export const apiKeysService = {
  saveApiKey,
  unlinkApiKey,
  getApiKeyForService,
  saveSupabaseCredentials,
  unlinkSupabaseCredentials,
  getSupabaseCredentialsForService,
  saveLastSyncTimestamp,
  getLastSyncTimestamp,
  getApiKeysStatus,
  registerCredentialsChangeListener,
};
