import NetInfo from '@react-native-community/netinfo';
import { and, eq, sql } from 'drizzle-orm';
import { addDatabaseChangeListener } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import {
  SYNC_TABLES,
  foodLogs,
  userGoals,
  waterLogs,
  type FoodLog,
  type SyncTableName,
  type UserGoals,
  type WaterLog,
} from '@/db/schema';

import { isSupabaseConfigured, supabase } from './supabase';

/**
 * SyncEngine — Local-First, Last-Write-Wins por `updated_at`.
 *
 *  PUSH: SELECT ... WHERE is_synced = 0 → supabase.upsert(onConflict: id)
 *        → UPDATE is_synced = 1 WHERE id = ? AND updated_at = <valor enviado>
 *        (a guarda em `updated_at` evita marcar como synced uma edição feita DURANTE o request).
 *
 *  PULL: SELECT * FROM remote WHERE server_updated_at > cursor
 *        → INSERT ... ON CONFLICT(id) DO UPDATE ... WHERE excluded.updated_at > local.updated_at
 *        Cursor em `server_updated_at` (relógio do Postgres) → imune a clock skew entre devices.
 *
 *  GATILHOS: boot, volta da conexão (NetInfo), app em foreground (AppState) e
 *            qualquer escrita local nas tabelas sincronizáveis (sqlite update hook, com debounce).
 */

const PUSH_BATCH_SIZE = 200;
const PULL_BATCH_SIZE = 500;
const LOCAL_CHANGE_DEBOUNCE_MS = 1500;
const CURSOR_KEY = (table: SyncTableName) => `sync:cursor:${table}`;
const EPOCH = new Date(0).toISOString();

type RemoteRow = Record<string, unknown> & { id: string; updated_at: string; server_updated_at: string };

interface TableAdapter {
  name: SyncTableName;
  /** Lê até PUSH_BATCH_SIZE linhas sujas e devolve payload remoto + chave de confirmação. */
  selectDirty(): Promise<{ payload: Record<string, unknown>[]; acks: Ack[] }>;
  /** Marca como sincronizado somente se `updated_at` não mudou desde a leitura. */
  markSynced(acks: Ack[]): void;
  /** Aplica linhas remotas com LWW. */
  applyRemote(rows: RemoteRow[]): void;
  hasDirty(): boolean;
}

interface Ack {
  id: string;
  updatedAt: string;
}

