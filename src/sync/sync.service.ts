import NetInfo from '@react-native-community/netinfo';
import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq } from 'drizzle-orm';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import {
  DEFAULT_USER_ID,
  SYNC_TABLES,
  foodLogs,
  userGoals,
  waterLogs,
  type SyncTableName,
} from '@/db/schema';
import {
  apiKeysService,
  registerCredentialsChangeListener,
} from '@/services/api-keys.service';
import { getDynamicSupabaseClient } from './supabase';

export interface SyncResult {
  ok: boolean;
  pushed: Record<SyncTableName, number>;
  pulled: Record<SyncTableName, number>;
  error?: string;
  finishedAt: string;
}

export type SchemaVerificationResult =
  | { status: 'ready' }
  | { status: 'missing_tables'; table: string }
  | { status: 'invalid_credentials'; message: string };

export interface SyncState {
  isSyncing: boolean;
  isOnline: boolean;
  isEnabled: boolean;
  lastResult: SyncResult | null;
}

export type Listener = (state: SyncState) => void;

const PUSH_BATCH_SIZE = 200;
const LOCAL_CHANGE_DEBOUNCE_MS = 1500;
const EPOCH = new Date(0).toISOString();

const emptyCounts = (): Record<SyncTableName, number> =>
  Object.fromEntries(SYNC_TABLES.map((t) => [t, 0])) as Record<SyncTableName, number>;

/**
 * Valida se as credenciais fornecidas possuem acesso ao Supabase e se
 * as 3 tabelas requeridas existem e estão prontas para sincronização.
 */
