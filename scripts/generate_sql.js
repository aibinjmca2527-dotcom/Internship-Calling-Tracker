const fs = require('fs');
const path = require('path');

// Load extracted companies
const companiesPath = path.join(__dirname, '..', 'src', 'data', 'companies.json');
const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));

console.log(`Loaded ${companies.length} companies.`);

// 1. Schema SQL
const schemaSql = `-- =====================================================================
-- INFOPARK INTERNSHIP CALLING TRACKER - DATABASE SCHEMA
-- =====================================================================

-- Enable pgcrypto for UUID generation if needed
create extension if not exists "pgcrypto";

-- Drop existing tables and functions if recreating cleanly
-- (Comment out in production if preserving existing data)
-- drop table if exists public.contact_history cascade;
-- drop table if exists public.companies cascade;
-- drop table if exists public.approved_team_members cascade;

-- 1. APPROVED TEAM MEMBERS TABLE
create table if not exists public.approved_team_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text unique not null,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Case-insensitive index on email
create index if not exists idx_approved_members_email on public.approved_team_members (lower(email));

-- 2. COMPANIES TABLE
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  serial_number integer not null unique,
  company_name text not null unique,
  phone_number text not null,
  status text not null default 'NOT_CONTACTED' check (status in ('NOT_CONTACTED', 'CONTACTED')),
  called_by_user_id uuid references auth.users(id) on delete set null,
  called_by_name text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast filtering and sorting
create index if not exists idx_companies_status on public.companies(status);
create index if not exists idx_companies_serial on public.companies(serial_number);
create index if not exists idx_companies_called_by_name on public.companies(called_by_name);

-- 3. CONTACT HISTORY TABLE
create table if not exists public.contact_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  changed_by_name text not null,
  action text not null check (action in ('MARK_CONTACTED', 'RESET_NOT_CONTACTED')),
  previous_status text not null,
  new_status text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_history_company on public.contact_history(company_id);
create index if not exists idx_contact_history_created on public.contact_history(created_at desc);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- =====================================================================
alter table public.approved_team_members enable row level security;
alter table public.companies enable row level security;
alter table public.contact_history enable row level security;

-- Drop existing restrictive policies if present
drop policy if exists "Allow approved members to view team list" on public.approved_team_members;
drop policy if exists "Allow approved members to select companies" on public.companies;
drop policy if exists "Allow approved members to select history" on public.contact_history;
drop policy if exists "Allow read access to companies" on public.companies;
drop policy if exists "Allow read access to contact history" on public.contact_history;
drop policy if exists "Allow read access to approved team members" on public.approved_team_members;

-- Allow reading companies and contact history (with anon key or authenticated)
create policy "Allow read access to companies"
  on public.companies for select
  to anon, authenticated
  using (true);

create policy "Allow read access to contact history"
  on public.contact_history for select
  to anon, authenticated
  using (true);

create policy "Allow read access to approved team members"
  on public.approved_team_members for select
  to anon, authenticated
  using (true);

-- Grant table read permissions to anon and authenticated
grant select on public.companies to anon, authenticated;
grant select on public.contact_history to anon, authenticated;
grant select on public.approved_team_members to anon, authenticated;

-- =====================================================================
-- ATOMIC STORED PROCEDURES (RPC)
-- =====================================================================

-- Drop previous function overloads to prevent "function is not unique" (42725) errors
drop function if exists public.reset_company_status(uuid);
drop function if exists public.reset_company_status(uuid, text);
drop function if exists public.mark_company_contacted(uuid, text);
drop function if exists public.mark_company_contacted(uuid);

-- 1. Mark Company as Contacted (Atomic with SELECT FOR UPDATE)
create or replace function public.mark_company_contacted(
  p_company_id uuid,
  p_caller_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cleaned_name text;
  v_company record;
  v_updated record;
begin
  -- 1. Validate caller identity matches one of the 5 authorized team members
  v_cleaned_name := trim(p_caller_name);
  if v_cleaned_name not in ('Aibin', 'Milan', 'Edwin', 'Seba', 'Lakshmi') then
    return jsonb_build_object(
      'success', false, 
      'error', 'UNAUTHORIZED_CALLER', 
      'message', 'Caller must be one of the authorized team members: Aibin, Milan, Edwin, Seba, or Lakshmi.'
    );
  end if;

  -- 2. Lock company row atomically with SELECT ... FOR UPDATE
  select * into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false, 
      'error', 'NOT_FOUND', 
      'message', 'Company record not found.'
    );
  end if;

  -- 3. Check if already contacted (Prevent simultaneous duplicate claiming)
  if v_company.status = 'CONTACTED' then
    return jsonb_build_object(
      'success', false,
      'error', 'ALREADY_CONTACTED',
      'message', 'This company was already marked as contacted by ' || coalesce(v_company.called_by_name, 'another teammate') || '.',
      'company', row_to_json(v_company)
    );
  end if;

  -- 4. Atomically update status to CONTACTED
  update public.companies
  set status = 'CONTACTED',
      called_by_name = v_cleaned_name,
      contacted_at = now(),
      updated_at = now()
  where id = p_company_id
  returning * into v_updated;

  -- 5. Insert into contact history
  insert into public.contact_history (
    company_id,
    changed_by_name,
    action,
    previous_status,
    new_status
  ) values (
    p_company_id,
    v_cleaned_name,
    'MARK_CONTACTED',
    'NOT_CONTACTED',
    'CONTACTED'
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Company successfully marked as contacted.',
    'company', row_to_json(v_updated)
  );
end;
$$;

-- 2. Reset Company Status to Not Contacted (Atomic)
create or replace function public.reset_company_status(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company record;
  v_updated record;
begin
  -- 1. Lock company row
  select * into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false, 
      'error', 'NOT_FOUND', 
      'message', 'Company record not found.'
    );
  end if;

  if v_company.status = 'NOT_CONTACTED' then
    return jsonb_build_object(
      'success', true,
      'message', 'Company is already not contacted.',
      'company', row_to_json(v_company)
    );
  end if;

  -- 2. Reset company status
  update public.companies
  set status = 'NOT_CONTACTED',
      called_by_user_id = null,
      called_by_name = null,
      contacted_at = null,
      updated_at = now()
  where id = p_company_id
  returning * into v_updated;

  -- 3. Record history
  insert into public.contact_history (
    company_id,
    changed_by_name,
    action,
    previous_status,
    new_status,
    notes
  ) values (
    p_company_id,
    'Team Member',
    'RESET_NOT_CONTACTED',
    'CONTACTED',
    'NOT_CONTACTED',
    'Status reset to Not Contacted'
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Company status reset to Not Contacted.',
    'company', row_to_json(v_updated)
  );
end;
$$;

-- Grant execution to anon and authenticated with unambiguous signatures
grant execute on function public.mark_company_contacted(uuid, text) to anon, authenticated;
grant execute on function public.reset_company_status(uuid) to anon, authenticated;

-- =====================================================================
-- REALTIME PUBLICATION CONFIGURATION
-- =====================================================================
-- Set replica identity full so realtime updates receive complete records
alter table public.companies replica identity full;
alter table public.contact_history replica identity full;

-- Enable Realtime for companies and contact_history
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'companies'
  ) then
    alter publication supabase_realtime add table public.companies;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'contact_history'
  ) then
    alter publication supabase_realtime add table public.contact_history;
  end if;
end $$;

-- =====================================================================
-- SEED INITIAL APPROVED TEAM MEMBERS (5 SAINTGITS MCA STUDENTS)
-- =====================================================================
insert into public.approved_team_members (email, display_name, is_active)
values
  (lower('aibinj.mca2527@saintgits.org'), 'Aibin', true),
  (lower('milans.mca2527@saintgits.org'), 'Milan', true),
  (lower('edwinj.mca2527@saintgits.org'), 'Edwin', true),
  (lower('sebamt.mca2527@saintgits.org'), 'Seba', true),
  (lower('lakshmis.mca2527@saintgits.org'), 'Lakshmi', true)
on conflict (email) do update
set display_name = excluded.display_name,
    is_active = excluded.is_active;
`;