export interface SyncResult {
  ok: boolean;
  pushed: Record<SyncTableName, number>;
  pulled: Record<SyncTableName, number>;
  error?: string;
  finishedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamento local (camelCase + is_synced) ⇄ remoto (snake_case, sem is_synced)
// ─────────────────────────────────────────────────────────────────────────────

const goalsToRemote = (r: UserGoals) => ({
  id: r.id,
  protein_goal: r.proteinGoal,
  water_goal: r.waterGoal,
  calories_goal: r.caloriesGoal,
  language: r.language,
  updated_at: r.updatedAt,
});

const waterToRemote = (r: WaterLog) => ({
  id: r.id,
  amount_ml: r.amountMl,
  date_key: r.dateKey,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  deleted_at: r.deletedAt,
});

const foodToRemote = (r: FoodLog) => ({
  id: r.id,
  name: r.name,
  protein_g: r.proteinG,
  calories_kcal: r.caloriesKcal,
  entry_method: r.entryMethod,
  meal_window: r.mealWindow,
  date_key: r.dateKey,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  deleted_at: r.deletedAt,
});

const str = (v: unknown) => String(v);
const num = (v: unknown) => Number(v);

/** Normaliza timestamptz do Postgres ('...+00:00') para o mesmo formato ISO usado localmente ('...Z'). */
const iso = (v: unknown) => new Date(String(v)).toISOString();
const isoOrNull = (v: unknown) => (v == null ? null : iso(v));

// ─────────────────────────────────────────────────────────────────────────────
// Adapters por tabela (explícitos = type-safe com Drizzle)
// ─────────────────────────────────────────────────────────────────────────────

const adapters: TableAdapter[] = [
  {
    name: 'user_goals',
    async selectDirty() {
      const rows = await db.select().from(userGoals).where(eq(userGoals.isSynced, false)).limit(PUSH_BATCH_SIZE);
      return { payload: rows.map(goalsToRemote), acks: rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt })) };
    },
    markSynced(acks) {
      db.transaction((tx) => {
        for (const a of acks) {
          tx.update(userGoals)
            .set({ isSynced: true })
            .where(and(eq(userGoals.id, a.id), eq(userGoals.updatedAt, a.updatedAt)))
            .run();
        }
      });
    },
    applyRemote(rows) {
      db.transaction((tx) => {
        for (const r of rows) {
          const values = {
            id: str(r.id),
            proteinGoal: num(r.protein_goal),
            waterGoal: num(r.water_goal),
            caloriesGoal: num(r.calories_goal),
            language: r.language === 'en' ? ('en' as const) : ('pt' as const),
            updatedAt: iso(r.updated_at),
            isSynced: true,
          };
          tx.insert(userGoals)
            .values(values)
            .onConflictDoUpdate({
              target: userGoals.id,
              set: values,
              setWhere: sql`excluded.updated_at > ${userGoals.updatedAt}`,
            })
            .run();
        }
      });
    },
    hasDirty() {
      return !!db.select({ id: userGoals.id }).from(userGoals).where(eq(userGoals.isSynced, false)).limit(1).get();
    },
  },
  {
    name: 'water_logs',
    async selectDirty() {
      const rows = await db.select().from(waterLogs).where(eq(waterLogs.isSynced, false)).limit(PUSH_BATCH_SIZE);
      return { payload: rows.map(waterToRemote), acks: rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt })) };
    },
    markSynced(acks) {
      db.transaction((tx) => {
        for (const a of acks) {
          tx.update(waterLogs)
            .set({ isSynced: true })
            .where(and(eq(waterLogs.id, a.id), eq(waterLogs.updatedAt, a.updatedAt)))
            .run();
        }
      });
    },
    applyRemote(rows) {
      db.transaction((tx) => {
        for (const r of rows) {
          const values = {
            id: str(r.id),
            amountMl: num(r.amount_ml),
            dateKey: str(r.date_key),
            createdAt: iso(r.created_at),
            updatedAt: iso(r.updated_at),
            deletedAt: isoOrNull(r.deleted_at),
            isSynced: true,
          };
          tx.insert(waterLogs)
            .values(values)
            .onConflictDoUpdate({
              target: waterLogs.id,
              set: values,
              setWhere: sql`excluded.updated_at > ${waterLogs.updatedAt}`,
            })
            .run();
        }
      });
    },
    hasDirty() {
      return !!db.select({ id: waterLogs.id }).from(waterLogs).where(eq(waterLogs.isSynced, false)).limit(1).get();
    },
  },
  {
    name: 'food_logs',
    async selectDirty() {
      const rows = await db.select().from(foodLogs).where(eq(foodLogs.isSynced, false)).limit(PUSH_BATCH_SIZE);
      return { payload: rows.map(foodToRemote), acks: rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt })) };
    },
    markSynced(acks) {
      db.transaction((tx) => {
        for (const a of acks) {
          tx.update(foodLogs)
            .set({ isSynced: true })
            .where(and(eq(foodLogs.id, a.id), eq(foodLogs.updatedAt, a.updatedAt)))
            .run();
        }
      });
    },
    applyRemote(rows) {
      db.transaction((tx) => {
        for (const r of rows) {
          const values = {
            id: str(r.id),
            name: str(r.name),
            proteinG: num(r.protein_g),
            caloriesKcal: num(r.calories_kcal),
            entryMethod: r.entry_method === 'image' ? ('image' as const) : ('manual' as const),
            mealWindow: (['breakfast', 'lunch', 'dinner', 'snack'].includes(String(r.meal_window))
              ? r.meal_window
              : 'lunch') as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            dateKey: str(r.date_key),
            createdAt: iso(r.created_at),
            updatedAt: iso(r.updated_at),
            deletedAt: isoOrNull(r.deleted_at),
            isSynced: true,
          };
          tx.insert(foodLogs)
            .values(values)
            .onConflictDoUpdate({
              target: foodLogs.id,
              set: values,
              setWhere: sql`excluded.updated_at > ${foodLogs.updatedAt}`,
            })
            .run();
        }
      });
    },
    hasDirty() {
      return !!db.select({ id: foodLogs.id }).from(foodLogs).where(eq(foodLogs.isSynced, false)).limit(1).get();
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Push / Pull
// ─────────────────────────────────────────────────────────────────────────────

async function pushTable(adapter: TableAdapter): Promise<number> {
  if (!supabase) return 0;
  let total = 0;

  // Loop até esvaziar a fila (lotes de PUSH_BATCH_SIZE).
  while (true) {
    const { payload, acks } = await adapter.selectDirty();
    if (payload.length === 0) break;

    const { error } = await supabase.from(adapter.name).upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`[push:${adapter.name}] ${error.message}`);

    adapter.markSynced(acks);
    total += payload.length;
    if (payload.length < PUSH_BATCH_SIZE) break;
  }
  return total;
}

