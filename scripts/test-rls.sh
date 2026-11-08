#!/usr/bin/env bash
# Applies the migrations to a throwaway Postgres container and runs supabase/tests/rls.test.sql.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="oathmile-rls-test"

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2

run_sql() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

run_sql < "$ROOT/supabase/tests/stub_supabase.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run_sql < "$f"; done
run_sql < "$ROOT/supabase/tests/rls.test.sql"
