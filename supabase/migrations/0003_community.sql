-- Community: groups, group members and chat messages.
-- Server-only: row level security is on with no client policies, so only server routes (service role) can read or write.
-- A message with a null group_id belongs to the campus-wide chat.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '' check (char_length(description) <= 120),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  invite_code text unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (visibility = 'public' or invite_code is not null)
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  group_id uuid references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index messages_channel_idx on public.messages (group_id, id desc);
create index messages_user_recent_idx on public.messages (user_id, created_at desc);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;

revoke all on public.groups, public.group_members, public.messages from anon, authenticated;