async function pullTable(adapter: TableAdapter): Promise<number> {
  if (!supabase) return 0;
  let total = 0;
  let cursor = (await Storage.getItem(CURSOR_KEY(adapter.name))) ?? EPOCH;

  while (true) {
    const { data, error } = await supabase
      .from(adapter.name)
      .select('*')
      .gt('server_updated_at', cursor)
      .order('server_updated_at', { ascending: true })
      .limit(PULL_BATCH_SIZE);

    if (error) throw new Error(`[pull:${adapter.name}] ${error.message}`);
    const rows = (data ?? []) as RemoteRow[];
    if (rows.length === 0) break;

    adapter.applyRemote(rows);
    cursor = rows[rows.length - 1].server_updated_at;
    await Storage.setItem(CURSOR_KEY(adapter.name), cursor);
    total += rows.length;
    if (rows.length < PULL_BATCH_SIZE) break;
  }
  return total;
}

const emptyCounts = (): Record<SyncTableName, number> =>
  Object.fromEntries(SYNC_TABLES.map((t) => [t, 0])) as Record<SyncTableName, number>;

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncState {
  isSyncing: boolean;
  isOnline: boolean;
  isEnabled: boolean;
  lastResult: SyncResult | null;
}

export type Listener = (state: SyncState) => void;

class SyncEngine {
  private inFlight: Promise<SyncResult> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: (() => void)[] = [];
  private isOnline = false;
  private lastResult: SyncResult | null = null;
  private listeners = new Set<Listener>();

  get isEnabled() {
    return isSupabaseConfigured;
  }

  get online() {
    return this.isOnline;
  }

  getState(): SyncState {
    return {
      isSyncing: !!this.inFlight,
      isOnline: this.isOnline,
      isEnabled: this.isEnabled,
      lastResult: this.lastResult,
    };
  }

  /** Idempotente. Chame uma vez no root layout. */
  start(): void {
    if (!this.isEnabled) {
      if (__DEV__) console.info('[sync] Supabase não configurado — rodando 100% offline.');
      this.emit();
      return;
    }
    if (this.subscriptions.length > 0) return;

    const netSub = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = !!state.isConnected && state.isInternetReachable !== false;
      this.emit();
      if (this.isOnline && !wasOnline) this.requestSync(0);
    });

    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') this.requestSync(0);
    });

    const dbSub = addDatabaseChangeListener(({ tableName }) => {
      // Escritas feitas pelo próprio sync (markSynced/applyRemote) são ignoradas aqui;
      // o pós-sync verifica se sobrou algo sujo.
      if (this.inFlight) return;
      if ((SYNC_TABLES as readonly string[]).includes(tableName)) {
        this.requestSync(LOCAL_CHANGE_DEBOUNCE_MS);
      }
    });

    this.subscriptions.push(netSub, () => appStateSub.remove(), () => dbSub.remove());

    NetInfo.fetch().then((state) => {
      this.isOnline = !!state.isConnected && state.isInternetReachable !== false;
      this.emit();
      this.requestSync(0);
    });
  }

  stop(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.subscriptions = [];
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }

  /** Agenda um sync com debounce (coalesce múltiplas escritas rápidas). */
  requestSync(delayMs = LOCAL_CHANGE_DEBOUNCE_MS): void {
    if (!this.isEnabled) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.syncNow();
    }, delayMs);
  }

  /** Executa push → pull. Se já houver um sync em andamento, reaproveita a mesma Promise (mutex). */
  syncNow(): Promise<SyncResult> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.run().finally(() => {
      this.inFlight = null;
      this.emit();
      // Usuário escreveu algo enquanto o sync rodava? Agenda outra rodada.
      if (this.lastResult?.ok && adapters.some((a) => a.hasDirty())) this.requestSync(0);
    });
    this.emit();
    return this.inFlight;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** Útil para "logout"/reset: força pull completo no próximo sync. */
  async resetCursors(): Promise<void> {
    await Promise.all(SYNC_TABLES.map((t) => Storage.removeItem(CURSOR_KEY(t))));
  }

  private async run(): Promise<SyncResult> {
    const pushed = emptyCounts();
    const pulled = emptyCounts();

    if (!supabase || !this.isOnline) {
      return this.finish({ ok: false, pushed, pulled, error: 'offline', finishedAt: new Date().toISOString() });
    }

    try {
      // Push primeiro: garante que edições locais cheguem antes de o pull comparar timestamps.
      for (const adapter of adapters) pushed[adapter.name] = await pushTable(adapter);
      for (const adapter of adapters) pulled[adapter.name] = await pullTable(adapter);
      return this.finish({ ok: true, pushed, pulled, finishedAt: new Date().toISOString() });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.warn('[sync] falhou:', message);
      // Nada é perdido: linhas continuam com is_synced = 0 e serão reenviadas no próximo gatilho.
      return this.finish({ ok: false, pushed, pulled, error: message, finishedAt: new Date().toISOString() });
    }
  }

  private finish(result: SyncResult): SyncResult {
    this.lastResult = result;
    return result;
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }
}

export const syncEngine = new SyncEngine();
