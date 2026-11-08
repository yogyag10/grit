-- RLS tests. Run after stub_supabase.sql and the migrations. Any failed assertion aborts with an error.
\set ON_ERROR_STOP on

-- Fixtures (as superuser, bypassing RLS): two students, one invite pact, one public pact.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@student.ubc.ca'),
  ('00000000-0000-0000-0000-00000000000b', 'b@student.ubc.ca');

insert into public.pacts (id, title, visibility, invite_code, goal_meters, stake_lamports, starts_at, ends_at, funding_cutoff, sync_cutoff)
values
  ('10000000-0000-0000-0000-000000000001', 'invite pact', 'invite', 'code1', 3000, 100000000, now(), now() + interval '1 day', now(), now() + interval '1 day 1 hour'),
  ('10000000-0000-0000-0000-000000000002', 'public pact', 'public', null, 3000, 100000000, now(), now() + interval '1 day', now(), now() + interval '1 day 1 hour');

insert into public.memberships (pact_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');

insert into public.activity_checks (pact_id, user_id, strava_activity_id, verdict, accepted_meters, result) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 1, 'accepted', 3000, '{}'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 2, 'accepted', 3000, '{}');

insert into public.strava_tokens (user_id, access_token, refresh_token, expires_at, scope) values
  ('00000000-0000-0000-0000-00000000000a', 'tok-a', 'ref-a', now(), 'read,activity:read_all'),
  ('00000000-0000-0000-0000-00000000000b', 'tok-b', 'ref-b', now(), 'read,activity:read_all');

-- The profile trigger fired for both users.
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'profile trigger should create one profile per auth user';
end $$;

-- Non-UBC emails are rejected at the database too.
do $$ begin
  begin
    insert into auth.users (email) values ('x@gmail.com');
    raise exception 'non-UBC email was accepted';
  exception when check_violation then null;
  end;
end $$;

-- Community constraints the app relies on.
do $$ begin
  begin
    insert into public.groups (name, visibility, created_by) values ('Private no code', 'private', '00000000-0000-0000-0000-00000000000a');
    raise exception 'a private group without an invite code was accepted';
  exception when check_violation then null;
  end;
  insert into public.groups (name, visibility, invite_code, created_by)
    values ('Test group', 'private', 'ABCD2345', '00000000-0000-0000-0000-00000000000a');
  begin
    insert into public.groups (name, visibility, invite_code, created_by)
      values ('Other group', 'private', 'ABCD2345', '00000000-0000-0000-0000-00000000000a');
    raise exception 'a duplicate invite code was accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.messages (user_id, body) values ('00000000-0000-0000-0000-00000000000a', repeat('x', 501));
    raise exception 'a 501 character message was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.messages (user_id, body) values ('00000000-0000-0000-0000-00000000000a', '');
    raise exception 'an empty message was accepted';
  exception when check_violation then null;
  end;
  insert into public.messages (user_id, body) values ('00000000-0000-0000-0000-00000000000a', 'hello campus');
  assert (select count(*) from public.messages where group_id is null) = 1, 'a campus message is stored with a null group';
end $$;

-- Act as user A.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$ begin
  assert (select count(*) from public.activity_checks) = 1, 'A must see exactly their own activity_checks';
  assert (select count(*) from public.activity_checks where user_id = '00000000-0000-0000-0000-00000000000b') = 0,
    'A must not read B activity_checks';
  assert (select count(*) from public.memberships where user_id = '00000000-0000-0000-0000-00000000000b') = 0,
    'A must not read B memberships';
  assert (select count(*) from public.profiles) = 1, 'A must see only their own profile';
  assert (select count(*) from public.pacts) = 2, 'A sees the public pact and the invite pact they belong to';
end $$;

-- strava_tokens: no privileges at all for clients, own row or not.
do $$ begin
  begin
    perform count(*) from public.strava_tokens;
    raise exception 'A could query strava_tokens';
  exception when insufficient_privilege then null;
  end;
end $$;

-- settlements are server-only too.
do $$ begin
  begin
    perform count(*) from public.settlements;
    raise exception 'A could query settlements';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Community data (private invite codes, group chats) is server-only: no direct reads or writes from a browser.
do $$ begin
  begin
    perform count(*) from public.groups;
    raise exception 'A could query groups';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.group_members;
    raise exception 'A could query group_members';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.messages;
    raise exception 'A could query messages';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.messages (user_id, body) values ('00000000-0000-0000-0000-00000000000a', 'hi');
    raise exception 'A could post a message directly';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Clients cannot write, even to their own rows.
do $$ begin
  begin
    update public.activity_checks set accepted_meters = 999999 where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'A could update activity_checks';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.deposits (signature, pact_id, user_id, lamports, confirmed_at)
    values ('fake', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 1, now());
    raise exception 'A could insert a deposit';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Act as a signed-in user who is in no pact: sees the public pact only.
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'c@student.ubc.ca');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);

do $$ begin
  assert (select count(*) from public.pacts) = 1, 'a non-member sees only the public pact';
  assert (select count(*) from public.pacts where invite_code is not null) = 0, 'a non-member never sees an invite code';
end $$;

-- Anonymous visitors see nothing.
reset role;
set role anon;
do $$ begin
  begin
    perform count(*) from public.pacts;
    raise exception 'anon could query pacts';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
\echo 'RLS tests passed'
