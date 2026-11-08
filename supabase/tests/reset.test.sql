-- TEST DATABASE ONLY. Run after rls.test.sql. Never run against a hosted database.
\set ON_ERROR_STOP on

create temporary table reset_seed (data jsonb);
insert into reset_seed values (jsonb_build_object(
  'id', '10000000-0000-4000-8000-0000000000d0', 'title', 'Demo', 'is_demo', true,
  'goal_meters', 3000, 'stake_lamports', 100000000,
  'starts_at', now() - interval '5 minutes', 'ends_at', now() + interval '2 days',
  'funding_cutoff', now() + interval '2 days', 'sync_cutoff', now() + interval '2 days 1 hour'));

do $$ begin
  assert not has_function_privilege('anon', 'public.reset_app_data(jsonb,boolean)', 'execute');
  assert not has_function_privilege('authenticated', 'public.reset_app_data(jsonb,boolean)', 'execute');
  assert has_function_privilege('service_role', 'public.reset_app_data(jsonb,boolean)', 'execute');
end $$;

-- A failed seed insert rolls the wipe back, including profiles and tokens.
do $$ begin
  begin
    perform public.reset_app_data('{"id":"10000000-0000-4000-8000-0000000000d0","title":"Demo","is_demo":true}', false);
    raise exception 'invalid seed unexpectedly succeeded';
  exception when not_null_violation then null;
  end;
  assert (select count(*) from public.pacts) = 2, 'failed reset must preserve pacts';
  assert (select count(*) from public.profiles) = 3, 'failed reset must preserve profiles';
  assert (select count(*) from public.strava_tokens) = 2, 'failed reset must preserve tokens';
  assert (select count(*) from public.groups) = 1, 'failed reset must preserve community groups';
end $$;

select public.reset_app_data((select data from reset_seed), true);
do $$ begin
  assert (select count(*) from public.pacts) = 1;
  assert (select title from public.pacts) = 'Demo';
  assert (select count(*) from public.memberships) = 0;
  assert (select count(*) from public.activity_checks) = 0;
  assert (select count(*) from public.profiles) = 3, 'keepAccounts must retain profiles';
  assert (select count(*) from public.strava_tokens) = 2, 'keepAccounts must retain connections';
  assert (select count(*) from public.groups) = 1, 'pact-only reset must retain community groups';
end $$;

-- Populate every dependent ledger table so the full wipe exercises foreign keys too.
insert into public.memberships (pact_id, user_id) values
  ('10000000-0000-4000-8000-0000000000d0', '00000000-0000-0000-0000-00000000000a');
insert into public.deposits values ('test-fixture', '10000000-0000-4000-8000-0000000000d0', '00000000-0000-0000-0000-00000000000a', 100000000, now());
insert into public.activity_checks (pact_id,user_id,strava_activity_id,verdict,result) values
  ('10000000-0000-4000-8000-0000000000d0','00000000-0000-0000-0000-00000000000a',1,'accepted','{}');
insert into public.sync_errors (pact_id,user_id,kind,message) values
  ('10000000-0000-4000-8000-0000000000d0','00000000-0000-0000-0000-00000000000a','test','fixture');
insert into public.settlements (pact_id,plan) values ('10000000-0000-4000-8000-0000000000d0','{}');
insert into public.payouts (pact_id,participant_id,wallet,lamports,kind) values
  ('10000000-0000-4000-8000-0000000000d0','00000000-0000-0000-0000-00000000000a','test-wallet',100000000,'refund');

select public.reset_app_data((select data from reset_seed), false);
do $$ begin
  assert (select count(*) from public.pacts) = 1;
  assert (select count(*) from public.profiles) = 0;
  assert (select count(*) from public.strava_tokens) = 0;
  assert (select count(*) from public.payouts) = 0;
  assert (select count(*) from public.settlements) = 0;
  assert (select count(*) from public.deposits) = 0;
  assert (select count(*) from public.activity_checks) = 0;
  assert (select count(*) from public.sync_errors) = 0;
  assert (select count(*) from public.memberships) = 0;
  assert (select count(*) from public.messages) = 0;
  assert (select count(*) from public.group_members) = 0;
  assert (select count(*) from public.groups) = 0;
  assert (select count(*) from auth.users) = 3, 'Auth deletion is handled by the admin API, not this SQL function';
end $$;
\echo 'Reset tests passed'
