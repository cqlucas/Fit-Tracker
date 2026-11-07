import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
export type AiProvider = 'gemini' | 'groq';
export interface ApiKeysStatus {
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  hasSupabaseLinked: boolean;
  lastSyncAt?: string | null;
}
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
export function registerCredentialsChangeListener(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export async function setSecureItem(key: string, value: string) {
  if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync()))
    return SecureStore.setItemAsync(key, value);
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  else memory.set(key, value);
}
export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync()))
    return SecureStore.getItemAsync(key);
  return typeof localStorage !== 'undefined'
    ? localStorage.getItem(key)
    : (memory.get(key) ?? null);
}
export async function deleteSecureItem(key: string) {
  if (Platform.OS !== 'web' && (await SecureStore.isAvailableAsync()))
    return SecureStore.deleteItemAsync(key);
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  else memory.delete(key);
}
export function assertPublicSupabaseKey(key: string): void {
  if (/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)) return;
  const encoded = key.split('.')[1];
  if (!encoded) throw new Error('Use a public anon/publishable key');
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bits = 0,
    buffer = 0,
    decoded = '';
  for (const character of encoded
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/=+$/, '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Invalid public key');
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      decoded += String.fromCharCode((buffer >> bits) & 255);
    }
  }
  let role: unknown;
  try {
    role = JSON.parse(decoded).role;
  } catch {
    throw new Error('Invalid public key');
  }
  if (role !== 'anon') throw new Error('Use a public anon/publishable key');
}
export async function saveSupabaseCredentials(url: string, anonKey: string) {
  const parsed = new URL(url.trim());
  if (
    parsed.protocol !== 'https:' &&
    !(
      ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      parsed.protocol === 'http:'
    )
  )
    throw new Error('Use HTTPS');
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/' ||
    !anonKey.trim()
  )
    throw new Error('Invalid project URL or public key');
  assertPublicSupabaseKey(anonKey.trim());
  await setSecureItem('secure_supabase_url', parsed.origin);
  await setSecureItem('secure_supabase_anon_key', anonKey.trim());
  listeners.forEach((fn) => fn());
}
export async function unlinkSupabaseCredentials() {
  await setSecureItem('secure_supabase_url', '__UNLINKED__');
  await deleteSecureItem('secure_supabase_anon_key');
  listeners.forEach((fn) => fn());
}
export async function getSupabaseCredentialsForService() {
  const stored = await getSecureItem('secure_supabase_url');
  if (stored === '__UNLINKED__') return null;
  const url = stored ?? process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    (await getSecureItem('secure_supabase_anon_key')) ??
    process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim();
  if (!url || !anonKey) return null;
  assertPublicSupabaseKey(anonKey);
  return { url, anonKey };
}
// Legacy calls cannot read or send private provider keys anymore.
export async function saveApiKey(
  _provider: AiProvider,
  _key: string,
): Promise<void> {
  throw new Error('Configure provider secrets on the server');
}
export async function unlinkApiKey(provider: AiProvider) {
  await deleteSecureItem(`secure_${provider}_api_key`);
}
export async function getApiKeyForService(
  _provider: AiProvider,
): Promise<string | null> {
  return null;
}
export async function saveLastSyncTimestamp(value: string) {
  await setSecureItem('secure_supabase_last_sync_at', value);
}
export async function getLastSyncTimestamp() {
  return getSecureItem('secure_supabase_last_sync_at');
}
export async function getApiKeysStatus(): Promise<ApiKeysStatus> {
  return {
    hasGeminiKey: false,
    hasGroqKey: false,
    hasSupabaseLinked: !!(await getSupabaseCredentialsForService()),
    lastSyncAt: await getLastSyncTimestamp(),
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
