import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_USER_ID } from './schema';

/**
 * Migrations locais versionadas via `PRAGMA user_version`.
 *
 * Por que SQL direto em vez de drizzle-kit + useMigrations?
 * - Zero atrito: sem babel-plugin-inline-import, sem metro config para `.sql`, sem drizzle-kit no CI.
 * - Roda de forma síncrona no boot (antes de qualquer query), então o app nunca vê tabelas inexistentes.
 *
 * Regras:
 * - NUNCA edite uma migration já publicada; adicione uma nova no fim do array.
 * - O índice + 1 do array é a versão do schema.
 */
const MIGRATIONS: readonly string[] = [
  // v1 — schema inicial
  `
  CREATE TABLE IF NOT EXISTS user_goals (
    id            TEXT PRIMARY KEY NOT NULL DEFAULT '${DEFAULT_USER_ID}',
    protein_goal  INTEGER NOT NULL DEFAULT 160,
    water_goal    INTEGER NOT NULL DEFAULT 3000,
    calories_goal INTEGER NOT NULL DEFAULT 2200,
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    is_synced     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS water_logs (
    id          TEXT PRIMARY KEY NOT NULL,
    amount_ml   INTEGER NOT NULL CHECK (amount_ml > 0),
    date_key    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at  TEXT,
    is_synced   INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_water_logs_date_key  ON water_logs (date_key);
  CREATE INDEX IF NOT EXISTS idx_water_logs_is_synced ON water_logs (is_synced);

  CREATE TABLE IF NOT EXISTS food_logs (
    id             TEXT PRIMARY KEY NOT NULL,
    name           TEXT NOT NULL,
    protein_g      REAL NOT NULL CHECK (protein_g >= 0),
    calories_kcal  INTEGER NOT NULL CHECK (calories_kcal >= 0),
    entry_method   TEXT NOT NULL DEFAULT 'manual' CHECK (entry_method IN ('manual', 'image')),
    date_key       TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at     TEXT,
    is_synced      INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_food_logs_date_key  ON food_logs (date_key);
  CREATE INDEX IF NOT EXISTS idx_food_logs_is_synced ON food_logs (is_synced);
  `,
  // v2 — adição de language em user_goals
  `ALTER TABLE user_goals ADD COLUMN language TEXT NOT NULL DEFAULT 'pt';`,
  // v3 — adição de meal_window em food_logs
  `ALTER TABLE food_logs ADD COLUMN meal_window TEXT NOT NULL DEFAULT 'lunch';`,
  // v4 — adição de preferred_ai_provider em user_goals
  `ALTER TABLE user_goals ADD COLUMN preferred_ai_provider TEXT NOT NULL DEFAULT 'gemini';`,
  // v5 — adição de image_uri em food_logs
  `ALTER TABLE food_logs ADD COLUMN image_uri TEXT;`,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Verifica se uma coluna já existe em uma tabela para evitar falhas de duplicidade. */
function columnExists(db: SQLiteDatabase, tableName: string, columnName: string): boolean {
  try {
    const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName})`);
    return columns.some((col) => col.name.toLowerCase() === columnName.toLowerCase());
  } catch {
    return false;
  }
}

/** Executa uma migration com segurança defensiva contra duplicate column name. */
function executeMigrationStep(db: SQLiteDatabase, sql: string): void {
  const trimmed = sql.trim();
  const alterAddColMatch = trimmed.match(
    /^ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD(?:\s+COLUMN)?\s+([a-zA-Z0-9_]+)/i
  );

  if (alterAddColMatch) {
    const tableName = alterAddColMatch[1];
    const columnName = alterAddColMatch[2];
    if (columnExists(db, tableName, columnName)) {
      return;
    }
  }

  try {
    db.execSync(trimmed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('duplicate column name')) {
      return;
    }
    throw err;
  }
}

/** Executa migrations pendentes + seed. Idempotente e síncrono. */
export function runMigrationsSync(db: SQLiteDatabase): void {
  db.execSync(`PRAGMA journal_mode = WAL;`);

  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    db.withTransactionSync(() => {
      for (let v = currentVersion; v < SCHEMA_VERSION; v++) {
        executeMigrationStep(db, MIGRATIONS[v]);
      }
      // PRAGMA não aceita bind params; o valor é uma constante numérica interna.
      db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }

  seedSync(db);
}

/**
 * Garante a linha única de metas. `is_synced = 0` para que o default
 * suba ao Supabase no primeiro sync; se o servidor já tiver metas mais novas,
 * o pull (LWW por `updated_at`) sobrescreve.
 *
 * `updated_at` = epoch para que QUALQUER valor remoto vença o seed default.
 */
function seedSync(db: SQLiteDatabase): void {
  db.runSync(
    `INSERT OR IGNORE INTO user_goals (id, updated_at, is_synced) VALUES (?, ?, 0)`,
    DEFAULT_USER_ID,
    new Date(0).toISOString(),
  );
}
