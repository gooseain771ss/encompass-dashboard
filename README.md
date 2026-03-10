# Encompass Aviation Dashboard

A full-stack operations dashboard for Encompass Aviation — replacing QuickBooks and Airplane Manager with a unified platform for trip quoting, fleet management, finance tracking, pilot management, and Avinode intelligence.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Vercel

---

## Setup Guide

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
   - Suggested name: `encompass-aviation`
   - Region: **us-east-1** (closest to your fleet bases)
   - Save your database password somewhere safe

2. In the Supabase dashboard → **SQL Editor**, paste and run the migration file:
   - Open `supabase/migrations/001_initial.sql`
   - Copy all contents → SQL Editor → Run
   - This creates all tables, RLS policies, triggers, and seeds aircraft + airports

3. Enable **Storage**:
   - Go to Storage → Create bucket
   - Bucket name: `receipts`
   - Set as **Public** bucket (so receipt URLs work)

4. Get your API keys:
   - Settings → API
   - Copy `Project URL`, `anon/public key`, and `service_role key`

5. Create your first user:
   - Authentication → Users → Add user
   - Enter your email and a strong password

### 2. Local Development

```bash
cd encompass-dashboard
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel

**Option A: Vercel CLI**
```bash
npm install -g vercel
vercel --prod
```

**Option B: GitHub + Vercel Dashboard**
1. Push this project to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select the repo, Vercel auto-detects Next.js

**Environment Variables in Vercel:**
Add these in Vercel → Project → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
NEXT_PUBLIC_APP_URL = https://flyencompass.com
```

### 4. Domain Setup (flyencompass.com)

1. In Vercel → Project → Settings → Domains
2. Add `flyencompass.com` and `www.flyencompass.com`
3. Vercel will give you DNS records to add to your registrar:
   - Usually an **A record** pointing to `76.76.21.21`
   - And a **CNAME** for `www` pointing to `cname.vercel-dns.com`
4. Add `flyencompass.com` to Supabase → Authentication → URL Configuration → Site URL

---

## Module Overview

### Trips & Quotes (`/dashboard/trips`)
- **New Quote** (`/dashboard/trips/new`): Build quotes with auto-calculated pricing
  - Origin/destination ICAO → great-circle distance → flight time
  - Phenom 100: 380 KTAS, PC-12: 270 KTAS
  - Hourly rate × flight time = base rate
  - Add fuel surcharge, airport fees, pilot cost, catering
  - Empty leg discount up to 50%
  - Round trip multiplier
- **Pipeline**: Draft → Sent → Accepted → Scheduled → Completed → Invoiced → Paid
- **Customer Portal**: Each quote gets a unique public URL (`/portal/[token]`)

### Fleet & Maintenance (`/dashboard/fleet`)
- Per-aircraft stats: airframe hours, engine hours, cycles
- Hours progress bar to next 100-hour inspection
- Maintenance schedule with due dates/hours
- Squawk log (grounding, MEL flagging)
- Flight log entry (updates hours automatically via DB trigger)

### Finance (`/dashboard/finance`)
- Date-range P&L (revenue, expenses, net profit)
- Expense category breakdown
- Add transactions (income or expense)
- Receipt upload to Supabase Storage
- Export to CSV

### Pilots (`/dashboard/pilots`)
- Staff and contractor roster
- Per-pilot: hours, daily rate, medical expiry
- Add new pilots with certification details

### Avinode Intelligence (`/dashboard/avinode`)
- **Parse Email**: Paste Avinode trip request → auto-extracts:
  - Route (ICAO codes), dates, pax count, aircraft type, budget
- **Fit Score** (0-10): Based on:
  - Aircraft positioning (nm from departure)
  - Date availability
  - Aircraft type match
  - Route viability (range check)
  - Budget adequacy
- **Pricing Recommendation**: Suggested bid, min acceptable, max bid
- **Win/Loss Tracking**: Records outcomes over time

### Customer Portal (`/portal/[token]`)
- Clean, public-facing quote view (no login required)
- Accept / Decline buttons
- Price breakdown
- Stripe-ready payment placeholder

---

## Database Schema

Key tables:
- `aircraft` — 3 aircraft seeded (2× Phenom 100, 1× PC-12)
- `airports` — 30 common US airports seeded, extensible
- `quotes` — full trip pipeline with auto-generated quote numbers
- `pilot_assignments` — links pilots to trips
- `flight_logs` — updates aircraft hours/cycles via trigger
- `maintenance_items` — scheduled maintenance with overdue detection
- `squawks` — open/deferred/resolved with grounding flag
- `transactions` — income and expenses with categories
- `receipts` — file uploads via Supabase Storage
- `broker_requests` — Avinode intelligence with scoring

All tables have Row Level Security (RLS) enabled. Authenticated users have full access. The `quotes` table additionally allows public read by `public_token`.

---

## Pilot Daily Rates

To set pilot daily rates, add them in the Pilots module. Typical starting point:
- Staff pilot: $600–$800/day
- Contractor pilot: $700–$1,000/day

---

## Adding New Airports

The system seeds 30 common US airports. To add more:
1. Finance → or use the SQL editor in Supabase
```sql
INSERT INTO airports (icao, name, city, state, latitude, longitude)
VALUES ('KXYZ', 'Some Airport', 'City', 'ST', 00.0000, -00.0000);
```

Or just type the ICAO in the quote builder — the distance calculator uses both the database and a hardcoded set of ~20 common airports as fallback.

---

## Future Enhancements

- **Stripe integration**: Replace the payment placeholder with real Stripe Checkout
- **Email notifications**: Send quote PDFs via Resend or SendGrid
- **PDF quote generation**: Generate printable quote PDFs
- **Calendar view**: Visual calendar for all 3 aircraft
- **Mobile app**: React Native using the same Supabase backend
- **Fuel price feed**: Auto-pull current fuel prices to auto-fill fuel surcharge

---

## Support

Built by OpenClaw for Scott Nussbaum / Encompass Aviation.