// 2. Generate Seed SQL for all 208 companies (idempotent, never resets contacted status)
let seedSql = `-- =====================================================================
-- INFOPARK KOCHI PHASE 1 COMPANIES SEED DATA (208 COMPANIES)
-- Safe & Idempotent: Never overwrites or resets 'CONTACTED' status on re-run
-- =====================================================================

insert into public.companies (serial_number, company_name, phone_number, status)
values
`;

const valueRows = companies.map(c => {
  const nameEscaped = c.company_name.replace(/'/g, "''");
  const phoneEscaped = c.phone_number.replace(/'/g, "''");
  return `  (${c.serial_number}, '${nameEscaped}', '${phoneEscaped}', 'NOT_CONTACTED')`;
});

seedSql += valueRows.join(',\n');
seedSql += `
on conflict (company_name) do update
set serial_number = excluded.serial_number,
    phone_number = excluded.phone_number
where public.companies.status = 'NOT_CONTACTED';
`;

// Save files
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261020000000_schema.sql'), schemaSql);
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261020000001_seed_companies.sql'), seedSql);
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), schemaSql + '\n\n' + seedSql);

console.log('Successfully generated:');
console.log(' - supabase/migrations/20261020000000_schema.sql');
console.log(' - supabase/migrations/20261020000001_seed_companies.sql');
console.log(' - supabase/schema.sql (Consolidated file for Supabase SQL Editor)');
