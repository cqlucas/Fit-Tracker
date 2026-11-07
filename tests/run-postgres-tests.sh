#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pg_bin="${PG_BIN_DIR:-/usr/lib/postgresql/18/bin}"
test_dir="$(mktemp -d /tmp/fittracker-pg-tests.XXXXXX)"
cleanup() { "$pg_bin/pg_ctl" -D "$test_dir/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$test_dir"; }
trap cleanup EXIT
mkdir "$test_dir/socket"
"$pg_bin/initdb" -D "$test_dir/data" -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$test_dir/data" -l "$test_dir/postgres.log" -o "-k $test_dir/socket -h '' -p 55440" start >/dev/null
export FITTRACKER_PG_TEST_SOCKET="$test_dir/socket"
export FITTRACKER_PG_TEST_PORT=55440
"$pg_bin/createdb" -h "$test_dir/socket" -p 55440 fittracker_v2_test
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_test -v ON_ERROR_STOP=1 -q -f tests/postgres-bootstrap.sql >/dev/null
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_test -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060001_fittracker_v2.sql >/dev/null 2>"$test_dir/migration.log" || { cat "$test_dir/migration.log"; exit 1; }
# Verify that reapplying the reference migration is harmless.
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_test -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060001_fittracker_v2.sql >/dev/null 2>"$test_dir/migration.log" || { cat "$test_dir/migration.log"; exit 1; }
"$pg_bin/createdb" -h "$test_dir/socket" -p 55440 fittracker_v2_legacy_test
sed '/^CREATE ROLE /d' tests/postgres-bootstrap.sql > "$test_dir/auth.sql"
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_legacy_test -v ON_ERROR_STOP=1 -q -f "$test_dir/auth.sql" >/dev/null
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_legacy_test -v ON_ERROR_STOP=1 -q -f tests/fixtures/legacy-remote.sql >/dev/null 2>"$test_dir/legacy.log"
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_legacy_test -v ON_ERROR_STOP=1 -q -c "INSERT INTO public.food_logs(id,name,protein_g,calories_kcal,date_key) VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Legacy',23.7,137,'2026-11-01'); GRANT SELECT,INSERT,UPDATE,DELETE ON public.food_logs TO anon,authenticated;" >/dev/null
"$pg_bin/psql" -h "$test_dir/socket" -p 55440 -d fittracker_v2_legacy_test -v ON_ERROR_STOP=1 -q -f supabase/migrations/202611060001_fittracker_v2.sql >/dev/null 2>"$test_dir/migration.log" || { cat "$test_dir/migration.log"; exit 1; }
TZ=America/Sao_Paulo node --test --test-isolation=none tests/postgres.test.cjs
