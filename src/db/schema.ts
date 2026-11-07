import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { SOURCES } from '@/domain/nutrition';

export const DEFAULT_USER_ID = 'default_user';
export const ENTRY_METHODS = ['manual', 'image'] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];
export const MEAL_WINDOWS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealWindow = (typeof MEAL_WINDOWS)[number];
export const APP_LANGUAGES = ['pt', 'en'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export const AI_PROVIDERS = ['gemini', 'groq'] as const;
export type PreferredAiProvider = (typeof AI_PROVIDERS)[number];
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
const sync = () => ({
  ownerId: text('owner_id'),
  revision: integer('revision').notNull().default(0),
  operationId: text('operation_id'),
  groupId: text('group_id'),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
  deletedAt: text('deleted_at'),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
});
const nutrients = () => ({
  proteinG: real('protein_g'),
  caloriesKcal: real('calories_kcal'),
  carbG: real('carb_g'),
  fatG: real('fat_g'),
  fiberG: real('fiber_g'),
  saturatedFatG: real('saturated_fat_g'),
  sodiumMg: real('sodium_mg'),
});
export const userGoals = sqliteTable('user_goals', {
  id: text('id').primaryKey().default(DEFAULT_USER_ID),
  proteinGoal: real('protein_goal').notNull().default(120),
  waterGoal: real('water_goal').notNull().default(2500),
  caloriesGoal: real('calories_goal').notNull().default(2500),
  language: text('language', { enum: APP_LANGUAGES }).notNull().default('pt'),
  preferredAiProvider: text('preferred_ai_provider', { enum: AI_PROVIDERS })
    .notNull()
    .default('gemini'),
  updatedAt: text('updated_at').notNull().default(now),
  isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(true),
});
export const foodLogs = sqliteTable(
  'food_logs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ...nutrients(),
    entryMethod: text('entry_method', { enum: ENTRY_METHODS })
      .notNull()
      .default('manual'),
    mealWindow: text('meal_window', { enum: MEAL_WINDOWS })
      .notNull()
      .default('lunch'),
    imageUri: text('image_uri'),
    nutritionSource: text('nutrition_source', { enum: SOURCES })
      .notNull()
      .default('manual'),
    inputChannel: text('input_channel', { enum: ['text', 'image'] })
      .notNull()
      .default('text'),
    isEstimate: integer('is_estimate', { mode: 'boolean' })
      .notNull()
      .default(false),
    nutrientSources: text('nutrient_sources'),
    portionAmount: real('portion_amount'),
    portionUnit: text('portion_unit'),
    templateId: text('template_id'),
    dateKey: text('date_key').notNull(),
    occurredAt: text('occurred_at').notNull(),
    timeZone: text('time_zone').notNull(),
    ...sync(),
  },
  (t) => [
    index('idx_food_logs_date_key').on(t.dateKey),
    index('idx_food_history').on(t.occurredAt, t.id),
    index('idx_food_logs_is_synced').on(t.isSynced),
  ],
);
export const waterLogs = sqliteTable(
  'water_logs',
  {
    id: text('id').primaryKey(),
    amountMl: integer('amount_ml').notNull(),
    category: text('category').notNull().default('water'),
    foodLogId: text('food_log_id'),
    dateKey: text('date_key').notNull(),
    occurredAt: text('occurred_at').notNull(),
    timeZone: text('time_zone').notNull(),
    ...sync(),
  },
  (t) => [
    index('idx_water_logs_date_key').on(t.dateKey),
    index('idx_water_history').on(t.occurredAt, t.id),
    index('idx_water_logs_is_synced').on(t.isSynced),
    uniqueIndex('idx_water_food_link').on(t.foodLogId),
  ],
);
export const goalPlans = sqliteTable(
  'goal_plans',
  {
    id: text('id').primaryKey(),
    effectiveFrom: text('effective_from').notNull(),
    proteinGoal: real('protein_goal').notNull(),
    caloriesGoal: real('calories_goal').notNull(),
    waterGoal: real('water_goal').notNull(),
    carbGoal: real('carb_goal'),
    fatGoal: real('fat_goal'),
    fiberGoal: real('fiber_goal'),
    sodiumLimit: real('sodium_limit'),
    saturatedFatLimit: real('saturated_fat_limit'),
    creatineGoal: real('creatine_goal'),
    source: text('source').notNull().default('manual'),
    replacesId: text('replaces_id'),
    replacesRevision: integer('replaces_revision').notNull().default(0),
    ...sync(),
  },
  (t) => [index('idx_goals_effective').on(t.effectiveFrom)],
);
export const foodTemplates = sqliteTable('food_templates', {
  beverageMl: integer('beverage_ml'),
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ...nutrients(),
  portionAmount: real('portion_amount').notNull(),
  portionUnit: text('portion_unit').notNull(),
  nutritionSource: text('nutrition_source', { enum: SOURCES }).notNull(),
  isEstimate: integer('is_estimate', { mode: 'boolean' })
    .notNull()
    .default(false),
  nutrientSources: text('nutrient_sources'),
  ...sync(),
});
export const weightLogs = sqliteTable(
  'weight_logs',
  {
    id: text('id').primaryKey(),
    weightKg: real('weight_kg').notNull(),
    dateKey: text('date_key').notNull(),
    occurredAt: text('occurred_at'),
    timeZone: text('time_zone').notNull(),
    ...sync(),
  },
  (t) => [index('idx_weight_date').on(t.dateKey)],
);
export const supplementLogs = sqliteTable('supplement_logs', {
  id: text('id').primaryKey(),
  supplement: text('supplement').notNull().default('creatine'),
  doseG: real('dose_g').notNull(),
  dateKey: text('date_key').notNull(),
  ...sync(),
});
export const trainingDays = sqliteTable('training_days', {
  id: text('id').primaryKey(),
  dateKey: text('date_key').notNull(),
  durationMin: real('duration_min'),
  note: text('note').notNull().default(''),
  ...sync(),
});
export const dailyCheckins = sqliteTable('daily_checkins', {
  id: text('id').primaryKey(),
  dateKey: text('date_key').notNull(),
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
  foodSignature: text('food_signature').notNull().default(''),
  context: text('context').notNull().default(''),
  ...sync(),
});
export const SYNC_TABLES = [
  'food_logs',
  'water_logs',
  'goal_plans',
  'food_templates',
  'weight_logs',
  'supplement_logs',
  'training_days',
  'daily_checkins',
] as const;
export type SyncTableName = (typeof SYNC_TABLES)[number];
export const syncTables = {
  food_logs: foodLogs,
  water_logs: waterLogs,
  goal_plans: goalPlans,
  food_templates: foodTemplates,
  weight_logs: weightLogs,
  supplement_logs: supplementLogs,
  training_days: trainingDays,
  daily_checkins: dailyCheckins,
};
export type UserGoals = typeof userGoals.$inferSelect;
export type NewUserGoals = typeof userGoals.$inferInsert;
export type WaterLog = typeof waterLogs.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type NewWaterLog = typeof waterLogs.$inferInsert;
export type NewFoodLog = typeof foodLogs.$inferInsert;
export type GoalPlan = typeof goalPlans.$inferSelect;
export type FoodTemplate = typeof foodTemplates.$inferSelect;
