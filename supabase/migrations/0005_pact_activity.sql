-- What kind of activity a pact counts. Existing pacts stay runs.
alter table public.pacts
  add column activity text not null default 'run'
  check (activity in ('run', 'trail_run', 'walk', 'hike', 'ride', 'mountain_bike', 'swim', 'row', 'sail'));
