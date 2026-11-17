#!/bin/bash
set -euo pipefail

export PGHOST=db PGUSER=postgres PGDATABASE=postgres PGPASSWORD="$POSTGRES_PASSWORD"

psql -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

for file in /supabase/migrations/*.sql; do
  name=$(basename "$file" .sql)
  version=${name%%_*}

  if [ -n "$(psql -tAc "select 1 from supabase_migrations.schema_migrations where version = '$version'")" ]; then
    continue
  fi

  echo "Applying $name"
  psql -v ON_ERROR_STOP=1 -q --single-transaction -f "$file"
  psql -v ON_ERROR_STOP=1 -q -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '${name#*_}')"
done

if [ "$(psql -tAc 'select count(*) from public.profiles')" = "0" ]; then
  echo "Loading seed"
  psql -v ON_ERROR_STOP=1 -q -f /supabase/seed.sql
fi

psql -q -c "notify pgrst, 'reload schema'"
echo "Database is ready"
