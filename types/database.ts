export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AircraftType = 'phenom_100' | 'pc12'
export type AircraftStatus = 'available' | 'in_flight' | 'maintenance' | 'aog'
export type PilotStatus = 'staff' | 'contractor' | 'inactive'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'scheduled' | 'completed' | 'invoiced' | 'paid' | 'declined' | 'cancelled'
export type TransactionCategory = 'fuel' | 'maintenance' | 'crew' | 'landing_fees' | 'catering' | 'insurance' | 'hangar' | 'navigation' | 'ground_transport' | 'other'
export type MaintenanceType = '100hr' | '200hr' | 'annual' | 'hot_section' | 'overhaul' | 'ad' | 'service_bulletin' | 'other'
export type MaintenanceStatus = 'upcoming' | 'overdue' | 'completed' | 'deferred'
export type SquawkStatus = 'open' | 'deferred' | 'resolved'
export type BrokerRequestStatus = 'pending' | 'bid_submitted' | 'won' | 'lost' | 'passed'

export interface Airport {
  id: string
  icao: string
  iata: string | null
  name: string
  city: string | null
  state: string | null
  country: string
  latitude: number | null
  longitude: number | null
  elevation_ft: number | null
  fuel_available: boolean
  fbo_name: string | null
  fbo_phone: string | null
  landing_fee: number | null
  ramp_fee: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  total_trips: number
  total_revenue: number
  created_at: string
  updated_at: string
}

