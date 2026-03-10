-- Add detailed aircraft tracking fields
alter table aircraft
  add column if not exists engine1_cycles integer default 0,
  add column if not exists engine2_cycles integer default 0,
  add column if not exists total_landings integer default 0,
  add column if not exists meter_time numeric(10,1) default 0;

-- Update flight_logs to track per-engine cycles and landings
alter table flight_logs
  add column if not exists engine1_cycles_added integer default 0,
  add column if not exists engine2_cycles_added integer default 0,
  add column if not exists landings_added integer default 0;

-- Update the aircraft hours trigger to include new fields
create or replace function update_aircraft_hours()
returns trigger as $$
begin
  update aircraft set
    airframe_hours    = airframe_hours    + coalesce(new.airframe_hours_added, 0),
    meter_time        = meter_time        + coalesce(new.airframe_hours_added, 0),
    engine1_hours     = engine1_hours     + coalesce(new.engine1_hours_added, 0),
    engine2_hours     = engine2_hours     + coalesce(new.engine2_hours_added, 0),
    engine1_cycles    = engine1_cycles    + coalesce(new.engine1_cycles_added, 0),
    engine2_cycles    = engine2_cycles    + coalesce(new.engine2_cycles_added, 0),
    total_landings    = total_landings    + coalesce(new.landings_added, 0),
    total_cycles      = total_cycles      + coalesce(new.engine1_cycles_added, 0),
    updated_at        = now()
  where id = new.aircraft_id;
  return new;
end;
$$ language plpgsql;