export async function verifySupabaseSchema(
  client?: SupabaseClient | null,
): Promise<SchemaVerificationResult> {
  const targetClient = client ?? (await getDynamicSupabaseClient());

  if (!targetClient) {
    return {
      status: 'invalid_credentials',
      message: 'Credenciais do Supabase não configuradas.',
    };
  }

  for (const table of SYNC_TABLES) {
    try {
      const { error } = await targetClient.from(table).select('id').limit(1);

      if (error) {
        const errorMsg = (error.message || '').toLowerCase();
        const code = error.code || '';

        // Tabela inexistente no Postgres / PostgREST
        if (
          code === '42P01' ||
          code === 'PGRST205' ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('relation') ||
          errorMsg.includes('could not find the table')
        ) {
          return { status: 'missing_tables', table };
        }

        // Erro de autenticação, JWT inválido ou chave anônima incorreta
        return {
          status: 'invalid_credentials',
          message: error.message || 'Erro de autenticação no Supabase.',
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'invalid_credentials', message };
    }
  }

  return { status: 'ready' };
}

/**
 * Motor central de Sincronização Bidirecional (Push & Pull).
 * Mantém o app 100% Local-First.
 */
export async function syncWithSupabase(options?: {
  forceFullSync?: boolean;
}): Promise<SyncResult> {
  const pushed = emptyCounts();
  const pulled = emptyCounts();
  const finishedAt = new Date().toISOString();

  // 1. Guarda Inicial: conexão de rede
  const netState = await NetInfo.fetch();
  const isOnline = !!netState.isConnected && netState.isInternetReachable !== false;
  if (!isOnline) {
    return { ok: false, pushed, pulled, error: 'offline', finishedAt };
  }

  // 2. Guarda Inicial: cliente Supabase dinâmico
  const client = await getDynamicSupabaseClient();
  if (!client) {
    return { ok: false, pushed, pulled, error: 'unconfigured', finishedAt };
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // FASE 1: Resolução Inteligente de Metas (user_goals)
    // ─────────────────────────────────────────────────────────────────────────
    const localGoal = db
      .select()
      .from(userGoals)
      .where(eq(userGoals.id, DEFAULT_USER_ID))
      .get();

    const { data: remoteGoalData, error: remoteGoalErr } = await client
      .from('user_goals')
      .select('*')
      .eq('id', DEFAULT_USER_ID)
      .maybeSingle();

    if (remoteGoalErr) {
      // Se a tabela ainda não existir, aborte informando o motivo
      const msg = remoteGoalErr.message?.toLowerCase() || '';
      if (msg.includes('does not exist') || remoteGoalErr.code === '42P01' || remoteGoalErr.code === 'PGRST205') {
        return { ok: false, pushed, pulled, error: 'missing_tables', finishedAt };
      }
      throw new Error(`[sync:user_goals] ${remoteGoalErr.message}`);
    }

    if (remoteGoalData) {
      // Metas existem no Supabase
      const remoteUpdatedAtTime = new Date(remoteGoalData.updated_at).getTime();
      const localUpdatedAtTime = localGoal ? new Date(localGoal.updatedAt).getTime() : 0;
      const isLocalEpoch =
        !localGoal ||
        localGoal.updatedAt === EPOCH ||
        localGoal.updatedAt === new Date(0).toISOString();

      if (isLocalEpoch || remoteUpdatedAtTime > localUpdatedAtTime) {
        // Remoto é mais novo ou local ainda estava no seed padrão de fábrica -> PULL
        const newValues = {
          id: DEFAULT_USER_ID,
          proteinGoal: Number(remoteGoalData.protein_goal),
          waterGoal: Number(remoteGoalData.water_goal),
          caloriesGoal: Number(remoteGoalData.calories_goal),
          language: remoteGoalData.language === 'en' ? ('en' as const) : ('pt' as const),
          preferredAiProvider:
            remoteGoalData.preferred_ai_provider === 'groq' ? ('groq' as const) : ('gemini' as const),
          updatedAt: new Date(remoteGoalData.updated_at).toISOString(),
          isSynced: true,
        };

        db.transaction((tx) => {
          if (localGoal) {
            tx.update(userGoals).set(newValues).where(eq(userGoals.id, DEFAULT_USER_ID)).run();
          } else {
            tx.insert(userGoals).values(newValues).run();
          }
        });
        pulled.user_goals = 1;
      } else if (localGoal && !localGoal.isSynced && localUpdatedAtTime >= remoteUpdatedAtTime) {
        // Local é mais novo e está sujo -> PUSH
        const { error: pushErr } = await client.from('user_goals').upsert(
          {
            id: DEFAULT_USER_ID,
            protein_goal: localGoal.proteinGoal,
            water_goal: localGoal.waterGoal,
            calories_goal: localGoal.caloriesGoal,
            language: localGoal.language,
            preferred_ai_provider: localGoal.preferredAiProvider,
            updated_at: localGoal.updatedAt,
          },
          { onConflict: 'id' },
        );
        if (pushErr) throw new Error(`[push:user_goals] ${pushErr.message}`);

        db.update(userGoals)
          .set({ isSynced: true })
          .where(and(eq(userGoals.id, DEFAULT_USER_ID), eq(userGoals.updatedAt, localGoal.updatedAt)))
          .run();
        pushed.user_goals = 1;
      }
    } else if (localGoal) {
      // Remoto ainda não existe -> PUSH inicial das metas locais
      const { error: pushErr } = await client.from('user_goals').upsert(
        {
          id: DEFAULT_USER_ID,
          protein_goal: localGoal.proteinGoal,
          water_goal: localGoal.waterGoal,
          calories_goal: localGoal.caloriesGoal,
          language: localGoal.language,
          preferred_ai_provider: localGoal.preferredAiProvider,
          updated_at: localGoal.updatedAt,
        },
        { onConflict: 'id' },
      );
      if (pushErr) throw new Error(`[push:user_goals:initial] ${pushErr.message}`);

      db.update(userGoals)
        .set({ isSynced: true })
        .where(eq(userGoals.id, DEFAULT_USER_ID))
        .run();
      pushed.user_goals = 1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FASE 2: PUSH (SQLite Local -> Supabase)
    // ─────────────────────────────────────────────────────────────────────────

    // 2.1 Push Water Logs
    while (true) {
      const dirtyWater = db
        .select()
        .from(waterLogs)
        .where(eq(waterLogs.isSynced, false))
        .limit(PUSH_BATCH_SIZE)
        .all();

      if (dirtyWater.length === 0) break;

      const payload = dirtyWater.map((w) => ({
        id: w.id,
        amount_ml: w.amountMl,
        date_key: w.dateKey,
        created_at: w.createdAt,
        updated_at: w.updatedAt,
        deleted_at: w.deletedAt,
      }));

      const { error: pushWaterErr } = await client.from('water_logs').upsert(payload, { onConflict: 'id' });
      if (pushWaterErr) throw new Error(`[push:water_logs] ${pushWaterErr.message}`);

      db.transaction((tx) => {
        for (const w of dirtyWater) {
          tx.update(waterLogs)
            .set({ isSynced: true })
            .where(and(eq(waterLogs.id, w.id), eq(waterLogs.updatedAt, w.updatedAt)))
            .run();
        }
      });

      pushed.water_logs += dirtyWater.length;
      if (dirtyWater.length < PUSH_BATCH_SIZE) break;
    }

    // 2.2 Push Food Logs
    while (true) {
      const dirtyFood = db
        .select()
        .from(foodLogs)
        .where(eq(foodLogs.isSynced, false))
        .limit(PUSH_BATCH_SIZE)
        .all();

      if (dirtyFood.length === 0) break;

      const payload = dirtyFood.map((f) => ({
        id: f.id,
        name: f.name,
        protein_g: f.proteinG,
        calories_kcal: f.caloriesKcal,
        meal_window: f.mealWindow,
        entry_method: f.entryMethod,
        image_uri: f.imageUri ?? null,
        date_key: f.dateKey,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
        deleted_at: f.deletedAt,
      }));

      const { error: pushFoodErr } = await client.from('food_logs').upsert(payload, { onConflict: 'id' });
      if (pushFoodErr) throw new Error(`[push:food_logs] ${pushFoodErr.message}`);

      db.transaction((tx) => {
        for (const f of dirtyFood) {
          tx.update(foodLogs)
            .set({ isSynced: true })
            .where(and(eq(foodLogs.id, f.id), eq(foodLogs.updatedAt, f.updatedAt)))
            .run();
        }
      });

      pushed.food_logs += dirtyFood.length;
      if (dirtyFood.length < PUSH_BATCH_SIZE) break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FASE 3: PULL (Supabase -> SQLite Local — Recuperação Completa)
    // ─────────────────────────────────────────────────────────────────────────
    const lastSyncTimestamp = options?.forceFullSync
      ? null
      : await apiKeysService.getLastSyncTimestamp();

    // 3.1 Pull Water Logs
    let waterQuery = client.from('water_logs').select('*');
    if (lastSyncTimestamp) {
      // Margem de segurança de 60s para imprecisões de relógio entre dispositivos
      const safetyTime = new Date(new Date(lastSyncTimestamp).getTime() - 60000).toISOString();
      waterQuery = waterQuery.gte('updated_at', safetyTime);
    }

    const { data: remoteWaterRows, error: pullWaterErr } = await waterQuery;
    if (pullWaterErr) throw new Error(`[pull:water_logs] ${pullWaterErr.message}`);

    if (remoteWaterRows && remoteWaterRows.length > 0) {
      db.transaction((tx) => {
        for (const r of remoteWaterRows) {
          const local = tx.select().from(waterLogs).where(eq(waterLogs.id, String(r.id))).get();

          const remoteValues = {
            id: String(r.id),
            amountMl: Number(r.amount_ml),
            dateKey: String(r.date_key),
            createdAt: new Date(String(r.created_at)).toISOString(),
            updatedAt: new Date(String(r.updated_at)).toISOString(),
            deletedAt: r.deleted_at ? new Date(String(r.deleted_at)).toISOString() : null,
            isSynced: true,
          };

          if (!local) {
            tx.insert(waterLogs).values(remoteValues).run();
            pulled.water_logs++;
          } else {
            const isRemoteNewer =
              new Date(remoteValues.updatedAt).getTime() > new Date(local.updatedAt).getTime();
            if (isRemoteNewer || local.isSynced) {
              tx.update(waterLogs).set(remoteValues).where(eq(waterLogs.id, String(r.id))).run();
              pulled.water_logs++;
            }
          }
        }
      });
    }

    // 3.2 Pull Food Logs
    let foodQuery = client.from('food_logs').select('*');
    if (lastSyncTimestamp) {
      const safetyTime = new Date(new Date(lastSyncTimestamp).getTime() - 60000).toISOString();
      foodQuery = foodQuery.gte('updated_at', safetyTime);
    }

    const { data: remoteFoodRows, error: pullFoodErr } = await foodQuery;
    if (pullFoodErr) throw new Error(`[pull:food_logs] ${pullFoodErr.message}`);

    if (remoteFoodRows && remoteFoodRows.length > 0) {
      db.transaction((tx) => {
        for (const r of remoteFoodRows) {
          const local = tx.select().from(foodLogs).where(eq(foodLogs.id, String(r.id))).get();

          const remoteValues = {
            id: String(r.id),
            name: String(r.name),
            proteinG: Number(r.protein_g),
            caloriesKcal: Number(r.calories_kcal),
            mealWindow: (['breakfast', 'lunch', 'dinner', 'snack'].includes(String(r.meal_window))
              ? r.meal_window
              : 'lunch') as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            entryMethod: r.entry_method === 'image' ? ('image' as const) : ('manual' as const),
            imageUri: r.image_uri ? String(r.image_uri) : null,
            dateKey: String(r.date_key),
            createdAt: new Date(String(r.created_at)).toISOString(),
            updatedAt: new Date(String(r.updated_at)).toISOString(),
            deletedAt: r.deleted_at ? new Date(String(r.deleted_at)).toISOString() : null,
            isSynced: true,
          };

          if (!local) {
            tx.insert(foodLogs).values(remoteValues).run();
            pulled.food_logs++;
          } else {
            const isRemoteNewer =
              new Date(remoteValues.updatedAt).getTime() > new Date(local.updatedAt).getTime();
            if (isRemoteNewer || local.isSynced) {
              tx.update(foodLogs).set(remoteValues).where(eq(foodLogs.id, String(r.id))).run();
              pulled.food_logs++;
            }
          }
        }
      });
    }

    // 4. Salva o timestamp de sync com sucesso no SecureStore
    await apiKeysService.saveLastSyncTimestamp(finishedAt);

    return {
      ok: true,
      pushed,
      pulled,
      finishedAt,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn('[syncWithSupabase] Erro durante a sincronização:', message);
    return {
      ok: false,
      pushed,
      pulled,
      error: message,
      finishedAt,
    };
  }
}

/**
 * SyncEngine: Gerenciador de ciclo de vida e agendador de sincronização em segundo plano.
 */
class SyncEngine {
  private inFlight: Promise<SyncResult> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: (() => void)[] = [];
  private isOnline = false;
  private isLinked = false;
  private lastResult: SyncResult | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    registerCredentialsChangeListener(() => {
      void this.refreshEnabledStatus();
    });
  }

  get isEnabled(): boolean {
    return this.isLinked;
  }

  get online(): boolean {
    return this.isOnline;
  }

  getState(): SyncState {
    return {
      isSyncing: !!this.inFlight,
      isOnline: this.isOnline,
      isEnabled: this.isLinked,
      lastResult: this.lastResult,
    };
  }

  async refreshEnabledStatus(): Promise<void> {
    const client = await getDynamicSupabaseClient();
    const wasLinked = this.isLinked;
    this.isLinked = Boolean(client);

    if (this.isLinked !== wasLinked) {
      this.emit();
      if (this.isLinked && this.isOnline) {
        this.requestSync(0);
      }
    }
  }

  start(): void {
    if (this.subscriptions.length > 0) return;

    void this.refreshEnabledStatus();

    const netSub = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = !!state.isConnected && state.isInternetReachable !== false;
      this.emit();
      if (this.isOnline && !wasOnline && this.isLinked) {
        this.requestSync(0);
      }
    });

    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active' && this.isLinked) {
        this.requestSync(0);
      }
    });

    const dbSub = addDatabaseChangeListener(({ tableName }) => {
      if (this.inFlight) return;
      if (!this.isLinked) return;
      if ((SYNC_TABLES as readonly string[]).includes(tableName)) {
        this.requestSync(LOCAL_CHANGE_DEBOUNCE_MS);
      }
    });

    this.subscriptions.push(netSub, () => appStateSub.remove(), () => dbSub.remove());

    NetInfo.fetch().then((state) => {
      this.isOnline = !!state.isConnected && state.isInternetReachable !== false;
      this.emit();
      if (this.isOnline && this.isLinked) {
        this.requestSync(0);
      }
    });
  }

  stop(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  requestSync(delayMs = LOCAL_CHANGE_DEBOUNCE_MS): void {
    if (!this.isLinked) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.syncNow();
    }, delayMs);
  }

  syncNow(options?: { forceFullSync?: boolean }): Promise<SyncResult> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = syncWithSupabase(options).then((res) => {
      this.lastResult = res;
      return res;
    }).finally(() => {
      this.inFlight = null;
      this.emit();
    });
    this.emit();
    return this.inFlight;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }
}

export const syncEngine = new SyncEngine();
