import { randomUUID } from 'expo-crypto';

/** UUID v4 gerado no cliente — seguro para upsert no Supabase sem colisão. */
export function generateId(): string {
  return randomUUID();
}
