-- LOCAL DEV FIXTURE ONLY. Runs on `supabase db reset` against the local stack; never pushed to hosted.
-- Official and demo pacts for the real app come from scripts/seed-demo.ts (phase 5).
insert into public.pacts (id, title, visibility, invite_code, is_demo, goal_meters, stake_lamports,
                          starts_at, ends_at, funding_cutoff, sync_cutoff)
values (
  '00000000-0000-4000-8000-000000000001',
  'Local dev pact (fixture)',
  'public',
  null,
  true,
  3000,
  100000000,
  now() + interval '1 day',
  now() + interval '8 days',
  now() + interval '1 day',
  now() + interval '8 days 1 hour'
)
on conflict (id) do nothing;
