-- FitTracker v2. Back up and verify the existing database before applying.
BEGIN;
CREATE TABLE IF NOT EXISTS public.user_goals (id text PRIMARY KEY DEFAULT 'default_user', protein_goal integer, water_goal integer, calories_goal integer);
CREATE TABLE IF NOT EXISTS public.food_logs (id text PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200), protein_g numeric(10,2) CHECK (protein_g >= 0), calories_kcal numeric(10,2) CHECK (calories_kcal >= 0), carb_g numeric(10,2) CHECK (carb_g >= 0), fat_g numeric(10,2) CHECK (fat_g >= 0), fiber_g numeric(10,2) CHECK (fiber_g >= 0), saturated_fat_g numeric(10,2) CHECK (saturated_fat_g >= 0), sodium_mg numeric(10,2) CHECK (sodium_mg >= 0), entry_method text NOT NULL DEFAULT 'manual', meal_window text NOT NULL DEFAULT 'lunch', image_uri text, date_key text NOT NULL, owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.water_logs (id text PRIMARY KEY, amount_ml integer NOT NULL CHECK(amount_ml>0), date_key text NOT NULL, owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
-- Immediately retire ALL legacy policies. Ownerless rows remain quarantined; no public claim API.
DO $$ DECLARE p record; t text; BEGIN
  FOREACH t IN ARRAY ARRAY['user_goals','food_logs','water_logs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_server_updated_at ON public.%I',t,t);
  END LOOP;
END $$;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS operation_id uuid;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS occurred_at timestamptz;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
UPDATE public.food_logs SET occurred_at=created_at WHERE occurred_at IS NULL;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS operation_id uuid;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS occurred_at timestamptz;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp();
UPDATE public.water_logs SET occurred_at=created_at WHERE occurred_at IS NULL;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS protein_g numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN protein_g DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN protein_g TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS calories_kcal numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN calories_kcal DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN calories_kcal TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS carb_g numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN carb_g DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN carb_g TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS fat_g numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN fat_g DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN fat_g TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS fiber_g numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN fiber_g DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN fiber_g TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS saturated_fat_g numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN saturated_fat_g DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN saturated_fat_g TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS sodium_mg numeric(10,2);
ALTER TABLE public.food_logs ALTER COLUMN sodium_mg DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN sodium_mg TYPE numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS meal_window text NOT NULL DEFAULT 'lunch';
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS image_uri text;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS nutrition_source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS input_channel text NOT NULL DEFAULT 'text';
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS is_estimate boolean NOT NULL DEFAULT false;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS nutrient_sources text;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS portion_amount numeric(10,2);
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS portion_unit text;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS template_id text;
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'water';
ALTER TABLE public.water_logs ADD COLUMN IF NOT EXISTS food_log_id text;

CREATE TABLE IF NOT EXISTS public.goal_plans (id text PRIMARY KEY, effective_from text NOT NULL, protein_goal numeric(10,2) NOT NULL CHECK(protein_goal>0),water_goal numeric(10,2) NOT NULL CHECK(water_goal>0),calories_goal numeric(10,2) NOT NULL CHECK(calories_goal>0),carb_goal numeric(10,2),fat_goal numeric(10,2),fiber_goal numeric(10,2),sodium_limit numeric(10,2),saturated_fat_limit numeric(10,2),creatine_goal numeric(10,2),source text NOT NULL,replaces_id text,replaces_revision bigint NOT NULL DEFAULT 0,owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.food_templates (id text PRIMARY KEY,beverage_ml integer CHECK(beverage_ml>0),name text NOT NULL,protein_g numeric(10,2) CHECK (protein_g >= 0), calories_kcal numeric(10,2) CHECK (calories_kcal >= 0), carb_g numeric(10,2) CHECK (carb_g >= 0), fat_g numeric(10,2) CHECK (fat_g >= 0), fiber_g numeric(10,2) CHECK (fiber_g >= 0), saturated_fat_g numeric(10,2) CHECK (saturated_fat_g >= 0), sodium_mg numeric(10,2) CHECK (sodium_mg >= 0),portion_amount numeric(10,2) NOT NULL CHECK(portion_amount>0),portion_unit text NOT NULL,nutrition_source text NOT NULL,is_estimate boolean NOT NULL DEFAULT false,nutrient_sources text,owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.weight_logs (id text PRIMARY KEY,weight_kg numeric(10,2) NOT NULL CHECK(weight_kg>0 AND weight_kg<=1000),date_key text NOT NULL,occurred_at timestamptz,time_zone text NOT NULL,owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.supplement_logs (id text PRIMARY KEY,supplement text NOT NULL CHECK(supplement='creatine'),dose_g numeric(10,2) NOT NULL CHECK(dose_g>=0 AND dose_g<=100),date_key text NOT NULL,owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.training_days (id text PRIMARY KEY,date_key text NOT NULL,duration_min numeric(10,2) CHECK(duration_min>0 AND duration_min<=1440),note text NOT NULL CHECK(length(note)<=300),owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.daily_checkins (id text PRIMARY KEY,date_key text NOT NULL,confirmed boolean NOT NULL DEFAULT false,food_signature text NOT NULL,context text NOT NULL CHECK(length(context)<=300),owner_id uuid REFERENCES auth.users(id), revision bigint NOT NULL DEFAULT 0, operation_id uuid, group_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, server_updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.fit_sync_receipts (owner_id uuid NOT NULL REFERENCES auth.users(id), operation_id uuid NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,operation_id));
CREATE TABLE IF NOT EXISTS public.fit_ai_usage (owner_id uuid NOT NULL REFERENCES auth.users(id), day date NOT NULL, requests integer NOT NULL DEFAULT 0, PRIMARY KEY(owner_id,day));
ALTER TABLE public.fit_sync_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fit_ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fit_sync_receipts,public.fit_ai_usage FROM anon,authenticated;
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['food_logs','water_logs','goal_plans','food_templates','weight_logs','supplement_logs','training_days','daily_checkins'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
    EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING (owner_id=(SELECT auth.uid()))',t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(owner_id,server_updated_at,id)',t || '_owner_cursor',t);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS food_owner_day ON public.food_logs(owner_id,date_key);
CREATE INDEX IF NOT EXISTS water_owner_day ON public.water_logs(owner_id,date_key);
CREATE INDEX IF NOT EXISTS goals_owner_day ON public.goal_plans(owner_id,effective_from,revision);
CREATE INDEX IF NOT EXISTS food_owner_group ON public.food_logs(owner_id,group_id);
CREATE INDEX IF NOT EXISTS water_owner_group ON public.water_logs(owner_id,group_id);
CREATE UNIQUE INDEX IF NOT EXISTS checkin_owner_day ON public.daily_checkins(owner_id,date_key);
CREATE UNIQUE INDEX IF NOT EXISTS training_owner_day ON public.training_days(owner_id,date_key);
CREATE UNIQUE INDEX IF NOT EXISTS water_owner_food ON public.water_logs(owner_id,food_log_id);

CREATE OR REPLACE FUNCTION public.fit_validate_v2() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE data jsonb:=to_jsonb(NEW); k text; v numeric; d text;
BEGIN
  IF NEW.owner_id IS NULL THEN RAISE EXCEPTION 'Owner required'; END IF;
  IF NEW.id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN RAISE EXCEPTION 'UUID required'; END IF;
  d:=coalesce(data->>'date_key',data->>'effective_from');
  IF d IS NOT NULL AND (d !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(d::date,'YYYY-MM-DD')<>d) THEN RAISE EXCEPTION 'Invalid date'; END IF;
  FOREACH k IN ARRAY ARRAY['protein_g','calories_kcal','carb_g','fat_g','fiber_g','saturated_fat_g','sodium_mg','protein_goal','calories_goal','water_goal','carb_goal','fat_goal','fiber_goal','sodium_limit','saturated_fat_limit','creatine_goal'] LOOP
    IF data->>k IS NOT NULL THEN
      v:=(data->>k)::numeric;
      IF v<0 OR v>99999999 OR v::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid nutrient'; END IF;
    END IF;
  END LOOP;
  IF (data->>'saturated_fat_g')::numeric > (data->>'fat_g')::numeric THEN RAISE EXCEPTION 'Invalid saturated fat'; END IF;
  IF data ? 'name' AND (length(btrim(data->>'name')) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'Invalid name'; END IF;
  IF data ? 'portion_amount' AND data->>'portion_amount' IS NOT NULL AND ((data->>'portion_amount')::numeric<=0 OR data->>'portion_unit' NOT IN ('g','ml','portion')) THEN RAISE EXCEPTION 'Invalid portion'; END IF;
  IF data ? 'nutrition_source' AND data->>'nutrition_source' NOT IN ('manual','label','food_table','ai') THEN RAISE EXCEPTION 'Invalid source'; END IF;
  IF data ? 'input_channel' AND data->>'input_channel' NOT IN ('text','image') THEN RAISE EXCEPTION 'Invalid channel'; END IF;
  IF data ? 'meal_window' AND data->>'meal_window' NOT IN ('breakfast','lunch','dinner','snack') THEN RAISE EXCEPTION 'Invalid window'; END IF;
  IF data ? 'nutrient_sources' AND data->>'nutrient_sources' IS NOT NULL THEN
    IF jsonb_typeof((data->>'nutrient_sources')::jsonb)<>'object' THEN RAISE EXCEPTION 'Invalid provenance'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_each_text((data->>'nutrient_sources')::jsonb) s WHERE s.key NOT IN ('proteinG','caloriesKcal','carbG','fatG','fiberG','saturatedFatG','sodiumMg') OR s.value NOT IN ('manual','label','food_table','ai')) THEN RAISE EXCEPTION 'Invalid provenance'; END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['food_logs','water_logs','goal_plans','food_templates','weight_logs','supplement_logs','training_days','daily_checkins'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS validate_v2 ON public.%I',t);
    EXECUTE format('CREATE TRIGGER validate_v2 BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fit_validate_v2()',t);
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.fit_schema_v2() RETURNS integer LANGUAGE sql SET search_path='' AS $$ SELECT 2 $$;
REVOKE ALL ON FUNCTION public.fit_schema_v2() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fit_schema_v2() TO authenticated;

-- All writes go through revision checks; legacy clients have no table write grants.
CREATE OR REPLACE FUNCTION public.fit_mutate_v2(p_operation_id uuid,p_changes jsonb,p_client_version integer DEFAULT 2)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); receipt jsonb; change jsonb; t text; r jsonb; previous jsonb; plan jsonb;
  records jsonb:='[]'; conflicts jsonb:='[]'; expected bigint; next_revision bigint; columns text; updates text; gid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_client_version IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Update required'; END IF;
  IF p_operation_id IS NULL OR p_changes IS NULL OR jsonb_typeof(p_changes)<>'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'Invalid operation'; END IF;
  IF jsonb_array_length(p_changes)=2 AND (SELECT count(DISTINCT c->>'table') FROM jsonb_array_elements(p_changes) c WHERE c->>'table' IN ('food_logs','water_logs') AND c->'row'->>'group_id' IS NOT NULL)<>2 THEN RAISE EXCEPTION 'Only linked pairs may be batched'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
  SELECT result INTO receipt FROM public.fit_sync_receipts WHERE owner_id=uid AND operation_id=p_operation_id;
  IF FOUND THEN RETURN receipt; END IF;
  -- Validate every member before writing any member of a linked group.
  FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    t:=change->>'table'; r:=change->'row'; expected:=(change->>'expectedRevision')::bigint;
    IF t NOT IN ('food_logs','water_logs','goal_plans','food_templates','weight_logs','supplement_logs','training_days','daily_checkins') OR r->>'id' IS NULL OR expected IS NULL THEN RAISE EXCEPTION 'Invalid entity'; END IF;
    IF EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=format('public.%I',t)::regclass AND a.attnum>0 AND NOT a.attisdropped AND a.attname NOT IN ('server_updated_at','owner_id','revision','operation_id') AND NOT (r ? a.attname)) THEN RAISE EXCEPTION 'Incomplete v2 record; update client'; END IF;
    EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1',t) INTO previous USING r->>'id';
    IF previous IS NOT NULL AND (previous->>'owner_id')::uuid IS DISTINCT FROM uid THEN RAISE EXCEPTION 'ID unavailable' USING ERRCODE='42501'; END IF;
    IF coalesce((previous->>'revision')::bigint,0)<>expected THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('table',t,'localId',r->>'id','row',previous)); END IF;
    IF t='goal_plans' THEN
      SELECT to_jsonb(g) INTO plan FROM public.goal_plans g WHERE g.owner_id=uid AND g.effective_from=r->>'effective_from' ORDER BY g.revision DESC LIMIT 1;
      IF previous IS NOT NULL OR (plan IS NOT NULL AND (r->>'replaces_id' IS DISTINCT FROM plan->>'id' OR coalesce((r->>'replaces_revision')::bigint,0)<>(plan->>'revision')::bigint)) OR (plan IS NULL AND r->>'replaces_id' IS NOT NULL) THEN
        conflicts:=conflicts||jsonb_build_array(jsonb_build_object('table',t,'localId',r->>'id','row',coalesce(plan,previous)));
      END IF;
    END IF;
    IF t IN ('daily_checkins','training_days') THEN
      EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE owner_id=$1 AND date_key=$2',t) INTO plan USING uid,r->>'date_key';
      IF plan IS NOT NULL AND plan->>'id' IS DISTINCT FROM r->>'id' THEN conflicts:=conflicts||jsonb_build_array(jsonb_build_object('table',t,'localId',r->>'id','row',plan)); END IF;
    END IF;
    IF previous->>'group_id' IS NOT NULL AND previous->>'group_id' IS DISTINCT FROM r->>'group_id' THEN RAISE EXCEPTION 'Linked group cannot be detached'; END IF;
    gid:=(r->>'group_id')::uuid;
    IF gid IS NOT NULL THEN
      IF (t='food_logs' AND r->>'id'<>gid::text) OR (t='water_logs' AND r->>'food_log_id' IS DISTINCT FROM gid::text) THEN RAISE EXCEPTION 'Invalid linked group'; END IF;
      IF t NOT IN ('food_logs','water_logs') OR jsonb_array_length(p_changes)<>2 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_changes) c WHERE c->>'table'<>t AND c->'row'->>'group_id'=gid::text) THEN RAISE EXCEPTION 'Incomplete linked group'; END IF;
    END IF;
    IF t='water_logs' AND r->>'food_log_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_changes) c WHERE c->>'table'='food_logs' AND c->'row'->>'id'=r->>'food_log_id' AND (c->'row'->>'deleted_at' IS NULL OR c->'row'->>'deleted_at' IS NOT DISTINCT FROM r->>'deleted_at')) THEN RAISE EXCEPTION 'Invalid food link'; END IF;
  END LOOP;
  IF jsonb_array_length(conflicts)>0 THEN
    conflicts:='[]';
    FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
      t:=change->>'table';r:=change->'row';
      IF t='goal_plans' THEN
        SELECT to_jsonb(g) INTO previous FROM public.goal_plans g WHERE g.owner_id=uid AND g.effective_from=r->>'effective_from' ORDER BY g.revision DESC LIMIT 1;
      ELSIF t IN ('daily_checkins','training_days') THEN
        EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE owner_id=$1 AND date_key=$2',t) INTO previous USING uid,r->>'date_key';
      ELSE
        EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1 AND owner_id=$2',t) INTO previous USING r->>'id',uid;
      END IF;
      conflicts:=conflicts||jsonb_build_array(jsonb_build_object('table',t,'localId',r->>'id','row',previous));
    END LOOP;
    receipt:=jsonb_build_object('ok',false,'conflicts',conflicts);
  ELSE
    FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
      t:=change->>'table';r:=change->'row';next_revision:=(change->>'expectedRevision')::bigint+1;
      IF t='goal_plans' THEN SELECT coalesce(max(revision),0)+1 INTO next_revision FROM public.goal_plans WHERE owner_id=uid AND effective_from=r->>'effective_from'; END IF;
      r:=r || jsonb_build_object('owner_id',uid,'revision',next_revision,'operation_id',p_operation_id,'server_updated_at',clock_timestamp());
      -- Only physical table columns are accepted. Protected fields above always come from the server.
      SELECT string_agg(format('%I',a.attname),',' ORDER BY a.attnum),string_agg(format('%1$I=EXCLUDED.%1$I',a.attname),',' ORDER BY a.attnum) FILTER(WHERE a.attname<>'id')
        INTO columns,updates FROM pg_attribute a WHERE a.attrelid=format('public.%I',t)::regclass AND a.attnum>0 AND NOT a.attisdropped;
      EXECUTE format('INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I,$1) ON CONFLICT(id) DO UPDATE SET %3$s RETURNING to_jsonb(%1$I.*)',t,columns,updates) INTO previous USING r;
      records:=records||jsonb_build_array(jsonb_build_object('table',t,'row',previous));
    END LOOP;
    receipt:=jsonb_build_object('ok',true,'records',records);
  END IF;
  INSERT INTO public.fit_sync_receipts(owner_id,operation_id,result) VALUES(uid,p_operation_id,receipt);
  RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.fit_mutate_v2(uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fit_mutate_v2(uuid,jsonb,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.fit_page_v2(p_table text,p_after_time timestamptz,p_after_id text,p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; uid uuid:=auth.uid(); BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_table IS NULL OR p_table NOT IN ('food_logs','water_logs','goal_plans','food_templates','weight_logs','supplement_logs','training_days','daily_checkins') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid page'; END IF;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY server_updated_at,id),''[]'') FROM (SELECT * FROM public.%I WHERE owner_id=$1 AND (server_updated_at,id)>($2,$3) ORDER BY server_updated_at,id LIMIT $4) x',p_table)
  INTO result USING uid,p_after_time,p_after_id,p_limit;
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.fit_group_v2(p_group uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(x),'[]') FROM (
    SELECT jsonb_build_object('table','food_logs','row',to_jsonb(f)) x FROM public.food_logs f WHERE f.owner_id=(SELECT auth.uid()) AND f.group_id=p_group
    UNION ALL SELECT jsonb_build_object('table','water_logs','row',to_jsonb(w)) FROM public.water_logs w WHERE w.owner_id=(SELECT auth.uid()) AND w.group_id=p_group
  ) members
$$;
REVOKE ALL ON FUNCTION public.fit_page_v2(text,timestamptz,text,integer),public.fit_group_v2(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fit_page_v2(text,timestamptz,text,integer),public.fit_group_v2(uuid) TO authenticated;

-- Atomic daily allowance, called only by the authenticated Edge Function using its service role.
CREATE OR REPLACE FUNCTION public.fit_use_ai(p_owner uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; BEGIN
  INSERT INTO public.fit_ai_usage(owner_id,day,requests) VALUES(p_owner,(now() AT TIME ZONE 'UTC')::date,1)
  ON CONFLICT(owner_id,day) DO UPDATE SET requests=public.fit_ai_usage.requests+1 WHERE public.fit_ai_usage.requests<30 RETURNING requests INTO n;
  RETURN n IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.fit_use_ai(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fit_use_ai(uuid) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
