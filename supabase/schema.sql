-- =====================================================================
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
  status text not null default 'NOT_CONTACTED' check (status in ('NOT_CONTACTED', 'CONTACTED', 'NO_ANSWER')),
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
  action text not null check (action in ('MARK_CONTACTED', 'MARK_NO_ANSWER', 'RESET_NOT_CONTACTED')),
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
drop function if exists public.mark_company_contacted(uuid, text, text);
drop function if exists public.mark_company_contacted(uuid);

-- 1. Mark Company as Contacted or Did Not Pick Up (Atomic with SELECT FOR UPDATE)
create or replace function public.mark_company_contacted(
  p_company_id uuid,
  p_caller_name text,
  p_status text default 'CONTACTED'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cleaned_name text;
  v_target_status text;
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

  -- 2. Validate target status
  v_target_status := coalesce(nullif(trim(p_status), ''), 'CONTACTED');
  if v_target_status not in ('CONTACTED', 'NO_ANSWER') then
    return jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', 'Status must be either CONTACTED or NO_ANSWER.'
    );
  end if;

  -- 3. Lock company row atomically with SELECT ... FOR UPDATE
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

  -- 4. Check if already contacted (Prevent simultaneous duplicate claiming if another teammate marked as contacted)
  if v_company.status = 'CONTACTED' and v_target_status = 'CONTACTED' and v_company.called_by_name <> v_cleaned_name then
    return jsonb_build_object(
      'success', false,
      'error', 'ALREADY_CONTACTED',
      'message', 'This company was already marked as contacted by ' || coalesce(v_company.called_by_name, 'another teammate') || '.',
      'company', row_to_json(v_company)
    );
  end if;

  -- 5. Atomically update status
  update public.companies
  set status = v_target_status,
      called_by_name = v_cleaned_name,
      contacted_at = now(),
      updated_at = now()
  where id = p_company_id
  returning * into v_updated;

  -- 6. Insert into contact history
  insert into public.contact_history (
    company_id,
    changed_by_name,
    action,
    previous_status,
    new_status,
    notes
  ) values (
    p_company_id,
    v_cleaned_name,
    case when v_target_status = 'NO_ANSWER' then 'MARK_NO_ANSWER' else 'MARK_CONTACTED' end,
    v_company.status,
    v_target_status,
    case when v_target_status = 'NO_ANSWER' then 'Call attempted - Did not pick up' else 'Call answered - Contacted successfully' end
  );

  return jsonb_build_object(
    'success', true,
    'message', case when v_target_status = 'NO_ANSWER' then 'Company marked as Did Not Pick Up.' else 'Company successfully marked as contacted.' end,
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
    v_company.status,
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
grant execute on function public.mark_company_contacted(uuid, text, text) to anon, authenticated;
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


-- =====================================================================
-- INFOPARK KOCHI PHASE 1 COMPANIES SEED DATA (208 COMPANIES)
-- Safe & Idempotent: Never overwrites or resets 'CONTACTED' status on re-run
-- =====================================================================

insert into public.companies (serial_number, company_name, phone_number, status)
values
  (1, '9Commerce Technologies', '9995080656', 'NOT_CONTACTED'),
  (2, 'Aabasoft Technologies India Private Limited', '+914844172222', 'NOT_CONTACTED'),
  (3, 'Aarbee Structures Pvt.Ltd', '+91-9544407555', 'NOT_CONTACTED'),
  (4, 'Abel Techsoft Private Limited', '+919995005969', 'NOT_CONTACTED'),
  (5, 'Accelray Technologies Pvt Ltd', '+9188486 20593', 'NOT_CONTACTED'),
  (6, 'Aceware Fintech Services Pvt Ltd (Radiant Acemoney)', '0806 898 3333', 'NOT_CONTACTED'),
  (7, 'Acube Innovations', '6235866111', 'NOT_CONTACTED'),
  (8, 'adesso India Private Ltd', '+91- 77360 95222', 'NOT_CONTACTED'),
  (9, 'Advenser Engineering Services Private Limited', '+91 484 4040708', 'NOT_CONTACTED'),
  (10, 'Affiliated Computer Services of India, A Xerox Company', '0484 4090136', 'NOT_CONTACTED'),
  (11, 'Airo Global Software Pvt Ltd', '+91-7034966777', 'NOT_CONTACTED'),
  (12, 'Al Tomouh IT Pvt Ltd', '+91 77360 03339', 'NOT_CONTACTED'),
  (13, 'ALB Technologies Pvt Ltd', '+91- 6238295987', 'NOT_CONTACTED'),
  (14, 'Amatosoft', '9400334787', 'NOT_CONTACTED'),
  (15, 'Amla Consultancy Pvt Ltd', '+91 99613 69999', 'NOT_CONTACTED'),
  (16, 'Amplitude Software Systems Pvt Ltd', '91 6282902505', 'NOT_CONTACTED'),
  (17, 'Appadore Private Limited', '0484-2956529', 'NOT_CONTACTED'),
  (18, 'Applied Payments Technology Pvt Ltd.', '0484 485 0362', 'NOT_CONTACTED'),
  (19, 'Array Platforms Pvt Ltd', '0484-4041580', 'NOT_CONTACTED'),
  (20, 'Art Technology and Software.', '0484-2415244', 'NOT_CONTACTED'),
  (21, 'Aspire Systems Digital Private Limited', '0484 4061901', 'NOT_CONTACTED'),
  (22, 'Beinex Consulting Pvt Ltd', '6238389957', 'NOT_CONTACTED'),
  (23, 'Beth Soft Technologies India Private Limited', '9633849485', 'NOT_CONTACTED'),
  (24, 'Bhooshan''s Junior', '04843539863', 'NOT_CONTACTED'),
  (25, 'BIMEX Engineers', '+91 81293 21656', 'NOT_CONTACTED'),
  (26, 'Binaries', '+918547644145', 'NOT_CONTACTED'),
  (27, 'BJ Corps Technologies (OPC) Private Limited', '9846691115', 'NOT_CONTACTED'),
  (28, 'Bramma IT Solutions', '+91 9895027444', 'NOT_CONTACTED'),
  (29, 'BroadTech IT Solutions Pvt Ltd', '+91 9048654482', 'NOT_CONTACTED'),
  (30, 'BUBMart Online Stores LLP', '+91 96457 59548', 'NOT_CONTACTED'),
  (31, 'Cabot Technology Solutions Pvt. Ltd.', '0484 404 5555', 'NOT_CONTACTED'),
  (32, 'Calpine Group', '+91 484 241 5030', 'NOT_CONTACTED'),
  (33, 'Cascade Revenue Management Pvt. Ltd', '0484 4861626', 'NOT_CONTACTED'),
  (34, 'Cavli Wireless', '8893204111', 'NOT_CONTACTED'),
  (35, 'Clevero India Pvt. Ltd.', '98952 25072', 'NOT_CONTACTED'),
  (36, 'CLOUDVICE', '9037122872', 'NOT_CONTACTED'),
  (37, 'CodeDesign Technologies Pvt Ltd', '7558825266', 'NOT_CONTACTED'),
  (38, 'CodeNext Technologies Pvt. Ltd.', '9447406836', 'NOT_CONTACTED'),
  (39, 'Cognicor Technologies Pvt.Ltd', '0484 241 5600', 'NOT_CONTACTED'),
  (40, 'Coinone Global Solutions Pvt Ltd', '+91 999 5205 444', 'NOT_CONTACTED'),
  (41, 'Conduent Business Services LLP', '0484-2020202', 'NOT_CONTACTED'),
  (42, 'Consoul Associates', '+91-9072256810', 'NOT_CONTACTED'),
  (43, 'CoolMinds Technologies Pvt Ltd.', '0484 241 5121', 'NOT_CONTACTED'),
  (44, 'Crossgen Technologies', '0484-2992021', 'NOT_CONTACTED'),
  (45, 'Cubet Techno Labs Pvt.Ltd', '0484-4054324', 'NOT_CONTACTED'),
  (46, 'Currentware India Pvt Ltd.', '+91-484-4055678', 'NOT_CONTACTED'),
  (47, 'CVS Info Solutions Private Limited', '+918921947372', 'NOT_CONTACTED'),
  (48, 'Cybrosys Technologies Pvt. Ltd.', '0484 320 0080', 'NOT_CONTACTED'),
  (49, 'Daddara', '8921062753', 'NOT_CONTACTED'),
  (50, 'DataPMI Technologies LLP', '+91-79078413781', 'NOT_CONTACTED'),
  (51, 'DBiz AI Solutions Pvt. Ltd.', '9995617998', 'NOT_CONTACTED'),
  (52, 'Difinity Digital', '+91 99950 99789', 'NOT_CONTACTED'),
  (53, 'Digiora Technologies Pvt.Ltd.', '0484 4061387', 'NOT_CONTACTED'),
  (54, 'Dimensions Cybertech India Pvt. Ltd.', '080-61860333', 'NOT_CONTACTED'),
  (55, 'Distinct Infotech Solutions', '+91 9074508742', 'NOT_CONTACTED'),
  (56, 'DOCGIANT SERVICES INDIA PVT.LTD.', '6282503130', 'NOT_CONTACTED'),
  (57, 'Dynactionize India Pvt Ltd', '+91 91 880 70144', 'NOT_CONTACTED'),
  (58, 'EGC Global Services India Pvt Ltd', '+91 9946567777', 'NOT_CONTACTED'),
  (59, 'EMATRIX SOFTWARE PRIVATE LIMITED', '+917356451100', 'NOT_CONTACTED'),
  (60, 'Emergio Technologies Pvt Ltd', '+91 7593898080', 'NOT_CONTACTED'),
  (61, 'Empay Software Solutions Private Limited', '0484-4865189', 'NOT_CONTACTED'),
  (62, 'Empress InfoTech', '0484-4042440', 'NOT_CONTACTED'),
  (63, 'Emsyne Technologies Private Limited', '0484-6677602 , 0484-6677604', 'NOT_CONTACTED'),
  (64, 'EnergyScape Renewables LLP', '+91 9207130069', 'NOT_CONTACTED'),
  (65, 'EPI-USE India Pvt.Ltd.', '+91 9778316023', 'NOT_CONTACTED'),
  (66, 'Eqsoft Business Solutions Pvt Ltd', '9946017660', 'NOT_CONTACTED'),
  (67, 'Exor India Pvt Ltd.', '04842415101', 'NOT_CONTACTED'),
  (68, 'Expeed Software Private Limited', '0091- 9633066613', 'NOT_CONTACTED'),
  (69, 'Experion Technologies', '04843067309', 'NOT_CONTACTED'),
  (70, 'Extravelmoney Technosol Private Limited', '9072000850', 'NOT_CONTACTED'),
  (71, 'Facade Global Pvt. Ltd.', '+91 0484 4010129', 'NOT_CONTACTED'),
  (72, 'FDC Web Technologies Pvt Ltd', '7025118844', 'NOT_CONTACTED'),
  (73, 'Federal Operations and Services Ltd (FedServ)', '04842412048, 8089908700', 'NOT_CONTACTED'),
  (74, 'Fine Destination', '7012155322', 'NOT_CONTACTED'),
  (75, 'Fingent Global Solutions', '0484-4055006', 'NOT_CONTACTED'),
  (76, 'Flycatch Infotech Pvt. Ltd.', '+91 7736830531', 'NOT_CONTACTED'),
  (77, 'Focaloid Technologies Private Limited', '+91-484-7136778', 'NOT_CONTACTED'),
  (78, 'Founding Minds software Pvt.Ltd', '0484-4042200, 4042202', 'NOT_CONTACTED'),
  (79, 'GEOJIT TECHNOLOGIES PVT LTD', '04842901901', 'NOT_CONTACTED'),
  (80, 'GIS AXIOM Pvt. Ltd.', '+91 81380 17386, 9995917386', 'NOT_CONTACTED'),
  (81, 'Gizmeon Technologies Private Limited', '+91 9645833111', 'NOT_CONTACTED'),
  (82, 'Global Infonet Inc', '9633138880', 'NOT_CONTACTED'),
  (83, 'Grapelime Innovations Private Limited.', '+91 484 401 1758', 'NOT_CONTACTED'),
  (84, 'Greenworld International Enterprise Private Limited', '+91 9947407002', 'NOT_CONTACTED'),
  (85, 'Grehasoft', '+91 8921540183', 'NOT_CONTACTED'),
  (86, 'Griphin Graphics', '09447576455', 'NOT_CONTACTED'),
  (87, 'HashRoot Technologies Pvt Ltd', '+91 484 404 1616', 'NOT_CONTACTED'),
  (88, 'IBS Software', '04847193700', 'NOT_CONTACTED'),
  (89, 'iCodeBees Private Limited', 'ph. - 98477 32355', 'NOT_CONTACTED'),
  (90, 'Idea Soft Solutions', '+91 9946675005', 'NOT_CONTACTED'),
  (91, 'IdeaGCS Private Limited', '+91 9746126217', 'NOT_CONTACTED'),
  (92, 'iLeaf Solutions Pvt Ltd.', '+91-9746226403', 'NOT_CONTACTED'),
  (93, 'IndustryApps Technologies Pvt Ltd', '+91 99462 60111', 'NOT_CONTACTED'),
  (94, 'Infintor Solutions LLP', '+919422799989', 'NOT_CONTACTED'),
  (95, 'INFOCYLANZ PVT. LTD.', '8921032682', 'NOT_CONTACTED'),
  (96, 'Infosmart Technologies Private Limited', '+91 99468 05010', 'NOT_CONTACTED'),
  (97, 'Inspired Software Development (India) LLP', '+91-9995229371', 'NOT_CONTACTED'),
  (98, 'Inspirisys Solutions Limited', '0484 - 3343403/3343404', 'NOT_CONTACTED'),
  (99, 'Inspite Technologies Pvt.Ltd', '8714153735', 'NOT_CONTACTED'),
  (100, 'iWEX Infomatics', '+919744783338', 'NOT_CONTACTED'),
  (101, 'Jachoos Technologies Private Limited', '+9181290 05574', 'NOT_CONTACTED'),
  (102, 'Johnkart Online Trade and Services Pvt Ltd', '+91 98470 41060', 'NOT_CONTACTED'),
  (103, 'JTSi Technologies India Private Limited', '0484 - 4070368', 'NOT_CONTACTED'),
  (104, 'Kakapo Systems India Private Limited', '+91 9946864488', 'NOT_CONTACTED'),
  (105, 'KnowBe4 India Private Limited', '+1-727-748-4221', 'NOT_CONTACTED'),
  (106, 'Mantle Solutions Private Limited', '0484-6633333', 'NOT_CONTACTED'),
  (107, 'Mantra IT Solutions', '9249087484', 'NOT_CONTACTED'),
  (108, 'MARLABS SOFTWARE', '91 0484 6062885, 6062886', 'NOT_CONTACTED'),
  (109, 'Mashuptech', '+91 4843514093, +91 8089612448, +91 6282589058', 'NOT_CONTACTED'),
  (110, 'McFadyen Digital', '9495662507', 'NOT_CONTACTED'),
  (111, 'Merabt Technologies Private Limited', '+91-7907092564', 'NOT_CONTACTED'),
  (112, 'Milestone Technologies', '91-484-4060800', 'NOT_CONTACTED'),
  (113, 'Millennium InfoLogic', '+91 484 4856688', 'NOT_CONTACTED'),
  (114, 'Mindcurv Technology Solutions Pvt. Ltd.', '0484 2100164', 'NOT_CONTACTED'),
  (115, 'MindLabs Systems Pvt Ltd', '9656056789', 'NOT_CONTACTED'),
  (116, 'mitz AI Minds Pvt Ltd', '9656730556', 'NOT_CONTACTED'),
  (117, 'Navicater Solutions India Pvt Ltd', '+91 9446 88 33 77, +91 8289 88 33 77', 'NOT_CONTACTED'),
  (118, 'NDimensionZ Solutions Pvt.Ltd.', '0484 - 6689999', 'NOT_CONTACTED'),
  (119, 'Neem Info Solutions Pvt. Ltd.', '8281155932', 'NOT_CONTACTED'),
  (120, 'Neork Technologies', '8547919763', 'NOT_CONTACTED'),
  (121, 'Nesote Technologies Pvt Ltd', '04842987111', 'NOT_CONTACTED'),
  (122, 'Nestsoft TechnoMaster PVT LTD', '+91 9895490866', 'NOT_CONTACTED'),
  (123, 'Netlyft Technologies Pvt Ltd', '+91 9207325275', 'NOT_CONTACTED'),
  (124, 'NewAgeSys Solutions (P) Ltd.', '0484-2983032 / 2983033', 'NOT_CONTACTED'),
  (125, 'Next Apps', '9916940449', 'NOT_CONTACTED'),
  (126, 'Niaway Technologies Pvt Ltd', '+91 6238833983', 'NOT_CONTACTED'),
  (127, 'Niche Techies', '9995333078', 'NOT_CONTACTED'),
  (128, 'Noa Infosolutions LLP', '9846002792', 'NOT_CONTACTED'),
  (129, 'Offline Human Studios', '+91 9995479222', 'NOT_CONTACTED'),
  (130, 'Onesoft Technologies LLP', '+91-96567 07783', 'NOT_CONTACTED'),
  (131, 'Opshore Talent Solutions Pvt.Ltd.', '9995205566', 'NOT_CONTACTED'),
  (132, 'Orestes Technologies Pvt Ltd', '+91 80896 71177', 'NOT_CONTACTED'),
  (133, 'Orion India Systems Pvt. Ltd.', '+91 484 6616100', 'NOT_CONTACTED'),
  (134, 'Ormeon IT Consulting Pvt Ltd', '+91 94472 14688', 'NOT_CONTACTED'),
  (135, 'PanashiFZCO Technology Solution Private Limited', '04842915045', 'NOT_CONTACTED'),
  (136, 'Paoyaila Animation Studios LLP', '+919400197544', 'NOT_CONTACTED'),
  (137, 'PaulCart E Commerce Pvt. Ltd.', '9995434111', 'NOT_CONTACTED'),
  (138, 'Penguin Data Centre Pvt.Ltd.', '+91-6238309752', 'NOT_CONTACTED'),
  (139, 'PIT Solutions Private Limited', '04712700915', 'NOT_CONTACTED'),
  (140, 'Pixdynamics', '+91 79944 31750', 'NOT_CONTACTED'),
  (141, 'Portrave Solutions Pvt Ltd', '+91484 4070667', 'NOT_CONTACTED'),
  (142, 'Pueblo Shades Pvt.Ltd', '80752 45591', 'NOT_CONTACTED'),
  (143, 'Qubiqon Consulting India Private Limited', '91 9995222141', 'NOT_CONTACTED'),
  (144, 'Quper Technologies Pvt. Ltd.', '+91-8891295315', 'NOT_CONTACTED'),
  (145, 'RedBlack Technologies Private Limited', '+919605623900', 'NOT_CONTACTED'),
  (146, 'Redux (Network Redux)', '0484 2972794', 'NOT_CONTACTED'),
  (147, 'Rextech Studios', '9562965493', 'NOT_CONTACTED'),
  (148, 'ROGERSOFT', '9995207676', 'NOT_CONTACTED'),
  (149, 'RUBY SEVEN STUDIOS', '04844059440', 'NOT_CONTACTED'),
  (150, 'SBL Knowledge Services Pvt Ltd', '98957 64867', 'NOT_CONTACTED'),
  (151, 'SE-Mentor Solutions', '7306021783', 'NOT_CONTACTED'),
  (152, 'Seeroo IT Solutions', '+91 484 298 5660', 'NOT_CONTACTED'),
  (153, 'Seguro Technologies', '8078791340', 'NOT_CONTACTED'),
  (154, 'Senscript Technologies Pvt Ltd', '+91-9037122872', 'NOT_CONTACTED'),
  (155, 'Simelabs - An Astek Company', '04844874290', 'NOT_CONTACTED'),
  (156, 'Skybertech IT Innovation Pvt Ltd', '+91 7592 888 111', 'NOT_CONTACTED'),
  (157, 'SMEC Automation Pvt Ltd', '9656227714', 'NOT_CONTACTED'),
  (158, 'SnippetCommerce360 Pvt Ltd', '+91 9061234445', 'NOT_CONTACTED'),
  (159, 'Sofdia Technologies Pvt Ltd', '+91 9037021110', 'NOT_CONTACTED'),
  (160, 'Softop Solutions Pvt Ltd', '+971 529822133', 'NOT_CONTACTED'),
  (161, 'Softspace Infotech Pvt Ltd', '+91 9847811647', 'NOT_CONTACTED'),
  (162, 'Speridian Technologies Pvt Ltd', '+91 484 401 7951', 'NOT_CONTACTED'),
  (163, 'Spiderline Technologies', '+91 97453 66367', 'NOT_CONTACTED'),
  (164, 'Spiralcode Innovates LLP', '8590041414', 'NOT_CONTACTED'),
  (165, 'Steigend IT Solutions', '9946161106', 'NOT_CONTACTED'),
  (166, 'Stepping Stone Consultancy Services', '+91- 0484 - 2989811', 'NOT_CONTACTED'),
  (167, 'Syriac Consultancy Services Private Limited', '+91 8136923078', 'NOT_CONTACTED'),
  (168, 'SysTalent Software Private Limited', '+91 484 2415230', 'NOT_CONTACTED'),
  (169, 'Talk Digital Pvt. Ltd.', '9446581090', 'NOT_CONTACTED'),
  (170, 'Tamcherry Technologies Private Limited', '09633303943', 'NOT_CONTACTED'),
  (171, 'Tata Consultancy Services,', '0484 618 7000', 'NOT_CONTACTED'),
  (172, 'TECFORZ INNOVATIONS', '0484 4632159', 'NOT_CONTACTED'),
  (173, 'Techfriar Technologies', '+91-7356899156', 'NOT_CONTACTED'),
  (174, 'Technowave ID Systems PVT.LTD.', '8139021117', 'NOT_CONTACTED'),
  (175, 'TechTaliya Informatics Pvt. Ltd.', '+91 484 403 6777', 'NOT_CONTACTED'),
  (176, 'Techversant Infotech Pvt Ltd', '0484 4014666', 'NOT_CONTACTED'),
  (177, 'Tecnostac Systems Private Limited', '+91 95670 63871', 'NOT_CONTACTED'),
  (178, 'Telious Technologies Pvt Ltd', '+91 94956 58233', 'NOT_CONTACTED'),
  (179, 'Testing Mavens Software Pvt Ltd', '+91 8138924300', 'NOT_CONTACTED'),
  (180, 'Thinkpalm Technologies Pvt.Ltd', '0484-4104100', 'NOT_CONTACTED'),
  (181, 'ThoughtMinds System Pvt Ltd', '+91 7510303111', 'NOT_CONTACTED'),
  (182, 'Thriveminds Technologies Pvt. Ltd.', '09074535476', 'NOT_CONTACTED'),
  (183, 'Titan Tech Emirates Pvt Ltd', '9591546465', 'NOT_CONTACTED'),
  (184, 'TNP Consultancy Private Limited', '+91 8139894880', 'NOT_CONTACTED'),
  (185, 'Toobler Technologies Pvt. Ltd.', '91-484 4034359', 'NOT_CONTACTED'),
  (186, 'TouchWorld Technology', '0474 2970 298', 'NOT_CONTACTED'),
  (187, 'Trafoss Pvt.Ltd', '+91-4844874264', 'NOT_CONTACTED'),
  (188, 'Travancore Analytics Pvt.Ltd.', '9188955501', 'NOT_CONTACTED'),
  (189, 'Turqosoft Solutions Pvt. Ltd.', '+91 98412 05845', 'NOT_CONTACTED'),
  (190, 'Unilaw Global Private Limited', '+91 99950 45717', 'NOT_CONTACTED'),
  (191, 'US Technology International Pvt Ltd', '0484-4040000', 'NOT_CONTACTED'),
  (192, 'Vaisesika Consulting Private Limited', '8547432502', 'NOT_CONTACTED'),
  (193, 'Varishtha Infotech Services Pvt Ltd.', '+971 58 5049701', 'NOT_CONTACTED'),
  (194, 'Veeble SoftTech (P) Ltd.', '7012099465', 'NOT_CONTACTED'),
  (195, 'Verteil Technologies Private Limited,', '+91-484-4019970', 'NOT_CONTACTED'),
  (196, 'Viewy Digital P(Ltd)', '00914842331101', 'NOT_CONTACTED'),
  (197, 'Violet Frames', '9744403855', 'NOT_CONTACTED'),
  (198, 'VIPoint Solutions Pvt Ltd', '484-4050222', 'NOT_CONTACTED'),
  (199, 'Virtual Impulse Technologies', '+91 9847670036', 'NOT_CONTACTED'),
  (200, 'Vortexen Dynamics', '+918848850414', 'NOT_CONTACTED'),
  (201, 'Voyon Technology Pvt Ltd', '06282685797', 'NOT_CONTACTED'),
  (202, 'Vtrio Solutions Private Limited', '91-9656600307', 'NOT_CONTACTED'),
  (203, 'Webdura Technologies', '8714746555', 'NOT_CONTACTED'),
  (204, 'Wipro Limited', '0484-4320685', 'NOT_CONTACTED'),
  (205, 'WOC Branding Systems Pvt Ltd', '+91 9447306003', 'NOT_CONTACTED'),
  (206, 'Yatnam Technologies', '+91484-404-9024', 'NOT_CONTACTED'),
  (207, 'Zellis HR India Pvt.Ltd.', '+91 484 486 5758', 'NOT_CONTACTED'),
  (208, 'Zoiteckh Informations Solutions', '+91-7306892494', 'NOT_CONTACTED')
on conflict (company_name) do update
set serial_number = excluded.serial_number,
    phone_number = excluded.phone_number
where public.companies.status = 'NOT_CONTACTED';
