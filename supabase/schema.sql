-- ============================================================================
-- Fit-Tracker — schema remoto (Supabase / Postgres)
-- Rode no SQL Editor do Supabase. Espelha o SQLite local, SEM `is_synced`,
-- e COM `server_updated_at` (relógio do servidor, usado como cursor do pull).
-- ============================================================================

create or replace function public.set_server_updated_at()
returns trigger language plpgsql as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

-- user_goals ------------------------------------------------------------------
create table if not exists public.user_goals (
  id                text primary key default 'default_user',
  protein_goal      integer not null default 160,
  water_goal        integer not null default 3000,
  calories_goal     integer not null default 2200,
  updated_at        timestamptz not null default now(),
  server_updated_at timestamptz not null default now()
);

-- water_logs ------------------------------------------------------------------
create table if not exists public.water_logs (
  id                uuid primary key,
  amount_ml         integer not null check (amount_ml > 0),
  date_key          date not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- food_logs -------------------------------------------------------------------
create table if not exists public.food_logs (
  id                uuid primary key,
  name              text not null,
  protein_g         real not null check (protein_g >= 0),
  calories_kcal     integer not null check (calories_kcal >= 0),
  entry_method      text not null default 'manual' check (entry_method in ('manual', 'image')),
  meal_window       text not null default 'lunch' check (meal_window in ('breakfast', 'lunch', 'dinner', 'snack')),
  date_key          date not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- Triggers + índices de cursor ------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['user_goals', 'water_logs', 'food_logs'] loop
    execute format('drop trigger if exists trg_%1$s_server_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_server_updated_at before insert or update on public.%1$s
       for each row execute function public.set_server_updated_at()', t);
    execute format(
      'create index if not exists idx_%1$s_server_updated_at on public.%1$s (server_updated_at)', t);
  end loop;
end $$;

create index if not exists idx_water_logs_date_key on public.water_logs (date_key);
create index if not exists idx_food_logs_date_key  on public.food_logs  (date_key);

-- RLS -------------------------------------------------------------------------
-- ⚠️ Políticas para app pessoal de 1 usuário (permite 'anon' e 'authenticated').
-- Se no futuro virar multiusuário com login: adicione `user_id uuid default auth.uid()`
-- e restrinja para `user_id = auth.uid()`.
alter table public.user_goals enable row level security;
alter table public.water_logs enable row level security;
alter table public.food_logs  enable row level security;

drop policy if exists "owner_all" on public.user_goals;
drop policy if exists "owner_all" on public.water_logs;
drop policy if exists "owner_all" on public.food_logs;

create policy "owner_all" on public.user_goals for all to anon, authenticated using (true) with check (true);
create policy "owner_all" on public.water_logs for all to anon, authenticated using (true) with check (true);
create policy "owner_all" on public.food_logs  for all to anon, authenticated using (true) with check (true);
