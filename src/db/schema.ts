import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schema local (SQLite) — fonte de verdade de tipos para Drizzle.
 *
 * Convenções Offline-First:
 * - PK é sempre TEXT gerada no cliente (UUID v4 via expo-crypto) → sem colisão ao subir pro Supabase.
 * - `updated_at` (ISO 8601 UTC) é o relógio de Last-Write-Wins no sync.
 * - `deleted_at` = soft delete (o registro precisa existir para propagar a exclusão).
 * - `is_synced` = dirty flag local. NÃO existe no Supabase.
 *
 * ⚠️ Mantenha em sincronia com `src/db/migrations.ts` (DDL executado no boot).
 */

export const DEFAULT_USER_ID = 'default_user';

export const ENTRY_METHODS = ['manual', 'image'] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];

export const MEAL_WINDOWS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealWindow = (typeof MEAL_WINDOWS)[number];

const nowIsoSql = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/** Colunas de controle compartilhadas pelas tabelas de log. */
const syncColumns = {
  createdAt: text('created_at').notNull().default(nowIsoSql),
  updatedAt: text('updated_at').notNull().default(nowIsoSql),
  deletedAt: text('deleted_at'),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
};

export const APP_LANGUAGES = ['pt', 'en'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const userGoals = sqliteTable('user_goals', {
  id: text('id').primaryKey().default(DEFAULT_USER_ID),
  proteinGoal: integer('protein_goal').notNull().default(160),
  waterGoal: integer('water_goal').notNull().default(3000),
  caloriesGoal: integer('calories_goal').notNull().default(2200),
  language: text('language', { enum: APP_LANGUAGES }).notNull().default('pt'),
  updatedAt: text('updated_at').notNull().default(nowIsoSql),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
});

export const waterLogs = sqliteTable(
  'water_logs',
  {
    id: text('id').primaryKey(),
    amountMl: integer('amount_ml').notNull(),
    /** 'YYYY-MM-DD' no fuso LOCAL do dispositivo no momento do registro. */
    dateKey: text('date_key').notNull(),
    ...syncColumns,
  },
  (t) => [
    index('idx_water_logs_date_key').on(t.dateKey),
    index('idx_water_logs_is_synced').on(t.isSynced),
  ],
);

export const foodLogs = sqliteTable(
  'food_logs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    proteinG: real('protein_g').notNull(),
    caloriesKcal: integer('calories_kcal').notNull(),
    entryMethod: text('entry_method', { enum: ENTRY_METHODS }).notNull().default('manual'),
    mealWindow: text('meal_window', { enum: MEAL_WINDOWS }).notNull().default('lunch'),
    dateKey: text('date_key').notNull(),
    ...syncColumns,
  },
  (t) => [
    index('idx_food_logs_date_key').on(t.dateKey),
    index('idx_food_logs_is_synced').on(t.isSynced),
  ],
);

export type UserGoals = typeof userGoals.$inferSelect;
export type NewUserGoals = typeof userGoals.$inferInsert;
export type WaterLog = typeof waterLogs.$inferSelect;
export type NewWaterLog = typeof waterLogs.$inferInsert;
export type FoodLog = typeof foodLogs.$inferSelect;
export type NewFoodLog = typeof foodLogs.$inferInsert;

/** Tabelas sincronizáveis (mesmo nome local e remoto). */
export const SYNC_TABLES = ['user_goals', 'water_logs', 'food_logs'] as const;
export type SyncTableName = (typeof SYNC_TABLES)[number];
