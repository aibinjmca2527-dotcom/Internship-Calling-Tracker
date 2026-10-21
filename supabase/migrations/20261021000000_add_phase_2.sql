-- =====================================================================
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
  (1, '2Hats Logic Solutions Pvt. Ltd.', '0484 487 8903', 'NOT_CONTACTED', 'Phase 2'),
  (2, '42Square Technologies', '8078186103', 'NOT_CONTACTED', 'Phase 2'),
  (3, 'Abilytics Consulting Pvt Ltd', '+91 9496061623', 'NOT_CONTACTED', 'Phase 2'),
  (4, 'Acabes International Pvt. Ltd.', '04844225166', 'NOT_CONTACTED', 'Phase 2'),
  (5, 'adesso India Private Ltd', '+91- 77360 95222', 'NOT_CONTACTED', 'Phase 2'),
  (6, 'Admaren Tech Pvt Ltd', '+91 96333 84111', 'NOT_CONTACTED', 'Phase 2'),
  (7, 'AlignMinds Technologies', '8590036453', 'NOT_CONTACTED', 'Phase 2'),
  (8, 'Alphasky Ventures Pvt. Ltd.', '9895632200', 'NOT_CONTACTED', 'Phase 2'),
  (9, 'Amara Raja Design Alpha Private Limited', '+91 8590905049', 'NOT_CONTACTED', 'Phase 2'),
  (10, 'Apps Team Technologies Pvt.Ltd.', '+91 484 2982554', 'NOT_CONTACTED', 'Phase 2'),
  (11, 'Aptlylabs India Pvt Ltd', '+91 9633198444', 'NOT_CONTACTED', 'Phase 2'),
  (12, 'Armia Systems Pvt. Ltd', '0484 297 3123', 'NOT_CONTACTED', 'Phase 2'),
  (13, 'Ayata Commerce Tech Solutions Pvt Ltd', '+919995473245', 'NOT_CONTACTED', 'Phase 2'),
  (14, 'Braid Technologies Pvt. Ltd', '9847128982', 'NOT_CONTACTED', 'Phase 2'),
  (15, 'Brennan IT India Private Limited', '8097548206', 'NOT_CONTACTED', 'Phase 2'),
  (16, 'CareRevenue Technology Pvt. Ltd.', '7510200399', 'NOT_CONTACTED', 'Phase 2'),
  (17, 'Carnegie Worldwide Services Pvt Ltd', '04844609761', 'NOT_CONTACTED', 'Phase 2'),
  (18, 'CHISQUARE LABS', '7356949900', 'NOT_CONTACTED', 'Phase 2'),
  (19, 'Classic Technologies & Business Solutions Pvt. Ltd.', '+91 9048400038', 'NOT_CONTACTED', 'Phase 2'),
  (20, 'ClaySys Technologies Pvt.Ltd', '0484 297 5311', 'NOT_CONTACTED', 'Phase 2'),
  (21, 'Cloudium Software Pvt. Ltd.', '04844850733', 'NOT_CONTACTED', 'Phase 2'),
  (22, 'Codelynks Software Solutions Private Limited', '0484 402 6866', 'NOT_CONTACTED', 'Phase 2'),
  (23, 'Codmeric Infotech Pvt. Ltd.', '+91 9605111710', 'NOT_CONTACTED', 'Phase 2'),
  (24, 'Cognizant Technology Solutions', '0484 392 1000', 'NOT_CONTACTED', 'Phase 2'),
  (25, 'CSEIDC TECHNOLOGIES PVT LTD', '+91 9037005084', 'NOT_CONTACTED', 'Phase 2'),
  (26, 'Cyberion Software Solutions Pvt Ltd', '+91 9995801261', 'NOT_CONTACTED', 'Phase 2'),
  (27, 'Datafloat Technologies India Pvt Ltd', '0484 2975161', 'NOT_CONTACTED', 'Phase 2'),
  (28, 'Direct7 Telecom Solutions Pvt Ltd', '9061031705', 'NOT_CONTACTED', 'Phase 2'),
  (29, 'Dooth Internet Service Pvt. Ltd.', '+91 9249097368', 'NOT_CONTACTED', 'Phase 2'),
  (30, 'Dynamed Healthcare Solutions Pvt.Ltd.', '9072955500, 0484-2977227', 'NOT_CONTACTED', 'Phase 2'),
  (31, 'Edstem Technologies Pvt Ltd', '+91 9048738807', 'NOT_CONTACTED', 'Phase 2'),
  (32, 'Electrifex Technologies Pvt. Ltd', '+91 8590137646', 'NOT_CONTACTED', 'Phase 2'),
  (33, 'Enveetech BIM Solutions Pvt. Ltd.', '8136809837', 'NOT_CONTACTED', 'Phase 2'),
  (34, 'Epixel Solutions Pvt Ltd', '+91491 2970123', 'NOT_CONTACTED', 'Phase 2'),
  (35, 'Exponential Digital Solutions Pvt.Ltd.', '+91 471 254 4210', 'NOT_CONTACTED', 'Phase 2'),
  (36, 'Feathersoft Info Solutions Private Ltd', '+91 7736028401', 'NOT_CONTACTED', 'Phase 2'),
  (37, 'FIRMINIQ SYSTEMS', '+916284303739', 'NOT_CONTACTED', 'Phase 2'),
  (38, 'Gapblue Software Labs Pvt Ltd', '0484-4010593', 'NOT_CONTACTED', 'Phase 2'),
  (39, 'Global Surf IT Pvt Ltd', '7012605646', 'NOT_CONTACTED', 'Phase 2'),
  (40, 'Hatio Innovations Private Limited', '+91 8606434912', 'NOT_CONTACTED', 'Phase 2'),
  (41, 'Heidelsoft Technologies Private Limited', '0484-2971190', 'NOT_CONTACTED', 'Phase 2'),
  (42, 'HH Back Office Services Pvt Ltd', '0484-6715400', 'NOT_CONTACTED', 'Phase 2'),
  (43, 'Hotpack Global', '9895677424', 'NOT_CONTACTED', 'Phase 2'),
  (44, 'HTIC Global', '0484 4042400', 'NOT_CONTACTED', 'Phase 2'),
  (45, 'iDatalytics Pvt. Ltd.', '9447034712', 'NOT_CONTACTED', 'Phase 2'),
  (46, 'Impaqtive Technologies India Pvt Ltd', '+91-9895633744', 'NOT_CONTACTED', 'Phase 2'),
  (47, 'In-Tech Group India Private Limited', '+91 7907673191', 'NOT_CONTACTED', 'Phase 2'),
  (48, 'InApp Information Technologies India Pvt Ltd', '+91 471 277 1800', 'NOT_CONTACTED', 'Phase 2'),
  (49, 'Incede Technologies Pvt Ltd', '0484 2981 655', 'NOT_CONTACTED', 'Phase 2'),
  (50, 'Innovature Software Labs (P) Ltd', '0484 - 4038120', 'NOT_CONTACTED', 'Phase 2'),
  (51, 'Inntot Technologies Private Limited', '+91- 484 298 5898', 'NOT_CONTACTED', 'Phase 2'),
  (52, 'Internland Technology Services Private Limited', '7012460522', 'NOT_CONTACTED', 'Phase 2'),
  (53, 'JohnTuringWatson Software Solutions Pvt Ltd', '9188933408', 'NOT_CONTACTED', 'Phase 2'),
  (54, 'Katzion Technology Solutions LLP', '0484 4858680', 'NOT_CONTACTED', 'Phase 2'),
  (55, 'KOTT SOFTWARE PRIVATE LIMITED', '0484- 2362860 / 2979898 / 2371741', 'NOT_CONTACTED', 'Phase 2'),
  (56, 'Krythium Solutions Private Limited', '91 7511101166', 'NOT_CONTACTED', 'Phase 2'),
  (57, 'Lanware Solutions', '+91- 9778423737', 'NOT_CONTACTED', 'Phase 2'),
  (58, 'Linnk Outsource Solutions India Pvt Ltd', '+91 9778418989', 'NOT_CONTACTED', 'Phase 2'),
  (59, 'LINXAS IT CONSULTING PRIVATE LIMITED', '+91-8301076022', 'NOT_CONTACTED', 'Phase 2'),
  (60, 'Maxxion Systems Private Limited', '+918547906576', 'NOT_CONTACTED', 'Phase 2'),
  (61, 'Metclouds Technologies Pvt Ltd', '0484-4030103', 'NOT_CONTACTED', 'Phase 2'),
  (62, 'MindLabs Consultancy Services LLP', '0484 4046900', 'NOT_CONTACTED', 'Phase 2'),
  (63, 'Mitsogo', '8921244876', 'NOT_CONTACTED', 'Phase 2'),
  (64, 'Nesa Software Pvt Ltd', '+91 75938 33663', 'NOT_CONTACTED', 'Phase 2'),
  (65, 'Netsentries Infosec Solutions Pvt.Ltd.', '+91-484-4148299', 'NOT_CONTACTED', 'Phase 2'),
  (66, 'Nuvento Systems Private Limited', '0484 4066070', 'NOT_CONTACTED', 'Phase 2'),
  (67, 'Nymbl', '91 77366 98555', 'NOT_CONTACTED', 'Phase 2'),
  (68, 'Origent Technologies', '08891113129', 'NOT_CONTACTED', 'Phase 2'),
  (69, 'ORTHOFX PRIVATE LIMITED', '+91 8848317153', 'NOT_CONTACTED', 'Phase 2'),
  (70, 'Overbrook Technology Services (P) Ltd', '0484-2883801', 'NOT_CONTACTED', 'Phase 2'),
  (71, 'Paradigm IT Private Limited', '+91 8086257998', 'NOT_CONTACTED', 'Phase 2'),
  (72, 'Pinmicro India Pvt.Ltd.', '+91 4844055675', 'NOT_CONTACTED', 'Phase 2'),
  (73, 'PiServe Solutions Pvt Ltd', '+91-9895229562', 'NOT_CONTACTED', 'Phase 2'),
  (74, 'Planet Media India (PMIN Agency Pvt.Ltd.)', '9778149518', 'NOT_CONTACTED', 'Phase 2'),
  (75, 'Prevalent AI', '0484-4361111', 'NOT_CONTACTED', 'Phase 2'),
  (76, 'PrimeCrown Technologies (P) Limited', '+91-8547859999', 'NOT_CONTACTED', 'Phase 2'),
  (77, 'Pumex InfoTech Pvt Ltd', '0484-4016369', 'NOT_CONTACTED', 'Phase 2'),
  (78, 'QC Verify Private Limited', '0484 4020024', 'NOT_CONTACTED', 'Phase 2'),
  (79, 'Qubeslab Technologies Private Limited', '9383401029', 'NOT_CONTACTED', 'Phase 2'),
  (80, 'Quest Global Engineering Services Pvt Ltd', '7593823160', 'NOT_CONTACTED', 'Phase 2'),
  (81, 'Rainybits Technology Pvt Ltd', '0484-4047033', 'NOT_CONTACTED', 'Phase 2'),
  (82, 'Regent Global Services (India) Pvt.Ltd.', '0484 2982150', 'NOT_CONTACTED', 'Phase 2'),
  (83, 'Retyn Business Solution Pvt. Ltd.', '+91 9037964001', 'NOT_CONTACTED', 'Phase 2'),
  (84, 'REXAV LLP', '+91 7994480220', 'NOT_CONTACTED', 'Phase 2'),
  (85, 'Servsys Technology Services India Pvt Ltd', '+91 80 8638 8637', 'NOT_CONTACTED', 'Phase 2'),
  (86, 'Soulxes Technologies Pvt Ltd', '+914842916448', 'NOT_CONTACTED', 'Phase 2'),
  (87, 'SparkSupport Infotech Pvt Ltd', '8129270421', 'NOT_CONTACTED', 'Phase 2'),
  (88, 'SS Consulting', '+91 8129688272', 'NOT_CONTACTED', 'Phase 2'),
  (89, 'Stream Perfect Global Services (SPGS)', '0484-2972793', 'NOT_CONTACTED', 'Phase 2'),
  (90, 'SupportHub360', '9633 024 360', 'NOT_CONTACTED', 'Phase 2'),
  (91, 'TechNeurons Consulting Solutions Private Limited', '+91 7736001501', 'NOT_CONTACTED', 'Phase 2'),
  (92, 'Techpullers Technology Solutions Pvt Ltd.', '+919895156580', 'NOT_CONTACTED', 'Phase 2'),
  (93, 'Techware Lab Pvt.Ltd.', '+91 9567787002', 'NOT_CONTACTED', 'Phase 2'),
  (94, 'Terrific Minds Private Limited', '+91 7559903555', 'NOT_CONTACTED', 'Phase 2'),
  (95, 'Thomsun Infocare LLP', '+919995868299', 'NOT_CONTACTED', 'Phase 2'),
  (96, 'Tranzmeo', '0484-4033744', 'NOT_CONTACTED', 'Phase 2'),
  (97, 'Tuttifrutti Games Pvt Ltd', '9446435606', 'NOT_CONTACTED', 'Phase 2'),
  (98, 'UROLIME', '0484-2984589', 'NOT_CONTACTED', 'Phase 2'),
  (99, 'Vistas Global Intellect Private Limited', '+918138914366', 'NOT_CONTACTED', 'Phase 2'),
  (100, 'Voxtron Solutions LLP', '+91-7356218111', 'NOT_CONTACTED', 'Phase 2'),
  (101, 'VVDN Technologies Pvt Ltd', '+91 9778642081', 'NOT_CONTACTED', 'Phase 2'),
  (102, 'White Rabbit Group', '6282370765', 'NOT_CONTACTED', 'Phase 2'),
  (103, 'WORKSENT TECHNOLOGIES PVT LTD', '79941677773', 'NOT_CONTACTED', 'Phase 2'),
  (104, 'Yatnam Technologies', '+91484-404-9024', 'NOT_CONTACTED', 'Phase 2'),
  (105, 'YOUGotaGift Pvt Ltd', '+91 9895482001', 'NOT_CONTACTED', 'Phase 2'),
  (106, 'Zealogics IT Solutions', '0484 4049055', 'NOT_CONTACTED', 'Phase 2'),
  (107, 'Zinbay India Pvt.Ltd.', '+91 999 590 7220', 'NOT_CONTACTED', 'Phase 2')
on conflict (phase, company_name) do update
set serial_number = excluded.serial_number,
    phone_number = excluded.phone_number
where public.companies.status = 'NOT_CONTACTED';
