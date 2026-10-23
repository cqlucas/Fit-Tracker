/**
 * Script SQL idempotente de inicialização das tabelas no Supabase (BYOK).
 *
 * Como o PostgREST (usado pela anon_key) não permite executar DDL (CREATE TABLE)
 * diretamente via REST por razões de segurança, o usuário pode colar este script
 * diretamente no SQL Editor do seu projeto Supabase pessoal com 1 clique.
 */

export const SUPABASE_SETUP_SQL = `-- =============================================================================
-- FIT-TRACKER: Sincronização na Nuvem Opcional (BYOK Supabase)
-- =============================================================================
-- Cole este script completo no SQL Editor do seu projeto Supabase e clique em "Run".
-- Ele cria com segurança as tabelas, índices, triggers e políticas de acesso (RLS).

-- 1. Tabela de Metas e Preferências do Usuário
CREATE TABLE IF NOT EXISTS public.user_goals (
  id TEXT PRIMARY KEY DEFAULT 'default_user',
  protein_goal INTEGER NOT NULL DEFAULT 160,
  water_goal INTEGER NOT NULL DEFAULT 3000,
  calories_goal INTEGER NOT NULL DEFAULT 2200,
  language TEXT NOT NULL DEFAULT 'pt',
  preferred_ai_provider TEXT NOT NULL DEFAULT 'gemini',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Registros de Hidratação
CREATE TABLE IF NOT EXISTS public.water_logs (
  id TEXT PRIMARY KEY,
  amount_ml INTEGER NOT NULL,
  date_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Registros de Refeições e Alimentos
CREATE TABLE IF NOT EXISTS public.food_logs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protein_g REAL NOT NULL,
  calories_kcal INTEGER NOT NULL,
  meal_window TEXT NOT NULL DEFAULT 'lunch',
  entry_method TEXT NOT NULL DEFAULT 'manual',
  image_uri TEXT,
  date_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices para Otimização de Consultas e Sincronização Incremental
CREATE INDEX IF NOT EXISTS idx_water_logs_date_key ON public.water_logs (date_key);
CREATE INDEX IF NOT EXISTS idx_water_logs_server_updated_at ON public.water_logs (server_updated_at);
CREATE INDEX IF NOT EXISTS idx_food_logs_date_key ON public.food_logs (date_key);
CREATE INDEX IF NOT EXISTS idx_food_logs_server_updated_at ON public.food_logs (server_updated_at);

-- 5. Função e Triggers para Atualização Automática de server_updated_at
CREATE OR REPLACE FUNCTION public.set_server_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.server_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_goals_server_updated ON public.user_goals;
CREATE TRIGGER tr_user_goals_server_updated
  BEFORE INSERT OR UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

DROP TRIGGER IF EXISTS tr_water_logs_server_updated ON public.water_logs;
CREATE TRIGGER tr_water_logs_server_updated
  BEFORE INSERT OR UPDATE ON public.water_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

DROP TRIGGER IF EXISTS tr_food_logs_server_updated ON public.food_logs;
CREATE TRIGGER tr_food_logs_server_updated
  BEFORE INSERT OR UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_server_updated_at();

-- 6. Habilitação de RLS e Políticas de Acesso Total para anon_key Pessoal
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.user_goals;
CREATE POLICY "Allow all access" ON public.user_goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.water_logs;
CREATE POLICY "Allow all access" ON public.water_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.food_logs;
CREATE POLICY "Allow all access" ON public.food_logs FOR ALL USING (true) WITH CHECK (true);
`;
