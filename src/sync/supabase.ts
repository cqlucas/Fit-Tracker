import NetInfo from '@react-native-community/netinfo';
import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { activateDatabase } from '@/db/client';
import {
  deleteSecureItem,
  getSecureItem,
  getSupabaseCredentialsForService,
  registerCredentialsChangeListener,
  setSecureItem,
} from '@/services/api-keys.service';

let client: SupabaseClient | null = null,
  credentialsKey = '';
let authSubscription: { unsubscribe: () => void } | null = null;
const listeners = new Set<() => void>();
let currentSession: Session | null = null;
let project = '';
const storage = {
  async getItem(key: string) {
    const count = Number(await getSecureItem(`${key}-count`));
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => getSecureItem(`${key}-${i}`)),
    );
    return parts.every((v) => v !== null) ? parts.join('') : null;
  },
  async setItem(key: string, value: string) {
    const old = Number(await getSecureItem(`${key}-count`));
    const count = Math.ceil(value.length / 1800);
    for (let i = 0; i < count; i++)
      await setSecureItem(`${key}-${i}`, value.slice(i * 1800, (i + 1) * 1800));
    await setSecureItem(`${key}-count`, String(count));
    for (let i = count; i < old; i++) await deleteSecureItem(`${key}-${i}`);
  },
  async removeItem(key: string) {
    const count = Number(await getSecureItem(`${key}-count`));
    await deleteSecureItem(`${key}-count`);
    for (let i = 0; i < count; i++) await deleteSecureItem(`${key}-${i}`);
  },
};
export const subscribeAuth = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getAuthSession = () => currentSession;
export const getProjectId = () => project;
function applySession(session: Session | null) {
  currentSession = session;
  activateDatabase(session?.user.id ?? null, project);
  listeners.forEach((fn) => fn());
}
export function createTemporarySupabaseClient(url: string, anonKey: string) {
  return createClient(url.trim().replace(/\/+$/, ''), anonKey.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export function resetDynamicSupabaseClient() {
  authSubscription?.unsubscribe();
  authSubscription = null;
  client?.auth.stopAutoRefresh();
  client = null;
  credentialsKey = '';
  applySession(null);
}
registerCredentialsChangeListener(() => {
  resetDynamicSupabaseClient();
  void getDynamicSupabaseClient();
});
export async function getDynamicSupabaseClient(): Promise<SupabaseClient | null> {
  const creds = await getSupabaseCredentialsForService();
  if (!creds) {
    if (client) resetDynamicSupabaseClient();
    return null;
  }
  const key = creds.url + creds.anonKey;
  if (client && credentialsKey === key) return client;
  if (client) resetDynamicSupabaseClient();
  project = new URL(creds.url).host;
  client = createClient(creds.url, creds.anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: `fit-auth-${project.replace(/[^a-zA-Z0-9.-]/g, '-')}`,
    },
  });
  credentialsKey = key;
  const created = client;
  authSubscription = created.auth.onAuthStateChange((_event, session) => {
    if (client === created) applySession(session);
  }).data.subscription;
  const { data } = await created.auth.getSession();
  if (client === created) applySession(data.session);
  return created;
}
export async function sendEmailCode(email: string) {
  const c = await getDynamicSupabaseClient();
  if (!c) throw new Error('Configure Supabase');
  const { error } = await c.auth.signInWithOtp({ email: email.trim() });
  if (error) throw error;
}
export async function verifyEmailCode(email: string, token: string) {
  const c = await getDynamicSupabaseClient();
  if (!c) throw new Error('Configure Supabase');
  const { error } = await c.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}
export async function signOut() {
  const c = await getDynamicSupabaseClient();
  const key = `fit-auth-${project.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
  try {
    const network = await NetInfo.fetch();
    if (c && network.isConnected && network.isInternetReachable !== false)
      await c.auth.signOut({ scope: 'local' });
  } finally {
    // Returning to local mode must work without reaching the authentication server.
    await storage.removeItem(key);
    await storage.removeItem(`${key}-user`);
    resetDynamicSupabaseClient();
  }
}

export async function isSupabaseConfigured() {
  return !!(await getSupabaseCredentialsForService());
}
export const supabase: SupabaseClient | null = null;
