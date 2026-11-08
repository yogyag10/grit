-- TEST STUB ONLY. Mimics the parts of Supabase the migration relies on, so RLS can be tested on plain Postgres.
-- Real Supabase provides all of this already.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated;
-- Supabase grants everything to anon/authenticated by default; the migration must revoke what it doesn't want.
alter default privileges in schema public grant all on tables to anon, authenticated;
