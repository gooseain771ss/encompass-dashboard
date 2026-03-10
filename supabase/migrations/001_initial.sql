-- ============================================================
-- Encompass Aviation Dashboard - Initial Schema
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type aircraft_type as enum ('phenom_100', 'pc12');
create type aircraft_status as enum ('available', 'in_flight', 'maintenance', 'aog');
create type pilot_status as enum ('staff', 'contractor', 'inactive');
create type quote_status as enum ('draft', 'sent', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid', 'declined', 'cancelled');
create type transaction_category as enum ('fuel', 'maintenance', 'crew', 'landing_fees', 'catering', 'insurance', 'hangar', 'navigation', 'ground_transport', 'other');
create type maintenance_type as enum ('100hr', '200hr', 'annual', 'hot_section', 'overhaul', 'ad', 'service_bulletin', 'other');
create type maintenance_status as enum ('upcoming', 'overdue', 'completed', 'deferred');
create type squawk_status as enum ('open', 'deferred', 'resolved');
create type broker_request_status as enum ('pending', 'bid_submitted', 'won', 'lost', 'passed');

-- ============================================================
-- AIRPORTS (ICAO cache)
-- ============================================================

create table airports (
  id uuid primary key default uuid_generate_v4(),
  icao text not null unique,
  iata text,
  name text not null,
  city text,
  state text,
  country text default 'US',
  latitude numeric(10, 6),
  longitude numeric(10, 6),
  elevation_ft integer,
  fuel_available boolean default true,
  fbo_name text,
  fbo_phone text,
  landing_fee numeric(10, 2),
  ramp_fee numeric(10, 2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_airports_icao on airports(icao);

-- ============================================================
-- CUSTOMERS
-- ============================================================

create table customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  total_trips integer default 0,
  total_revenue numeric(12, 2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_customers_email on customers(email);
create index idx_customers_name on customers(name);

-- ============================================================
-- AIRCRAFT
-- ============================================================

create table aircraft (
  id uuid primary key default uuid_generate_v4(),
  registration text not null unique,
  name text not null,
  aircraft_type aircraft_type not null,
  make text not null,
  model text not null,
  year integer,
  serial_number text,
  base_icao text references airports(icao),
  status aircraft_status default 'available',
  hourly_rate numeric(10, 2) not null,
  cruise_speed_ktas integer not null,  -- knots true airspeed
  max_pax integer not null,
  max_range_nm integer,
  -- Current hours/cycles
  airframe_hours numeric(10, 1) default 0,
  engine1_hours numeric(10, 1) default 0,
  engine2_hours numeric(10, 1) default 0,   -- null for single engine
  prop_hours numeric(10, 1) default 0,       -- PC-12 prop
  total_cycles integer default 0,
  -- Insurance & docs
  insurance_expiry date,
  annual_due date,
  -- Notes
  notes text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PILOTS
-- ============================================================

create table pilots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  first_name text not null,
  last_name text not null,
  email text unique,
  phone text,
  status pilot_status default 'staff',
  -- Certifications
  certificate_number text,
  atp_rated boolean default false,
  instrument_rated boolean default true,
  -- Aircraft qualifications (stored as array of aircraft IDs)
  qualified_aircraft uuid[],
  -- Rates
  daily_rate numeric(10, 2),
  -- Hours
  total_hours numeric(10, 1) default 0,
  pic_hours numeric(10, 1) default 0,
  -- Medical
  medical_class text,
  medical_expiry date,
  -- Notes
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_pilots_status on pilots(status);

-- ============================================================
-- QUOTES / TRIPS
-- ============================================================

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  quote_number text not null unique,  -- e.g. Q-2024-0001
  status quote_status default 'draft',
  
  -- Customer info
  customer_id uuid references customers(id),
  customer_name text,  -- denormalized for quick access
  customer_email text,
  customer_phone text,
  
  -- Trip details
  aircraft_id uuid references aircraft(id),
  origin_icao text not null,
  destination_icao text not null,
  departure_date date not null,
  departure_time time,
  return_date date,
  return_time time,
  pax_count integer default 1,
  is_round_trip boolean default false,
  is_empty_leg boolean default false,
  
  -- Calculated fields
  distance_nm numeric(10, 1),
  flight_time_hrs numeric(10, 2),
  
  -- Pricing breakdown
  base_rate numeric(10, 2),          -- hourly_rate * flight_time
  fuel_surcharge numeric(10, 2) default 0,
  airport_fees numeric(10, 2) default 0,
  pilot_cost numeric(10, 2) default 0,
  catering_cost numeric(10, 2) default 0,
  ground_transport numeric(10, 2) default 0,
  other_fees numeric(10, 2) default 0,
  discount_pct numeric(5, 2) default 0,  -- for empty leg discount
  discount_amount numeric(10, 2) default 0,
  total_price numeric(10, 2),
  
  -- Metadata
  notes text,
  internal_notes text,
  public_token text unique default encode(gen_random_bytes(16), 'hex'),  -- for customer portal
  sent_at timestamptz,
  accepted_at timestamptz,
  
  -- Broker
  broker_request_id uuid,
  
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_quotes_status on quotes(status);
create index idx_quotes_customer on quotes(customer_id);
create index idx_quotes_aircraft on quotes(aircraft_id);
create index idx_quotes_departure on quotes(departure_date);
create index idx_quotes_public_token on quotes(public_token);
create index idx_quotes_number on quotes(quote_number);

-- Auto-generate quote numbers
create sequence quote_number_seq start 1;

create or replace function generate_quote_number()
returns trigger as $$
begin
  if new.quote_number is null or new.quote_number = '' then
    new.quote_number := 'Q-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_quote_number
  before insert on quotes
  for each row execute function generate_quote_number();

-- ============================================================
-- LEGS (individual flight segments)
-- ============================================================

create table legs (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes(id) on delete cascade,
  leg_number integer not null default 1,
  
  origin_icao text not null,
  destination_icao text not null,
  departure_date date not null,
  departure_time time,
  
  distance_nm numeric(10, 1),
  flight_time_hrs numeric(10, 2),
  
  -- Actual times (filled in after completion)
  actual_departure timestamptz,
  actual_arrival timestamptz,
  actual_flight_time_hrs numeric(10, 2),
  
  hobbs_start numeric(10, 1),
  hobbs_end numeric(10, 1),
  
  fuel_uplift_gallons numeric(10, 1),
  fuel_cost numeric(10, 2),
  
  notes text,
  created_at timestamptz default now()
);

create index idx_legs_quote on legs(quote_id);

-- ============================================================
-- PILOT ASSIGNMENTS
-- ============================================================

create table pilot_assignments (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes(id) on delete cascade,
  pilot_id uuid references pilots(id),
  role text default 'pic',  -- 'pic' or 'sic'
  daily_rate numeric(10, 2),
  days_estimated numeric(5, 1),
  total_cost numeric(10, 2),
  confirmed boolean default false,
  notes text,
  created_at timestamptz default now()
);

create index idx_pilot_assignments_quote on pilot_assignments(quote_id);
create index idx_pilot_assignments_pilot on pilot_assignments(pilot_id);

-- ============================================================
-- FLIGHT LOGS (hours/cycles per trip)
-- ============================================================

create table flight_logs (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references quotes(id),
  leg_id uuid references legs(id),
  aircraft_id uuid references aircraft(id) not null,
  
  log_date date not null,
  origin_icao text,
  destination_icao text,
  
  hobbs_start numeric(10, 1),
  hobbs_end numeric(10, 1),
  flight_time_hrs numeric(10, 2),
  
  cycles integer default 1,
  
  engine1_hours_added numeric(10, 2),
  engine2_hours_added numeric(10, 2),
  airframe_hours_added numeric(10, 2),
  
  pic_pilot_id uuid references pilots(id),
  sic_pilot_id uuid references pilots(id),
  
  notes text,
  created_at timestamptz default now()
);

create index idx_flight_logs_aircraft on flight_logs(aircraft_id);
create index idx_flight_logs_date on flight_logs(log_date);
create index idx_flight_logs_pilot on flight_logs(pic_pilot_id);

-- ============================================================
-- MAINTENANCE ITEMS
-- ============================================================

create table maintenance_items (
  id uuid primary key default uuid_generate_v4(),
  aircraft_id uuid references aircraft(id) not null,
  
  title text not null,
  description text,
  maintenance_type maintenance_type default 'other',
  status maintenance_status default 'upcoming',
  
  -- Due criteria (whichever comes first)
  due_date date,
  due_hours numeric(10, 1),
  due_cycles integer,
  
  -- Completed info
  completed_date date,
  completed_hours numeric(10, 1),
  completed_by text,
  workorder_number text,
  
  -- Cost
  estimated_cost numeric(10, 2),
  actual_cost numeric(10, 2),
  vendor text,
  
  -- Recurring?
  is_recurring boolean default false,
  interval_days integer,
  interval_hours numeric(10, 1),
  
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_maintenance_aircraft on maintenance_items(aircraft_id);
create index idx_maintenance_status on maintenance_items(status);
create index idx_maintenance_due_date on maintenance_items(due_date);

-- ============================================================
-- SQUAWK LOG
-- ============================================================

create table squawks (
  id uuid primary key default uuid_generate_v4(),
  aircraft_id uuid references aircraft(id) not null,
  
  squawk_number text,
  title text not null,
  description text,
  status squawk_status default 'open',
  
  -- Classification
  is_mel boolean default false,  -- minimum equipment list item
  grounding boolean default false,
  
  reported_by uuid references pilots(id),
  reported_at timestamptz default now(),
  
  resolved_by text,
  resolved_at timestamptz,
  resolution_notes text,
  
  maintenance_item_id uuid references maintenance_items(id),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_squawks_aircraft on squawks(aircraft_id);
create index idx_squawks_status on squawks(status);

-- ============================================================
-- TRANSACTIONS (Finance)
-- ============================================================

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  
  -- References
  quote_id uuid references quotes(id),
  aircraft_id uuid references aircraft(id),
  pilot_id uuid references pilots(id),
  
  -- Transaction details
  transaction_date date not null,
  description text not null,
  category transaction_category not null,
  
  amount numeric(12, 2) not null,  -- positive = income, negative = expense
  is_income boolean default false,
  
  -- Payment
  payment_method text,
  reference_number text,
  
  -- Receipt
  receipt_url text,
  receipt_storage_path text,
  
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_transactions_date on transactions(transaction_date);
create index idx_transactions_quote on transactions(quote_id);
create index idx_transactions_aircraft on transactions(aircraft_id);
create index idx_transactions_category on transactions(category);

-- ============================================================
-- RECEIPTS (file metadata)
-- ============================================================

create table receipts (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions(id),
  
  filename text not null,
  storage_path text not null,
  content_type text,
  file_size_bytes integer,
  
  -- OCR/parsed data
  vendor text,
  amount numeric(12, 2),
  receipt_date date,
  parsed_data jsonb,
  
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index idx_receipts_transaction on receipts(transaction_id);

-- ============================================================
-- BROKER REQUESTS (Avinode Intelligence)
-- ============================================================

create table broker_requests (
  id uuid primary key default uuid_generate_v4(),
  
  -- Source
  broker_name text default 'Avinode',
  request_id text,  -- broker's own ID if parseable
  received_at timestamptz default now(),
  raw_email_text text,
  
  -- Parsed fields
  origin_icao text,
  destination_icao text,
  departure_date date,
  return_date date,
  pax_count integer,
  requested_aircraft_type text,
  client_budget numeric(12, 2),
  client_name text,
  notes_from_broker text,
  
  -- Our scoring
  fit_score numeric(4, 1),  -- 0-10
  score_breakdown jsonb,    -- detailed scoring factors
  
  -- Pricing recommendation
  suggested_bid numeric(12, 2),
  min_acceptable_bid numeric(12, 2),
  pricing_notes text,
  
  -- Status & outcome
  status broker_request_status default 'pending',
  linked_quote_id uuid references quotes(id),
  bid_amount numeric(12, 2),
  bid_submitted_at timestamptz,
  outcome_notes text,
  
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_broker_requests_status on broker_requests(status);
create index idx_broker_requests_date on broker_requests(departure_date);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
create trigger update_airports_updated_at before update on airports for each row execute function update_updated_at();
create trigger update_customers_updated_at before update on customers for each row execute function update_updated_at();
create trigger update_aircraft_updated_at before update on aircraft for each row execute function update_updated_at();
create trigger update_pilots_updated_at before update on pilots for each row execute function update_updated_at();
create trigger update_quotes_updated_at before update on quotes for each row execute function update_updated_at();
create trigger update_maintenance_updated_at before update on maintenance_items for each row execute function update_updated_at();
create trigger update_squawks_updated_at before update on squawks for each row execute function update_updated_at();
create trigger update_transactions_updated_at before update on transactions for each row execute function update_updated_at();
create trigger update_broker_requests_updated_at before update on broker_requests for each row execute function update_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Update aircraft hours when flight log is created
create or replace function update_aircraft_hours()
returns trigger as $$
begin
  update aircraft set
    airframe_hours = airframe_hours + coalesce(new.airframe_hours_added, 0),
    engine1_hours = engine1_hours + coalesce(new.engine1_hours_added, 0),
    engine2_hours = engine2_hours + coalesce(new.engine2_hours_added, 0),
    total_cycles = total_cycles + coalesce(new.cycles, 0),
    updated_at = now()
  where id = new.aircraft_id;
  return new;
end;
$$ language plpgsql;

create trigger on_flight_log_insert
  after insert on flight_logs
  for each row execute function update_aircraft_hours();

-- Update pilot hours when flight log is created
create or replace function update_pilot_hours()
returns trigger as $$
begin
  if new.pic_pilot_id is not null then
    update pilots set
      total_hours = total_hours + coalesce(new.flight_time_hrs, 0),
      pic_hours = pic_hours + coalesce(new.flight_time_hrs, 0),
      updated_at = now()
    where id = new.pic_pilot_id;
  end if;
  if new.sic_pilot_id is not null then
    update pilots set
      total_hours = total_hours + coalesce(new.flight_time_hrs, 0),
      updated_at = now()
    where id = new.sic_pilot_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_flight_log_insert_pilot_hours
  after insert on flight_logs
  for each row execute function update_pilot_hours();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table airports enable row level security;
alter table customers enable row level security;
alter table aircraft enable row level security;
alter table pilots enable row level security;
alter table quotes enable row level security;
alter table legs enable row level security;
alter table pilot_assignments enable row level security;
alter table flight_logs enable row level security;
alter table maintenance_items enable row level security;
alter table squawks enable row level security;
alter table transactions enable row level security;
alter table receipts enable row level security;
alter table broker_requests enable row level security;

-- Authenticated users can read/write everything (internal app)
-- The public portal uses public_token on quotes (no auth required)

create policy "Authenticated users have full access to airports"
  on airports for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to customers"
  on customers for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to aircraft"
  on aircraft for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to pilots"
  on pilots for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to quotes"
  on quotes for all using (auth.role() = 'authenticated');

create policy "Public can view quotes by token"
  on quotes for select using (public_token is not null);

create policy "Authenticated users have full access to legs"
  on legs for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to pilot_assignments"
  on pilot_assignments for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to flight_logs"
  on flight_logs for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to maintenance_items"
  on maintenance_items for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to squawks"
  on squawks for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to transactions"
  on transactions for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to receipts"
  on receipts for all using (auth.role() = 'authenticated');

create policy "Authenticated users have full access to broker_requests"
  on broker_requests for all using (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Base airports
insert into airports (icao, iata, name, city, state, latitude, longitude, elevation_ft) values
  ('KCCO', NULL, 'Newnan-Coweta County Airport', 'Newnan', 'GA', 33.3154, -84.7697, 970),
  ('KCGI', 'CGI', 'Cape Girardeau Regional Airport', 'Cape Girardeau', 'MO', 37.2253, -89.5708, 342),
  ('KATL', 'ATL', 'Hartsfield-Jackson Atlanta International', 'Atlanta', 'GA', 33.6407, -84.4277, 1026),
  ('KORD', 'ORD', 'O''Hare International Airport', 'Chicago', 'IL', 41.9742, -87.9073, 672),
  ('KDFW', 'DFW', 'Dallas/Fort Worth International', 'Dallas', 'TX', 32.8998, -97.0403, 607),
  ('KLAX', 'LAX', 'Los Angeles International Airport', 'Los Angeles', 'CA', 33.9425, -118.4081, 125),
  ('KJFK', 'JFK', 'John F. Kennedy International', 'New York', 'NY', 40.6413, -73.7781, 13),
  ('KMIA', 'MIA', 'Miami International Airport', 'Miami', 'FL', 25.7959, -80.2870, 8),
  ('KBNA', 'BNA', 'Nashville International Airport', 'Nashville', 'TN', 36.1245, -86.6782, 599),
  ('KMEM', 'MEM', 'Memphis International Airport', 'Memphis', 'TN', 35.0424, -89.9767, 341),
  ('KSTL', 'STL', 'St. Louis Lambert International', 'St. Louis', 'MO', 38.7487, -90.3700, 618),
  ('KHOU', 'HOU', 'William P. Hobby Airport', 'Houston', 'TX', 29.6454, -95.2789, 46),
  ('KIAH', 'IAH', 'George Bush Intercontinental', 'Houston', 'TX', 29.9902, -95.3368, 97),
  ('KDAL', 'DAL', 'Dallas Love Field', 'Dallas', 'TX', 32.8471, -96.8518, 487),
  ('KTEB', 'TEB', 'Teterboro Airport', 'Teterboro', 'NJ', 40.8499, -74.0608, 9),
  ('KVNY', 'VNY', 'Van Nuys Airport', 'Van Nuys', 'CA', 34.2098, -118.4899, 802),
  ('KPDK', 'PDK', 'DeKalb-Peachtree Airport', 'Atlanta', 'GA', 33.8757, -84.3020, 1003),
  ('KHND', 'HND', 'Henderson Executive Airport', 'Las Vegas', 'NV', 35.9728, -115.1343, 2492),
  ('KLAS', 'LAS', 'Harry Reid International', 'Las Vegas', 'NV', 36.0840, -115.1537, 2181),
  ('KFLL', 'FLL', 'Fort Lauderdale-Hollywood International', 'Fort Lauderdale', 'FL', 26.0726, -80.1527, 9),
  ('KORL', 'ORL', 'Orlando Executive Airport', 'Orlando', 'FL', 28.5455, -81.3329, 113),
  ('KMCO', 'MCO', 'Orlando International Airport', 'Orlando', 'FL', 28.4294, -81.3089, 96),
  ('KBOS', 'BOS', 'Boston Logan International', 'Boston', 'MA', 42.3656, -71.0096, 19),
  ('KIAD', 'IAD', 'Washington Dulles International', 'Washington', 'DC', 38.9531, -77.4565, 312),
  ('KDCA', 'DCA', 'Ronald Reagan Washington National', 'Washington', 'DC', 38.8521, -77.0377, 15),
  ('KPHL', 'PHL', 'Philadelphia International Airport', 'Philadelphia', 'PA', 39.8729, -75.2437, 36),
  ('KDEN', 'DEN', 'Denver International Airport', 'Denver', 'CO', 39.8561, -104.6737, 5431),
  ('KPHX', 'PHX', 'Phoenix Sky Harbor International', 'Phoenix', 'AZ', 33.4373, -112.0078, 1135),
  ('KSEA', 'SEA', 'Seattle-Tacoma International', 'Seattle', 'WA', 47.4502, -122.3088, 433),
  ('KSFO', 'SFO', 'San Francisco International Airport', 'San Francisco', 'CA', 37.6213, -122.3790, 13);

-- Aircraft
insert into aircraft (registration, name, aircraft_type, make, model, year, base_icao, status, hourly_rate, cruise_speed_ktas, max_pax, max_range_nm, airframe_hours, engine1_hours, engine2_hours, total_cycles) values
  ('N100EA', 'Phenom 100 #1', 'phenom_100', 'Embraer', 'Phenom 100EV', 2019, 'KCCO', 'available', 2500.00, 380, 4, 1178, 2847.3, 2847.3, 2847.3, 1823),
  ('N200EA', 'Phenom 100 #2', 'phenom_100', 'Embraer', 'Phenom 100EV', 2021, 'KCGI', 'available', 2500.00, 380, 4, 1178, 1654.7, 1654.7, 1654.7, 1041),
  ('N300EA', 'PC-12 #1', 'pc12', 'Pilatus', 'PC-12/47E', 2018, 'KCGI', 'available', 1800.00, 270, 8, 1845, 3241.5, 3241.5, 0, 2156);
