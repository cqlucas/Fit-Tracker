import type { SQLiteDatabase } from 'expo-sqlite';

import { toDateKey } from '@/utils/date';
import { generateId } from '@/utils/id';

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
export const MIGRATIONS: readonly string[] = [
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
  // v6 — nutrition, immutable plans and account-scoped sync (v1–v5 remain unchanged).
  `
  ALTER TABLE food_logs RENAME TO food_logs_v5;
  DROP INDEX idx_food_logs_date_key;
  DROP INDEX idx_food_logs_is_synced;
  CREATE TABLE food_logs (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, protein_g REAL CHECK (protein_g IS NULL OR protein_g >= 0), calories_kcal REAL CHECK (calories_kcal IS NULL OR calories_kcal >= 0), carb_g REAL CHECK (carb_g IS NULL OR carb_g >= 0), fat_g REAL CHECK (fat_g IS NULL OR fat_g >= 0), fiber_g REAL CHECK (fiber_g IS NULL OR fiber_g >= 0), saturated_fat_g REAL CHECK (saturated_fat_g IS NULL OR saturated_fat_g >= 0), sodium_mg REAL CHECK (sodium_mg IS NULL OR sodium_mg >= 0),
    entry_method TEXT NOT NULL DEFAULT 'manual', meal_window TEXT NOT NULL DEFAULT 'lunch', image_uri TEXT,
    nutrition_source TEXT NOT NULL DEFAULT 'manual', input_channel TEXT NOT NULL DEFAULT 'text', is_estimate INTEGER NOT NULL DEFAULT 0,
    nutrient_sources TEXT, portion_amount REAL, portion_unit TEXT, template_id TEXT,
    date_key TEXT NOT NULL, occurred_at TEXT NOT NULL, time_zone TEXT NOT NULL DEFAULT 'unknown', owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO food_logs (id,name,protein_g,calories_kcal,entry_method,meal_window,image_uri,date_key,occurred_at,time_zone,created_at,updated_at,deleted_at,is_synced,input_channel,is_estimate)
    SELECT id,name,protein_g,calories_kcal,entry_method,meal_window,image_uri,date_key,created_at,'unknown',created_at,updated_at,deleted_at,0,
    CASE WHEN entry_method='image' THEN 'image' ELSE 'text' END, CASE WHEN entry_method='image' THEN 1 ELSE 0 END FROM food_logs_v5;
  -- Legacy provenance cannot be recovered: preserve it as unknown, never infer a verified source.
  UPDATE food_logs SET nutrition_source='ai' WHERE entry_method='image';
  DROP TABLE food_logs_v5;
  CREATE INDEX idx_food_logs_date_key ON food_logs(date_key);
  CREATE INDEX idx_food_logs_is_synced ON food_logs(is_synced);
  CREATE INDEX idx_food_history ON food_logs(occurred_at DESC,id DESC);
  ALTER TABLE water_logs ADD COLUMN owner_id TEXT;
  ALTER TABLE water_logs ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE water_logs ADD COLUMN operation_id TEXT;
  ALTER TABLE water_logs ADD COLUMN group_id TEXT;
  ALTER TABLE water_logs ADD COLUMN category TEXT NOT NULL DEFAULT 'water';
  ALTER TABLE water_logs ADD COLUMN food_log_id TEXT;
  ALTER TABLE water_logs ADD COLUMN occurred_at TEXT;
  ALTER TABLE water_logs ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'unknown';
  UPDATE water_logs SET occurred_at=created_at,is_synced=0;
  CREATE UNIQUE INDEX idx_water_food_link ON water_logs(food_log_id);
  CREATE INDEX idx_water_history ON water_logs(occurred_at DESC,id DESC);
  CREATE TABLE goal_plans (
    id TEXT PRIMARY KEY NOT NULL, effective_from TEXT NOT NULL, protein_goal REAL NOT NULL, water_goal REAL NOT NULL, calories_goal REAL NOT NULL,
    carb_goal REAL, fat_goal REAL, fiber_goal REAL, sodium_limit REAL, saturated_fat_limit REAL, creatine_goal REAL,
    source TEXT NOT NULL DEFAULT 'manual', replaces_id TEXT, replaces_revision INTEGER NOT NULL DEFAULT 0, owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_goals_effective ON goal_plans(effective_from);
  CREATE TABLE food_templates (id TEXT PRIMARY KEY NOT NULL, beverage_ml INTEGER CHECK(beverage_ml>0), name TEXT NOT NULL, protein_g REAL CHECK (protein_g IS NULL OR protein_g >= 0), calories_kcal REAL CHECK (calories_kcal IS NULL OR calories_kcal >= 0), carb_g REAL CHECK (carb_g IS NULL OR carb_g >= 0), fat_g REAL CHECK (fat_g IS NULL OR fat_g >= 0), fiber_g REAL CHECK (fiber_g IS NULL OR fiber_g >= 0), saturated_fat_g REAL CHECK (saturated_fat_g IS NULL OR saturated_fat_g >= 0), sodium_mg REAL CHECK (sodium_mg IS NULL OR sodium_mg >= 0), portion_amount REAL NOT NULL CHECK(portion_amount>0), portion_unit TEXT NOT NULL, nutrition_source TEXT NOT NULL, is_estimate INTEGER NOT NULL DEFAULT 0, nutrient_sources TEXT, owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE weight_logs (id TEXT PRIMARY KEY NOT NULL, weight_kg REAL NOT NULL CHECK(weight_kg>0), date_key TEXT NOT NULL, occurred_at TEXT, time_zone TEXT NOT NULL, owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0);
  CREATE INDEX idx_weight_date ON weight_logs(date_key);
  CREATE TABLE supplement_logs (id TEXT PRIMARY KEY NOT NULL, supplement TEXT NOT NULL DEFAULT 'creatine', dose_g REAL NOT NULL CHECK(dose_g>=0), date_key TEXT NOT NULL, owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE training_days (id TEXT PRIMARY KEY NOT NULL, date_key TEXT NOT NULL, duration_min REAL, note TEXT NOT NULL DEFAULT '', owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE daily_checkins (id TEXT PRIMARY KEY NOT NULL, date_key TEXT NOT NULL, confirmed INTEGER NOT NULL DEFAULT 0, food_signature TEXT NOT NULL DEFAULT '', context TEXT NOT NULL DEFAULT '', owner_id TEXT, revision INTEGER NOT NULL DEFAULT 0, operation_id TEXT, group_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, is_synced INTEGER NOT NULL DEFAULT 0);
  CREATE UNIQUE INDEX idx_checkin_day ON daily_checkins(date_key) WHERE deleted_at IS NULL;
  CREATE UNIQUE INDEX idx_training_day ON training_days(date_key) WHERE deleted_at IS NULL;
  CREATE TABLE local_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE sync_outbox (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, attempted INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE sync_conflicts (id TEXT PRIMARY KEY NOT NULL, table_name TEXT NOT NULL, local_id TEXT NOT NULL, remote_json TEXT NOT NULL, operation_id TEXT NOT NULL);
  CREATE TABLE sync_checkpoints (table_name TEXT PRIMARY KEY NOT NULL, timestamp TEXT NOT NULL, row_id TEXT NOT NULL, reconciled_at TEXT);
  CREATE TABLE form_drafts (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
  CREATE INDEX idx_goal_plans_pending ON goal_plans(is_synced) WHERE is_synced=0;
  CREATE INDEX idx_templates_pending ON food_templates(is_synced) WHERE is_synced=0;
  CREATE INDEX idx_weight_pending ON weight_logs(is_synced) WHERE is_synced=0;
  CREATE INDEX idx_supplement_pending ON supplement_logs(is_synced) WHERE is_synced=0;
  CREATE INDEX idx_training_pending ON training_days(is_synced) WHERE is_synced=0;
  CREATE INDEX idx_checkin_pending ON daily_checkins(is_synced) WHERE is_synced=0;
  UPDATE user_goals SET is_synced=1;
`,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Verifica se uma coluna já existe em uma tabela para evitar falhas de duplicidade. */
function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): boolean {
  try {
    const columns = db.getAllSync<{ name: string }>(
      `PRAGMA table_info(${tableName})`,
    );
    return columns.some(
      (col) => col.name.toLowerCase() === columnName.toLowerCase(),
    );
  } catch {
    return false;
  }
}

