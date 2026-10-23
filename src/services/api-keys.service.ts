import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AiProvider = 'gemini' | 'groq';

export interface ApiKeysStatus {
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
}

const SECURE_KEYS: Record<AiProvider, string> = {
  gemini: 'secure_gemini_api_key',
  groq: 'secure_groq_api_key',
};

// Marcador especial quando o usuário desvincula explicitamente no app
// Isso impede que um valor local em .env (dev) sobrescreva a desvinculação da UI
const UNLINKED_SENTINEL = '__UNLINKED__';

// Fallback em memória caso o SecureStore não esteja disponível (ex: web sem suporte a keystore)
const memoryStore = new Map<string, string>();

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
    // Se o ambiente de dev possuir .env, grava a flag UNLINKED para que a desvinculação
    // na UI tenha efeito imediato e não volte a ler a chave do .env
    await setSecureItem(SECURE_KEYS[provider], UNLINKED_SENTINEL);
  } else {
    await deleteSecureItem(SECURE_KEYS[provider]);
  }
}

/**
 * USO EXCLUSIVO INTERNO DOS SERVICES DE IA.
 * Busca a chave no SecureStore; como conveniência apenas para dev local se o
 * SecureStore estiver vazio e não desvinculado, lê process.env.EXPO_PUBLIC_...
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
 * USO DA UI.
 * Retorna APENAS booleanos indicando se as chaves estão vinculadas ou não.
 * Garante que a UI jamais leia ou exponha o valor real da chave salva.
 */
export async function getApiKeysStatus(): Promise<ApiKeysStatus> {
  const [geminiKey, groqKey] = await Promise.all([
    getApiKeyForService('gemini'),
    getApiKeyForService('groq'),
  ]);

  return {
    hasGeminiKey: Boolean(geminiKey && geminiKey.trim().length > 0),
    hasGroqKey: Boolean(groqKey && groqKey.trim().length > 0),
  };
}

export const apiKeysService = {
  saveApiKey,
  unlinkApiKey,
  getApiKeyForService,
  getApiKeysStatus,
};
