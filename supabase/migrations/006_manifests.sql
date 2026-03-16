-- Migration 006: Flight Manifests table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dtyookuqyedklhaqjciw/sql

create table if not exists public.manifests (
  id                  uuid primary key default gen_random_uuid(),
  flight_number       text not null,
  aircraft_reg        text not null,
  flight_date         date not null,
  pic                 text,
  sic                 text,
  customer            text,
  hobbs_start         numeric(8,1),
  hobbs_end           numeric(8,1),
  total_flight_time   numeric(6,1),
  legs                jsonb default '[]'::jsonb,
  eng1_start          numeric(8,1),
  eng2_start          numeric(8,1),
  cyc1_start          integer,
  cyc2_start          integer,
  landings_start      integer,
  fuel_end_lbs        numeric(7,1),
  fuel_end_left_lbs   numeric(7,1),
  fuel_end_right_lbs  numeric(7,1),
  status              text default 'complete',
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Index for quick lookup by flight number or date
create index if not exists manifests_flight_number_idx on public.manifests(flight_number);
create index if not exists manifests_flight_date_idx   on public.manifests(flight_date desc);
create index if not exists manifests_aircraft_reg_idx  on public.manifests(aircraft_reg);

-- RLS: authenticated users only
alter table public.manifests enable row level security;
create policy "Authenticated users can read manifests"
  on public.manifests for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert manifests"
  on public.manifests for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update manifests"
  on public.manifests for update using (auth.role() = 'authenticated');
