const fs = require('fs');
const path = require('path');

const p2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'companies_phase2.json'), 'utf8'));

let sql = `-- =====================================================================
-- SAFE MIGRATION: ADD INFOPARK KOCHI PHASE 2 COMPANIES (107 COMPANIES)
-- Safe & Non-Destructive:
-- 1. Does NOT delete, drop, or alter any existing Phase 1 records or caller progress.
-- 2. Sets existing companies to 'Phase 1' automatically.
-- 3. Adjusts unique constraint so Phase 1 and Phase 2 each have serial numbers 1..N.
-- 4. Inserts Phase 2 companies without touching Phase 1.
-- =====================================================================

-- Step 1: Add phase column if it does not exist (default to 'Phase 1' preserves all current data)
alter table public.companies 
add column if not exists phase text not null default 'Phase 1';

-- Create index on phase for ultra-fast filtering
create index if not exists idx_companies_phase on public.companies(phase);

-- Step 2: Drop global unique constraints if present and replace with phase-scoped unique constraints
alter table public.companies drop constraint if exists companies_serial_number_key;
alter table public.companies drop constraint if exists companies_company_name_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_phase_serial_unique') then
    alter table public.companies add constraint companies_phase_serial_unique unique (phase, serial_number);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_phase_name_unique') then
    alter table public.companies add constraint companies_phase_name_unique unique (phase, company_name);
  end if;
end $$;

-- Step 3: Insert Phase 2 companies safely (idempotent: never overwrites contacted status)
insert into public.companies (serial_number, company_name, phone_number, status, phase)
values
`;

const rows = p2.map(c => {
  const name = c.company_name.replace(/'/g, "''");
  const phone = c.phone_number.replace(/'/g, "''");
  return `  (${c.serial_number}, '${name}', '${phone}', 'NOT_CONTACTED', 'Phase 2')`;
});

sql += rows.join(',\n');
sql += `
on conflict (phase, company_name) do update
set serial_number = excluded.serial_number,
    phone_number = excluded.phone_number
where public.companies.status = 'NOT_CONTACTED';
`;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'add_phase_2_safe.sql'), sql);
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261021000000_add_phase_2.sql'), sql);
console.log('Successfully generated supabase/add_phase_2_safe.sql with', p2.length, 'companies.');
