-- MovePact schema. All writes go through server routes using the service role.
-- Clients (anon / authenticated) only ever SELECT, and only their own rows.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email ~* '@student\.ubc\.ca$'),
  display_name text,
  wallet_address text unique,
  strava_athlete_id bigint unique,
  created_at timestamptz not null default now()
);

create table public.strava_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null
);

create table public.pacts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  host_id uuid references public.profiles (id),
  visibility text not null default 'invite' check (visibility in ('public', 'invite')),
  invite_code text unique,
  is_demo boolean not null default false,
  goal_meters integer not null check (goal_meters > 0),
  stake_lamports bigint not null check (stake_lamports > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  funding_cutoff timestamptz not null,
  sync_cutoff timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (funding_cutoff <= ends_at),
  check (sync_cutoff >= ends_at),
  check (visibility = 'public' or invite_code is not null)
);

create table public.memberships (
  pact_id uuid not null references public.pacts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  mode text not null default 'staked' check (mode in ('staked', 'practice')),
  left_at timestamptz,
  show_in_standings boolean not null default false,
  primary key (pact_id, user_id)
);

create table public.deposits (
  signature text primary key,
  pact_id uuid not null,
  user_id uuid not null,
  lamports bigint not null check (lamports > 0),
  confirmed_at timestamptz not null,
  foreign key (pact_id, user_id) references public.memberships (pact_id, user_id) on delete cascade,
  unique (pact_id, user_id)
);

create table public.activity_checks (
  pact_id uuid not null,
  user_id uuid not null,
  strava_activity_id bigint not null,
  verdict text not null,
  reasons text[] not null default '{}',
  accepted_meters integer not null default 0 check (accepted_meters >= 0),
  result jsonb not null,
  synced_at timestamptz not null default now(),
  primary key (pact_id, user_id, strava_activity_id),
  foreign key (pact_id, user_id) references public.memberships (pact_id, user_id) on delete cascade
);

create table public.sync_errors (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pact_id uuid not null references public.pacts (id) on delete cascade,
  kind text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.settlements (
  pact_id uuid primary key references public.pacts (id),
  plan jsonb not null,
  status text not null default 'planned' check (status in ('planned', 'paying', 'done')),
  created_at timestamptz not null default now()
);

create table public.payouts (
  id bigint generated always as identity primary key,
  pact_id uuid not null references public.settlements (pact_id),
  participant_id uuid not null references public.profiles (id),
  wallet text not null,
  lamports bigint not null check (lamports > 0),
  kind text not null check (kind in ('payout', 'refund', 'return_unfunded', 'leave_refund')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'confirmed')),
  signature text,
  last_valid_block_height bigint,
  unique (pact_id, participant_id)
);

-- A profile is created with every auth user; the email check rejects non-UBC addresses at the database too.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security: on everywhere. No write policies exist, so clients cannot write.
alter table public.profiles enable row level security;
alter table public.strava_tokens enable row level security;
alter table public.pacts enable row level security;
alter table public.memberships enable row level security;
alter table public.deposits enable row level security;
alter table public.activity_checks enable row level security;
alter table public.sync_errors enable row level security;
alter table public.settlements enable row level security;
alter table public.payouts enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy memberships_select_own on public.memberships
  for select to authenticated using (user_id = auth.uid());

-- Defined after memberships so the policy can see it. security definer avoids a memberships/pacts policy loop.
create function public.is_member(p_pact_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships where pact_id = p_pact_id and user_id = auth.uid());
$$;

create policy pacts_select_visible on public.pacts
  for select to authenticated using (visibility = 'public' or public.is_member(id));

create policy deposits_select_own on public.deposits
  for select to authenticated using (user_id = auth.uid());

create policy activity_checks_select_own on public.activity_checks
  for select to authenticated using (user_id = auth.uid());

create policy sync_errors_select_own on public.sync_errors
  for select to authenticated using (user_id = auth.uid());

create policy payouts_select_own on public.payouts
  for select to authenticated using (participant_id = auth.uid());

-- Table privileges: clients get SELECT on the tables they have policies for, nothing else.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.pacts, public.memberships, public.deposits,
  public.activity_checks, public.sync_errors, public.payouts to authenticated;