/** Executa uma migration com segurança defensiva contra duplicate column name. */
function executeMigrationStep(db: SQLiteDatabase, sql: string): void {
  const trimmed = sql.trim();
  const alterAddColMatch = trimmed.match(
    /^ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD(?:\s+COLUMN)?\s+([a-zA-Z0-9_]+)/i,
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
    if (alterAddColMatch && message.includes('duplicate column name')) {
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
        if (v === 5) {
          for (const table of ['food_logs', 'water_logs']) {
            for (const row of db.getAllSync<{ id: string }>(
              `SELECT id FROM ${table} WHERE operation_id IS NULL`,
            )) {
              db.runSync(
                `UPDATE ${table} SET operation_id=? WHERE id=?`,
                generateId(),
                row.id,
              );
            }
          }
        }
      }
      // PRAGMA não aceita bind params; o valor é uma constante numérica interna.
      db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }

  seedSync(db);
  if (!db.getFirstSync('SELECT id FROM goal_plans LIMIT 1')) {
    const timestamp = new Date().toISOString();
    const day = toDateKey();
    db.runSync(
      `INSERT INTO goal_plans (id,effective_from,protein_goal,water_goal,calories_goal,created_at,updated_at,source)
      SELECT ?,?,protein_goal,water_goal,calories_goal,?,?, 'manual' FROM user_goals WHERE id=?`,
      generateId(),
      day,
      timestamp,
      timestamp,
      DEFAULT_USER_ID,
    );
  }
}

/** Local preferences/legacy targets never enter the cloud queue. Existing values are preserved. */
function seedSync(db: SQLiteDatabase): void {
  db.runSync(
    `INSERT OR IGNORE INTO user_goals (id, protein_goal,water_goal,calories_goal,updated_at,is_synced) VALUES (?,120,2500,2500,?,1)`,
    DEFAULT_USER_ID,
    new Date(0).toISOString(),
  );
}
