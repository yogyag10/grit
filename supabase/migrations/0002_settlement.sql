-- Settlement support: atomic plan + payouts insert, and a claim token for payout idempotency.

-- Set when a run claims a payout (pending -> sending). Doubles as the claim token, and lets a later run
-- release a claim that crashed before anything was signed or broadcast.
alter table public.payouts add column claimed_at timestamptz;

-- Inserts the settlement and all its payouts in one transaction. Returns false if this pact already has
-- a settlement, so concurrent runs can never create two plans.
create function public.create_settlement(p_pact_id uuid, p_plan jsonb, p_payouts jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into public.settlements (pact_id, plan, status)
  values (p_pact_id, p_plan, case when jsonb_array_length(p_payouts) = 0 then 'done' else 'paying' end)
  on conflict (pact_id) do nothing;
  if not found then
    return false;
  end if;

  insert into public.payouts (pact_id, participant_id, wallet, lamports, kind)
  select p_pact_id, (x ->> 'participant_id')::uuid, x ->> 'wallet', (x ->> 'lamports')::bigint, x ->> 'kind'
  from jsonb_array_elements(p_payouts) as x;
  return true;
end;
$$;

revoke execute on function public.create_settlement(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_settlement(uuid, jsonb, jsonb) to service_role;
