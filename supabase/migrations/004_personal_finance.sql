-- ============================================================
-- Personal Finance Module
-- ============================================================

-- ENUMS
create type personal_account_type as enum (
  'checking', 'savings', 'credit_card', 'investment',
  'mortgage', 'loan', 'property', 'vehicle', 'other'
);

create type personal_owner as enum ('scott', 'wife', 'joint');

create type personal_transaction_source as enum (
  'manual', 'csv_import', 'whatsapp', 'email'
);

create type personal_budget_period as enum ('monthly', 'annual');

-- ============================================================
-- PERSONAL ACCOUNTS
-- ============================================================

create table personal_accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  institution text,
  account_type personal_account_type not null default 'checking',
  last_four text,
  balance numeric(12, 2) not null default 0,
  is_asset boolean not null default true,
  is_liability boolean not null default false,
  owner personal_owner not null default 'joint',
  display_order integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_personal_accounts_active on personal_accounts(is_active, display_order);
create index idx_personal_accounts_type on personal_accounts(account_type);

-- ============================================================
-- PERSONAL TRANSACTIONS
-- ============================================================

create table personal_transactions (
  id uuid primary key default uuid_generate_v4(),
  account_id uuid references personal_accounts(id) on delete set null,
  transaction_date date not null default current_date,
  description text not null,
  merchant text,
  amount numeric(12, 2) not null,  -- positive = income, negative = expense
  is_income boolean not null default false,
  category text not null default 'Uncategorized',
  subcategory text,
  source personal_transaction_source not null default 'manual',
  raw_import_text text,
  needs_review boolean not null default false,
  confidence_score numeric(4, 3),
  receipt_url text,
  receipt_storage_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_personal_transactions_date on personal_transactions(transaction_date desc);
create index idx_personal_transactions_account on personal_transactions(account_id);
create index idx_personal_transactions_category on personal_transactions(category, subcategory);
create index idx_personal_transactions_review on personal_transactions(needs_review) where needs_review = true;
create index idx_personal_transactions_income on personal_transactions(is_income);

-- ============================================================
-- PERSONAL BUDGETS
-- ============================================================

create table personal_budgets (
  id uuid primary key default uuid_generate_v4(),
  name text,
  period personal_budget_period not null default 'monthly',
  year integer not null,
  month integer,  -- null for annual budgets
  category text not null,
  subcategory text,
  budgeted_amount numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period, year, month, category, subcategory)
);

create index idx_personal_budgets_period on personal_budgets(year, month, period);
create index idx_personal_budgets_category on personal_budgets(category);

-- ============================================================
-- PERSONAL NET WORTH SNAPSHOTS
-- ============================================================

create table personal_net_worth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  snapshot_date date not null default current_date,
  total_assets numeric(14, 2) not null default 0,
  total_liabilities numeric(14, 2) not null default 0,
  net_worth numeric(14, 2) not null default 0,
  breakdown jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_personal_networth_date on personal_net_worth_snapshots(snapshot_date desc);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function update_personal_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_personal_accounts_updated_at
  before update on personal_accounts
  for each row execute function update_personal_updated_at();

create trigger trg_personal_transactions_updated_at
  before update on personal_transactions
  for each row execute function update_personal_updated_at();

create trigger trg_personal_budgets_updated_at
  before update on personal_budgets
  for each row execute function update_personal_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table personal_accounts enable row level security;
alter table personal_transactions enable row level security;
alter table personal_budgets enable row level security;
alter table personal_net_worth_snapshots enable row level security;

-- Authenticated users have full access (single-tenant household app)
create policy "authenticated_full_access" on personal_accounts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on personal_transactions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on personal_budgets
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_full_access" on personal_net_worth_snapshots
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
