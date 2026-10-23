-- ============================================================================
-- Fit-Tracker — Schema Remoto (Supabase / Postgres)
-- ============================================================================
-- Cole este script completo no SQL Editor do seu projeto Supabase e clique em "Run".
-- Ele é 100% idempotente: cria ou atualiza as tabelas, colunas, triggers e políticas RLS.

-- 1. Função de Timestamp do Servidor
CREATE OR REPLACE FUNCTION public.set_server_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.server_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabela de Metas do Usuário
CREATE TABLE IF NOT EXISTS public.user_goals (
  id                    TEXT PRIMARY KEY DEFAULT 'default_user',
  protein_goal          INTEGER NOT NULL DEFAULT 160,
  water_goal            INTEGER NOT NULL DEFAULT 3000,
  calories_goal         INTEGER NOT NULL DEFAULT 2200,
  language              TEXT NOT NULL DEFAULT 'pt',
  preferred_ai_provider TEXT NOT NULL DEFAULT 'gemini',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  server_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Registros de Água
CREATE TABLE IF NOT EXISTS public.water_logs (
  id                TEXT PRIMARY KEY,
  amount_ml         INTEGER NOT NULL CHECK (amount_ml > 0),
  date_key          TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Registros de Refeições
CREATE TABLE IF NOT EXISTS public.food_logs (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  protein_g         REAL NOT NULL CHECK (protein_g >= 0),
  calories_kcal     INTEGER NOT NULL CHECK (calories_kcal >= 0),
  entry_method      TEXT NOT NULL DEFAULT 'manual' CHECK (entry_method IN ('manual', 'image')),
  meal_window       TEXT NOT NULL DEFAULT 'lunch' CHECK (meal_window IN ('breakfast', 'lunch', 'dinner', 'snack')),
  image_uri         TEXT,
  date_key          TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Atualização de Bancos Já Criados (Garante adição de novas colunas)
ALTER TABLE public.user_goals ADD COLUMN IF NOT EXISTS preferred_ai_provider TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS image_uri TEXT;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS meal_window TEXT NOT NULL DEFAULT 'lunch';

-- Se as colunas de ID ou date_key eram de tipos restritos em versões anteriores
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.water_logs ALTER COLUMN id TYPE TEXT;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.food_logs ALTER COLUMN id TYPE TEXT;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.water_logs ALTER COLUMN date_key TYPE TEXT;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.food_logs ALTER COLUMN date_key TYPE TEXT;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 6. Triggers e Índices de Cursor de Sincronização
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_goals', 'water_logs', 'food_logs'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_server_updated_at ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_server_updated_at BEFORE INSERT OR UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at()', t);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%1$s_server_updated_at ON public.%1$s (server_updated_at)', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_water_logs_date_key ON public.water_logs (date_key);
CREATE INDEX IF NOT EXISTS idx_food_logs_date_key  ON public.food_logs (date_key);

-- 7. Row Level Security (RLS) para anon_key
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all" ON public.user_goals;
DROP POLICY IF EXISTS "owner_all" ON public.water_logs;
DROP POLICY IF EXISTS "owner_all" ON public.food_logs;

DROP POLICY IF EXISTS "Allow all access" ON public.user_goals;
CREATE POLICY "Allow all access" ON public.user_goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.water_logs;
CREATE POLICY "Allow all access" ON public.water_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.food_logs;
CREATE POLICY "Allow all access" ON public.food_logs FOR ALL USING (true) WITH CHECK (true);

-- 8. Recarrega o Schema Cache do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
