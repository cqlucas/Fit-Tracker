import { drizzle } from 'drizzle-orm/expo-sqlite';
import { backupDatabaseSync, openDatabaseSync } from 'expo-sqlite';
import { runMigrationsSync, SCHEMA_VERSION } from './migrations';
import * as schema from './schema';

export const DATABASE_NAME = 'fit-tracker.db';
function open(name: string) {
  const connection = openDatabaseSync(name, { enableChangeListener: true });
  const version =
    connection.getFirstSync<{ user_version: number }>('PRAGMA user_version')
      ?.user_version ?? 0;
  if (version > 0 && version < SCHEMA_VERSION) {
    const backup = openDatabaseSync(`${name}.pre-v${SCHEMA_VERSION}`);
    backupDatabaseSync({ sourceDatabase: connection, destDatabase: backup });
    const check = backup.getFirstSync<{ integrity_check: string }>(
      'PRAGMA integrity_check',
    );
    backup.closeSync();
    if (check?.integrity_check !== 'ok')
      throw new Error('Backup integrity check failed');
  }
  runMigrationsSync(connection);
  return connection;
}
export let expoDb = open(DATABASE_NAME);
export let db = drizzle(expoDb, { schema });
export let activeOwner: string | null = null;
let scope = 'local';
const listeners = new Set<() => void>();
export const getDatabaseScope = () => scope;
export function scopeGuard() {
  const expected = scope;
  return () => {
    if (scope !== expected)
      throw new Error(
        'Conta alterada; tente novamente / Account changed; try again',
      );
  };
}
export function subscribeDatabaseScope(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function activateDatabase(owner: string | null, project = '') {
  if (owner && !/^[a-f0-9-]{36}$/.test(owner))
    throw new Error('Invalid account');
  const nextScope = owner ? `${project}:${owner}` : 'local';
  if (scope === nextScope) return;
  // URL encoded in the filename also isolates accounts from different Supabase projects.
  const next = open(
    owner
      ? `fit-tracker-${encodeURIComponent(project)}-${owner}.db`
      : DATABASE_NAME,
  );
  activeOwner = owner;
  scope = nextScope;
  // Keep old handle open: outstanding reads must never start reading another account's file.
  expoDb = next;
  db = drizzle(next, { schema });
  listeners.forEach((l) => l());
}
export type Database = typeof db;
