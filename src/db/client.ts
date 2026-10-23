import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { runMigrationsSync } from './migrations';
import * as schema from './schema';

export const DATABASE_NAME = 'fit-tracker.db';

/**
 * Conexão única do app.
 * `enableChangeListener: true` é obrigatório para:
 *  - `useLiveQuery` do Drizzle (re-render reativo nas telas);
 *  - o SyncEngine detectar escritas locais e agendar push.
 */
export const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

// Inicialização automática e síncrona: tabelas + seed existem antes de qualquer import usar `db`.
runMigrationsSync(expoDb);

// Migração segura defensiva para garantir a coluna preferred_ai_provider em bancos existentes
try {
  expoDb.execSync(
    `ALTER TABLE user_goals ADD COLUMN preferred_ai_provider TEXT NOT NULL DEFAULT 'gemini';`
  );
} catch {
  // Ignora se a coluna já existir (ex: duplicate column name)
}

export const db = drizzle(expoDb, { schema });

export type Database = typeof db;