export interface Aircraft {
  id: string
  registration: string
  name: string
  aircraft_type: AircraftType
  make: string
  model: string
  year: number | null
  serial_number: string | null
  base_icao: string | null
  status: AircraftStatus
  hourly_rate: number
  cruise_speed_ktas: number
  max_pax: number
  max_range_nm: number | null
  airframe_hours: number
  engine1_hours: number
  engine2_hours: number
  prop_hours: number
  total_cycles: number
  insurance_expiry: string | null
  annual_due: string | null
  notes: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Pilot {
  id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  status: PilotStatus
  certificate_number: string | null
  atp_rated: boolean
  instrument_rated: boolean
  qualified_aircraft: string[] | null
  daily_rate: number | null
  total_hours: number
  pic_hours: number
  medical_class: string | null
  medical_expiry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  quote_number: string
  status: QuoteStatus
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  aircraft_id: string | null
  origin_icao: string
  destination_icao: string
  departure_date: string
  departure_time: string | null
  return_date: string | null
  return_time: string | null
  pax_count: number
  is_round_trip: boolean
  is_empty_leg: boolean
  distance_nm: number | null
  flight_time_hrs: number | null
  base_rate: number | null
  fuel_surcharge: number
  airport_fees: number
  pilot_cost: number
  catering_cost: number
  ground_transport: number
  other_fees: number
  discount_pct: number
  discount_amount: number
  total_price: number | null
  notes: string | null
  internal_notes: string | null
  public_token: string | null
  sent_at: string | null
  accepted_at: string | null
  broker_request_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  aircraft?: Aircraft
  customer?: Customer
}

export interface Leg {
  id: string
  quote_id: string
  leg_number: number
  origin_icao: string
  destination_icao: string
  departure_date: string
  departure_time: string | null
  distance_nm: number | null
  flight_time_hrs: number | null
  actual_departure: string | null
  actual_arrival: string | null
  actual_flight_time_hrs: number | null
  hobbs_start: number | null
  hobbs_end: number | null
  fuel_uplift_gallons: number | null
  fuel_cost: number | null
  notes: string | null
  created_at: string
}

export interface PilotAssignment {
  id: string
  quote_id: string
  pilot_id: string
  role: string
  daily_rate: number | null
  days_estimated: number | null
  total_cost: number | null
  confirmed: boolean
  notes: string | null
  created_at: string
  pilot?: Pilot
}

export interface FlightLog {
  id: string
  quote_id: string | null
  leg_id: string | null
  aircraft_id: string
  log_date: string
  origin_icao: string | null
  destination_icao: string | null
  hobbs_start: number | null
  hobbs_end: number | null
  flight_time_hrs: number | null
  cycles: number
  engine1_hours_added: number | null
  engine2_hours_added: number | null
  airframe_hours_added: number | null
  pic_pilot_id: string | null
  sic_pilot_id: string | null
  notes: string | null
  created_at: string
}

export interface MaintenanceItem {
  id: string
  aircraft_id: string
  title: string
  description: string | null
  maintenance_type: MaintenanceType
  status: MaintenanceStatus
  due_date: string | null
  due_hours: number | null
  due_cycles: number | null
  completed_date: string | null
  completed_hours: number | null
  completed_by: string | null
  workorder_number: string | null
  estimated_cost: number | null
  actual_cost: number | null
  vendor: string | null
  is_recurring: boolean
  interval_days: number | null
  interval_hours: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  aircraft?: Aircraft
}

export interface Squawk {
  id: string
  aircraft_id: string
  squawk_number: string | null
  title: string
  description: string | null
  status: SquawkStatus
  is_mel: boolean
  grounding: boolean
  reported_by: string | null
  reported_at: string
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  maintenance_item_id: string | null
  created_at: string
  updated_at: string
  aircraft?: Aircraft
  reporter?: Pilot
}

export interface Transaction {
  id: string
  quote_id: string | null
  aircraft_id: string | null
  pilot_id: string | null
  transaction_date: string
  description: string
  category: TransactionCategory
  amount: number
  is_income: boolean
  payment_method: string | null
  reference_number: string | null
  receipt_url: string | null
  receipt_storage_path: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  aircraft?: Aircraft
  quote?: Quote
}

export interface Receipt {
  id: string
  transaction_id: string | null
  filename: string
  storage_path: string
  content_type: string | null
  file_size_bytes: number | null
  vendor: string | null
  amount: number | null
  receipt_date: string | null
  parsed_data: Json | null
  uploaded_by: string | null
  created_at: string
}

export interface BrokerRequest {
  id: string
  broker_name: string
  request_id: string | null
  received_at: string
  raw_email_text: string | null
  origin_icao: string | null
  destination_icao: string | null
  departure_date: string | null
  return_date: string | null
  pax_count: number | null
  requested_aircraft_type: string | null
  client_budget: number | null
  client_name: string | null
  notes_from_broker: string | null
  fit_score: number | null
  score_breakdown: Json | null
  suggested_bid: number | null
  min_acceptable_bid: number | null
  pricing_notes: string | null
  status: BrokerRequestStatus
  linked_quote_id: string | null
  bid_amount: number | null
  bid_submitted_at: string | null
  outcome_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  linked_quote?: Quote
}

export interface Database {
  public: {
    Tables: {
      airports: { Row: Airport; Insert: Partial<Airport>; Update: Partial<Airport> }
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> }
      aircraft: { Row: Aircraft; Insert: Partial<Aircraft>; Update: Partial<Aircraft> }
      pilots: { Row: Pilot; Insert: Partial<Pilot>; Update: Partial<Pilot> }
      quotes: { Row: Quote; Insert: Partial<Quote>; Update: Partial<Quote> }
      legs: { Row: Leg; Insert: Partial<Leg>; Update: Partial<Leg> }
      pilot_assignments: { Row: PilotAssignment; Insert: Partial<PilotAssignment>; Update: Partial<PilotAssignment> }
      flight_logs: { Row: FlightLog; Insert: Partial<FlightLog>; Update: Partial<FlightLog> }
      maintenance_items: { Row: MaintenanceItem; Insert: Partial<MaintenanceItem>; Update: Partial<MaintenanceItem> }
      squawks: { Row: Squawk; Insert: Partial<Squawk>; Update: Partial<Squawk> }
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> }
      receipts: { Row: Receipt; Insert: Partial<Receipt>; Update: Partial<Receipt> }
      broker_requests: { Row: BrokerRequest; Insert: Partial<BrokerRequest>; Update: Partial<BrokerRequest> }
    }
  }
}
