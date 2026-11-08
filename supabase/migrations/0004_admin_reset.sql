-- Replaces the old fixed demo title. Old seeded variants are omitted from app lists.
update public.pacts set title = 'Demo' where id = '10000000-0000-4000-8000-0000000000d0';

-- Only the service role can call this. Schema, RLS, functions, and project settings are preserved.
create function public.reset_app_data(p_demo jsonb, p_keep_accounts boolean default false)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_demo ->> 'id' is distinct from '10000000-0000-4000-8000-0000000000d0'
     or p_demo ->> 'title' is distinct from 'Demo'
     or (p_demo ->> 'is_demo')::boolean is distinct from true then
    raise exception 'Expected the single Demo seed' using errcode = '22023';
  end if;

  if p_keep_accounts then
    truncate public.activity_checks, public.sync_errors, public.deposits, public.memberships,
      public.payouts, public.settlements, public.pacts restart identity;
  else
    truncate public.messages, public.group_members, public.groups,
      public.activity_checks, public.sync_errors, public.deposits, public.memberships,
      public.payouts, public.settlements, public.pacts, public.strava_tokens, public.profiles restart identity;
  end if;

  insert into public.pacts (id, title, visibility, is_demo, goal_meters, stake_lamports,
    starts_at, ends_at, funding_cutoff, sync_cutoff)
  values ((p_demo ->> 'id')::uuid, 'Demo', 'public', true,
    (p_demo ->> 'goal_meters')::integer, (p_demo ->> 'stake_lamports')::bigint,
    (p_demo ->> 'starts_at')::timestamptz, (p_demo ->> 'ends_at')::timestamptz,
    (p_demo ->> 'funding_cutoff')::timestamptz, (p_demo ->> 'sync_cutoff')::timestamptz);
end;
$$;

revoke execute on function public.reset_app_data(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.reset_app_data(jsonb, boolean) to service_role;
