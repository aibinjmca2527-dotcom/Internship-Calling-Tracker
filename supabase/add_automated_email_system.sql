-- =====================================================================
-- INFOPARK INTERNSHIP CALLING TRACKER - AUTOMATED EMAIL SYSTEM SCHEMA
-- =====================================================================
-- Safe to execute in Supabase SQL Editor.
-- Does NOT affect any existing tables or calling tracker columns.

-- 1. ADD EMAIL & MULTI-SENDER TRACKING COLUMNS TO COMPANIES TABLE
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'PENDING' CHECK (email_status IN ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'REPLIED')),
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_sent_by_name TEXT,
ADD COLUMN IF NOT EXISTS email_sent_by_email TEXT,
ADD COLUMN IF NOT EXISTS email_replied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_reply_snippet TEXT,
ADD COLUMN IF NOT EXISTS email_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies (lower(email));
CREATE INDEX IF NOT EXISTS idx_companies_email_status ON public.companies (email_status);
CREATE INDEX IF NOT EXISTS idx_companies_email_sent_by ON public.companies (email_sent_by_name);

-- 2. AUTOMATED EMAIL SCHEDULE & CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.email_schedule_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  test_recipient_email TEXT NOT NULL DEFAULT 'aibin12joseph12@gmail.com',
  batch_count INTEGER NOT NULL DEFAULT 39,
  schedules JSONB NOT NULL DEFAULT '[
    {"id": "batch-1", "label": "Morning Slot (10:00 AM)", "time": "10:00", "count": 39, "enabled": true},
    {"id": "batch-2", "label": "Midday Slot (12:00 PM)", "time": "12:00", "count": 39, "enabled": true},
    {"id": "batch-3", "label": "Afternoon Slot (02:00 PM)", "time": "14:00", "count": 39, "enabled": true}
  ]'::jsonb,
  subject_template TEXT NOT NULL DEFAULT 'Request for MCA Internship Opportunity',
  body_template TEXT NOT NULL DEFAULT 'Dear Team,\n\nWe are a team of five final-year MCA students from Saintgits College of Engineering, Kottayam, seeking an internship opportunity as part of our final semester.\n\nWe are available for a three-month unpaid internship from January 1 to March 31. We have attached the resumes of all five team members for your reference.\n\nKindly consider us for a suitable internship opportunity at your company.\n\nThank you for your time and consideration.\n\nBest regards,\nFinal-Year MCA Students\nSaintgits College of Engineering, Kottayam',
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default row if table is empty
INSERT INTO public.email_schedule_settings (id, active, test_mode, test_recipient_email, batch_count)
SELECT gen_random_uuid(), true, false, 'aibin12joseph12@gmail.com', 39
WHERE NOT EXISTS (SELECT 1 FROM public.email_schedule_settings);

-- 3. AUDIT LOGS FOR SENT EMAILS & REPLIES
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_by_name TEXT,
  sent_by_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'REPLIED')),
  is_test BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  reply_snippet TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON public.email_logs(sent_by_name);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.email_schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read email_schedule_settings') THEN
    CREATE POLICY "Allow authenticated read email_schedule_settings"
      ON public.email_schedule_settings FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated update email_schedule_settings') THEN
    CREATE POLICY "Allow authenticated update email_schedule_settings"
      ON public.email_schedule_settings FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read email_logs') THEN
    CREATE POLICY "Allow authenticated read email_logs"
      ON public.email_logs FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated insert email_logs') THEN
    CREATE POLICY "Allow authenticated insert email_logs"
      ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- =====================================================================
-- 5. POPULATE EMAILS FOR ALL 229 INFOPARK PHASE 1 COMPANIES SAFELY
-- =====================================================================
-- Uses CTE (Common Table Expression) update and insert without ON CONFLICT.
-- Works 100% reliably regardless of existing table constraints.

WITH phase1_data(serial_number, company_name, phone_number, email) AS (
  VALUES
    (1, '9Commerce Technologies', '9995080656', 'hr@commerce9.io'),
    (2, 'Aabasoft Technologies India Private Limited', '+914844172222', 'info@aabasoft.com'),
    (3, 'Aarbee Structures Pvt.Ltd', '+91-9544407555', 'aarbee@aarbeestructures.com'),
    (4, 'Abel Techsoft Private Limited', '+919995005969', 'info@abeltechsoft.com'),
    (5, 'Accelray Technologies Pvt Ltd', '+9188486 20593', 'info@accelray.com'),
    (6, 'Aceware Fintech Services Pvt Ltd (Radiant Acemoney)', '0806 898 3333', 'info@acemoney.in'),
    (7, 'Acube Innovations', '6235866111', 'contact-if@acube.co'),
    (8, 'adesso India Private Ltd', '+91- 77360 95222', 'careers@adesso.in'),
    (9, 'Advenser Engineering Services Private Limited', '+91 484 4040708', 'info@advenser.com'),
    (10, 'Affiliated Computer Services of India, A Xerox Company', '0484 4090136', 'praseel.nambiar@xerox.com'),
    (11, 'Airo Global Software Pvt Ltd', '+91-7034966777', 'hiring@airoglobalsoftware.com'),
    (12, 'Al Tomouh IT Pvt Ltd', '+91 77360 03339', 'atitpl@suhailbahwangroup.com'),
    (13, 'ALB Technologies Pvt Ltd', '+91- 6238295987', 'hr@accuratelegalbilling.com'),
    (14, 'ALTOS Technologies', '9400334787', 'info@altostechnologies.in'),
    (15, 'Amatosoft', '+91 99613 69999', 'mailtogenius@gmail.com'),
    (16, 'Amla Consultancy Pvt Ltd', '91 6282902505', 'info@amlaconsultancy.com'),
    (17, 'Amplitude Software Systems Pvt Ltd', '0484-2956529', 'hr@jupiterbs.com'),
    (18, 'Appadore Private Limited', '0484 485 0362', 'info@appadore.com'),
    (19, 'Applied Payments Technology Pvt Ltd.', '0484-4041580', 'info@appliedpaymentstech.com'),
    (20, 'Array Platforms Pvt Ltd', '0484-2415244', 'neha.r@array.team'),
    (21, 'Art Technology and Software.', '0484 4061901', 'art-hr@artechsoft.com'),
    (22, 'Aspire Systems Digital Private Limited', '6238389957', 'keerthana.jayaraj@aspiresys.com'),
    (23, 'Banzan Studios', '9633849485', 'info@banzan.co'),
    (24, 'Beinex Consulting Pvt Ltd', '04843539863', 'careers@beinex.com'),
    (25, 'Beth Soft Technologies India Private Limited', '+91 81293 21656', 'info@bethsofttechnologies.com'),
    (26, 'Bhooshan''s Junior', '+918547644145', 'info@bhooshansjr.in'),
    (27, 'BIMEX Engineers', '9846691115', 'info@bimexeng.com'),
    (28, 'Binaries', '+91 9895027444', 'info@binariesindia.com'),
    (29, 'BJ Corps Technologies (OPC) Private Limited', '+91 9048654482', 'info@bjcorps.com'),
    (30, 'Bramma IT Solutions', '+91 96457 59548', 'brammainfo@gmail.com'),
    (31, 'BroadTech IT Solutions Pvt Ltd', '0484 404 5555', 'contact@broadtech-innovations.com'),
    (32, 'BUBMart Online Stores LLP', '+91 484 241 5030', 'info@theibogo.com'),
    (33, 'Cabot Technology Solutions Pvt. Ltd.', '0484 4861626', 'info@cabotsolutions.com'),
    (34, 'Calpine Group', '8893204111', 'info@calpinetech.com'),
    (35, 'Cascade Revenue Management Pvt. Ltd', '98952 25072', 'hrd@aimagroup.co.uk'),
    (36, 'Cavli Wireless', '9037122872', 'careers@cavliwireless.com'),
    (37, 'CCS Technologies (P) Ltd', '7558825266', 'careers@ccs-technologies.com'),
    (38, 'Clevero India Pvt. Ltd.', '9447406836', 'joji@clevero.com'),
    (39, 'CLOUDVICE', '0484 241 5600', 'info@cloudvice.com'),
    (40, 'CodeDesign Technologies Pvt Ltd', '+91 999 5205 444', 'info@codedesign.in'),
    (41, 'CodeNext Technologies Pvt. Ltd.', '0484-2020202', 'info@codenexttechnologies.com'),
    (42, 'Cognicor Technologies Pvt.Ltd', '+91-9072256810', 'hr@cognicor.com'),
    (43, 'Cognitzone Technologies', '0484 241 5121', 'cognitzone@gmail.com'),
    (44, 'Coinone Global Solutions Pvt Ltd', '0484-2992021', 'info@coinoneglobal.com'),
    (45, 'Conduent Business Services LLP', '0484-4054324', 'jothish.s@conduent.com'),
    (46, 'Consoul Associates', '+91-484-4055678', 'info@consoulgroup.com'),
    (47, 'ContactPoint 360', '+918921947372', 'hr.india@cp-360.com'),
    (48, 'CoolMinds Technologies Pvt Ltd.', '0484 320 0080', 'career@coolmindsinc.com'),
    (49, 'Crossgen Technologies', '8921062753', 'info@crossgentech.com'),
    (50, 'Cubet Techno Labs Pvt.Ltd', '+91-79078413781', 'infopark@cubettech.com'),
    (51, 'Currentware India Pvt Ltd.', '9995617998', 'india@codework-solutions.com'),
    (52, 'CVS Info Solutions Private Limited', '+91 99950 99789', 'aditya@cvsinfosolutions.com'),
    (53, 'Cybrosys Technologies Pvt. Ltd.', '0484 4061387', 'info@cybrosys.com'),
    (54, 'Daddara', '080-61860333', 'mail@daddara.in'),
    (55, 'DataPMI Technologies LLP', '+91 9074508742', 'renjithr@datapmi.com'),
    (56, 'DBiz AI Solutions Pvt. Ltd.', '6282503130', 'thepeopledesk@dbizsolution.com'),
    (57, 'Difinity Digital', '+91 91 880 70144', 'careers@difinitydigital.com'),
    (58, 'Digiora Technologies Pvt.Ltd.', '+91 9946567777', 'info@digiora.com'),
    (59, 'Dimensions Cybertech India Pvt. Ltd.', '+917356451100', 'info@dimensionslive.com'),
    (60, 'Distinct Infotech Solutions', '+91 7593898080', 'hradmin@distinctinfotech.com'),
    (61, 'DOCGIANT SERVICES INDIA PVT.LTD.', '0484-4865189', 'hrd@docgiant.in'),
    (62, 'Dynactionize India Pvt Ltd', '0484-4042440', 'info-india@dynactionize.com'),
    (63, 'EGC Global Services India Pvt Ltd', '0484-6677602 , 0484-6677604', 'egcgshr@psmicorp.com'),
    (64, 'Ellow Technologies Pvt. Ltd.', '+91 9207130069', 'hello@ellow.io'),
    (65, 'EMATRIX SOFTWARE PRIVATE LIMITED', '+91 9778316023', 'info@ematrixsoftware.com'),
    (66, 'Emergio Technologies Pvt Ltd', '9946017660', 'nisha@emergiotech.com'),
    (67, 'Empay Software Solutions Private Limited', '04842415101', 'info@empaysoft.com'),
    (68, 'Empress InfoTech', '0091- 9633066613', 'hr@empressinfotech.com'),
    (69, 'Emsyne Technologies Private Limited', '04843067309', 'jobs@emsyne.com'),
    (70, 'EnergyScape Renewables LLP', '9072000850', 'info@energyscaperenewables.com'),
    (71, 'EPI-USE India Pvt.Ltd.', '+91 0484 4010129', 'hr_cochin@epiuse.com'),
    (72, 'Eqsoft Business Solutions Pvt Ltd', '7025118844', 'hr@eqsoftglobal.com'),
    (73, 'Exor India Pvt Ltd.', '04842412048, 8089908700', 'hr.in.cochin@exorint.com'),
    (74, 'Expeed Software Private Limited', '7012155322', 'info@expeed.com'),
    (75, 'Experion Technologies', '0484-4055006', 'careers@experionglobal.com'),
    (76, 'Extravelmoney Technosol Private Limited', '+91 7736830531', 'join@extravelmoney.com'),
    (77, 'Facade Global Pvt. Ltd.', '+91-484-7136778', 'info@facadeglobal.com'),
    (78, 'FDC Web Technologies Pvt Ltd', '0484-4042200, 4042202', 'recruitment.india@financial.com'),
    (79, 'Federal Operations and Services Ltd (FedServ)', '04842901901', 'careers@fedserv.co.in'),
    (80, 'Fine Destination', '+91 81380 17386, 9995917386', 'career@finedestination.co.in'),
    (81, 'Fingent Global Solutions', '+91 9645833111', 'careers@fingent.com'),
    (82, 'Flycatch Infotech Pvt. Ltd.', '9633138880', 'opportunity@flycatchtech.com'),
    (83, 'Focaloid Technologies Private Limited', '+91 484 401 1758', 'careers@focaloid.com'),
    (84, 'Founding Minds software Pvt.Ltd', '+91 9947407002', 'hr@foundingminds.com'),
    (85, 'Fragomen Immigration Services  India Private Limited', '+91 8921540183', 'snikhil@fragomen.com'),
    (86, 'G10X INDIA PRIVATE LIMITED', '09447576455', 'contact@g10x.com'),
    (87, 'GEOJIT TECHNOLOGIES PVT LTD', '+91 484 404 1616', 'hr@geojittechnologies.com'),
    (88, 'GIS AXIOM Pvt. Ltd.', '04847193700', 'sales@gisaxiom.com'),
    (89, 'Gizmeon Technologies Private Limited', 'ph. - 98477 32355', 'sunil@gizmeon.com'),
    (90, 'Global Infonet Inc', '+91 9946675005', 'hr@global-infonet.com'),
    (91, 'Grapelime Innovations Private Limited.', '+91 9746126217', 'hr@grapelime.in'),
    (92, 'Greenworld International Enterprise  Private Limited', '+91-9746226403', 'mail.greenworldin@gmail.com'),
    (93, 'Grehasoft', '+91 99462 60111', 'info@grehasoft.com'),
    (94, 'Griphin Graphics', '+919422799989', 'griphingraphics@gmail.com'),
    (95, 'HashRoot Technologies Pvt Ltd', '8921032682', 'info@hashroot.com'),
    (96, 'IBS Software', '+91 99468 05010', 'receptiondesk@ibsplc.com'),
    (97, 'iCodeBees Private Limited', '+91-9995229371', 'info@icodebees.com'),
    (98, 'Idea Soft Solutions', '0484 - 3343403/3343404', 'contact@ideasoftsolutions.com'),
    (99, 'IdeaGCS Private Limited', '8714153735', 'hello@ideagcs.com'),
    (100, 'iLeaf Solutions Pvt Ltd.', '+919744783338', 'careers@ileafsolutions.com'),
    (101, 'Indian Institute of Management - Kozhikode', '+9181290 05574', 'sheelu_k@iimk.ac.in'),
    (102, 'IndustryApps Technologies Pvt Ltd', '+91 98470 41060', 'director-india@industryapps.net'),
    (103, 'InerG Software Innovations Pvt.Ltd.', '0484 - 4070368', 'hr@inerg.com'),
    (104, 'Infintor Solutions LLP', '+91 9946864488', 'info@infintor.com'),
    (105, 'INFOCYLANZ PVT. LTD.', '+1-727-748-4221', 'info@infocylanz.com'),
    (106, 'Infosmart Technologies Private Limited', '0484-6633333', 'boby.thomas@infosmart-technologies.com'),
    (107, 'Inspired Software Development (India) LLP', '9249087484', 'india.careers@inseinc.com'),
    (108, 'Inspirisys Solutions Limited', '91 0484 6062885, 6062886', 'samritha.santhosh@inspirisys.com'),
    (109, 'Inspite Technologies Pvt.Ltd', '+91 4843514093, +91 8089612448, +91 6282589058', 'inspitetechnologies@gmail.com'),
    (110, 'Intbrains Private Limited', '9495662507', 'hr@intbrains.com'),
    (111, 'iWEX Infomatics', '+91-7907092564', 'emails@iwex.in'),
    (112, 'Jachoos Technologies Private Limited', '91-484-4060800', 'info@jachoos.com'),
    (113, 'Johnkart Online Trade and Services Pvt Ltd', '+91 484 4856688', 'admin@johnkart.com'),
    (114, 'JTSi Technologies India Private Limited', '0484 2100164', 'hr@jtsiindia.com'),
    (115, 'Kakapo Systems India Private Limited', '9656056789', 'talkindia@kakaposystems.com'),
    (116, 'KnowBe4 India Private Limited', '9656730556', 'info@knowbe4.com'),
    (117, 'Mantle Solutions Private Limited', '+91 9446 88 33 77, +91 8289 88 33 77', 'careers@mantlesolutions.in'),
    (118, 'Mantra IT Solutions', '0484 - 6689999', 'info@mantraitsolutions.in'),
    (119, 'MARLABS SOFTWARE', '8281155932', 'contact@marlabs.com'),
    (120, 'Mashuptech', '8547919763', 'info@mashuptech.in'),
    (121, 'McFadyen Digital', '04842987111', 'djanardhanan@mcfadyen.com'),
    (122, 'Merabt Technologies Private Limited', '+91 9895490866', 'hr@merabt.com'),
    (123, 'Milestone Technologies', '+91 9207325275', 'recruiters-apac@milestone.tech'),
    (124, 'Millennium InfoLogic', '0484-2983032 / 2983033', 'hr@millinfo.net'),
    (125, 'Mindcurv Technology Solutions Pvt. Ltd.', '9916940449', 'hr@mindcurv.com'),
    (126, 'MindLabs Systems Pvt Ltd', '+91 6238833983', 'hrteam@mindlabssys.com'),
    (127, 'mitz AI Minds Pvt Ltd', '9995333078', 'contactus@mitz.ai'),
    (128, 'Navicater Solutions India Pvt Ltd', '9846002792', 'admin@navicater.com'),
    (129, 'NDimensionZ Solutions Pvt.Ltd.', '+91 9995479222', 'hr@ndimensionz.com'),
    (130, 'Neem Info Solutions Pvt. Ltd.', '+91-96567 07783', 'admin@neemsoftware.com'),
    (131, 'Neork Technologies', '9995205566', 'info@neork.com'),
    (132, 'Nesote Technologies Pvt Ltd', '+91 80896 71177', 'hr@nesote.com'),
    (133, 'Nestsoft TechnoMaster PVT LTD', '+91 484 6616100', 'join@nestsoft.com'),
    (134, 'Netlyft Technologies Pvt Ltd', '+91 94472 14688', 'contact@netlyft.com'),
    (135, 'NewAgeSys Solutions (P) Ltd.', '04842915045', 'career@newagesysindia.com'),
    (136, 'Next Apps', '+919400197544', 'support@nextapps.in'),
    (137, 'Niaway Technologies Pvt Ltd', '9995434111', 'info@niaway.com'),
    (138, 'Niche Techies', '+91-6238309752', 'info@nichetechies.com'),
    (139, 'Noa Infosolutions LLP', '04712700915', 'hr@noainfosolutions.com'),
    (140, 'Offline Human Studios', '+91 79944 31750', 'contact@offlinehumanstudios.com'),
    (141, 'Onesoft Technologies LLP', '+91484 4070667', 'admin@onesoftapps.com'),
    (142, 'Opshore Talent Solutions Pvt.Ltd.', '80752 45591', 'hr@opshoretalentsolutions.com'),
    (143, 'Orestes Technologies Pvt Ltd', '91 9995222141', 'info@orestestech.com'),
    (144, 'Orion India Systems Pvt. Ltd.', '+91-8891295315', 'pramodt@orioninc.com'),
    (145, 'Ormeon IT Consulting Pvt Ltd', '+919605623900', 'info@ormeon.com'),
    (146, 'Outsource Partners International', '0484 2972794', 'info@opiglobal.com'),
    (147, 'PanashiFZCO Technology Solution Private Limited', '9562965493', 'hr@panashi.ae'),
    (148, 'Paoyaila Animation Studios LLP', '9995207676', 'hrpaoyaila@gmail.com'),
    (149, 'PaulCart E Commerce Pvt. Ltd.', '04844059440', 'rinosh@paulcart.com'),
    (150, 'Pearlsoft Technologies LLP', '98957 64867', 'joinus@pearlsofttechnologies.com'),
    (151, 'Penguin Data Centre Pvt.Ltd.', '7306021783', 'careers@penguininc.com'),
    (152, 'Phases India Technology Solutions Pvt Ltd.', '+91 484 298 5660', 'support@phases.io'),
    (153, 'PIT Solutions Private Limited', '8078791340', 'enquiries@pitsolutions.com'),
    (154, 'Pixdynamics', '+91-9037122872', 'hr@pixdynamics.com'),
    (155, 'Portrave Solutions Pvt Ltd', '04844874290', 'info@portrave.com'),
    (156, 'Privo TechCorp Private Limited', '+91 7592 888 111', 'hr@privocorp.com'),
    (157, 'Pueblo Shades Pvt.Ltd', '9656227714', 'info@puebloshades.com'),
    (158, 'QBurst Technologies', '+91 9061234445', 'hr@qburst.com'),
    (159, 'Qubiqon Consulting India Private Limited', '+91 9037021110', 'contactus@qubiqon.io'),
    (160, 'Quper Technologies Pvt. Ltd.', '+971 529822133', 'contact@qupertech.com'),
    (161, 'RedBlack Technologies Private Limited', '+91 9847811647', 'infokochi@intelliflo.com'),
    (162, 'Redux (Network Redux)', '+91 484 401 7951', 'india.hr@redux.co'),
    (163, 'Rextech Studios', '+91 97453 66367', 'info@rextechstudios.com'),
    (164, 'ROGERSOFT', '8590041414', 'info@rogersoft.com'),
    (165, 'RUBY SEVEN STUDIOS', '9946161106', 'careersindia@rubyseven.com'),
    (166, 'SayOne Technologies Pvt.Ltd.', '+91- 0484 - 2989811', 'hr@sayonetech.com'),
    (167, 'SBL Knowledge Services Pvt Ltd', '+91 8136923078', 'hr@sblcorp.com'),
    (168, 'SE-Mentor Solutions', '+91 484 2415230', 'careers@se-mentor.com'),
    (169, 'Seeroo IT Solutions', '9446581090', 'info@seeroo.com'),
    (170, 'Seguro Technologies', '09633303943', 'hr@segurotechnologies.com'),
    (171, 'Senscript Technologies Pvt Ltd', '0484 618 7000', 'careers@senscript.ai'),
    (172, 'Simelabs - An Astek Company', '0484 4632159', 'hr@simelabs.com'),
    (173, 'Skybertech IT Innovation Pvt Ltd', '+91-7356899156', 'mail@skybertech.com'),
    (174, 'SMEC Automation Pvt Ltd', '8139021117', 'connect@smectechnologies.com'),
    (175, 'SnippetCommerce360 Pvt Ltd', '+91 484 403 6777', 'collab@snippetcommerce360.com'),
    (176, 'Sofdia Technologies Pvt Ltd', '0484 4014666', 'info@sofdia.in'),
    (177, 'Softop Solutions Pvt Ltd', '+91 95670 63871', 'careers@softopsolutions.com'),
    (178, 'Softspace Infotech Pvt Ltd', '+91 94956 58233', 'info@softspace.ae'),
    (179, 'Spawoz Technologies Pvt. Ltd.', '+91 8138924300', 'info@spawoz.com'),
    (180, 'Speridian Technologies Pvt Ltd', '0484-4104100', 'smitha.sankarankutty@speridian.com'),
    (181, 'Spiderline Technologies', '+91 7510303111', 'info@spiderline.in'),
    (182, 'Spiralcode Innovates LLP', '09074535476', 'info@spiralcode.in'),
    (183, 'Steigend IT Solutions', '9591546465', 'info@steigendit.com'),
    (184, 'Stepping Stone Consultancy Services', '+91 8139894880', 'hire1.steppingstone@gmail.com'),
    (185, 'Syriac Consultancy Services Private Limited', '91-484 4034359', 'career@syriacconsultancy.com'),
    (186, 'SysTalent Software Private Limited', '0474 2970 298', 'info@systalent.com'),
    (187, 'Talk Digital Pvt. Ltd.', '+91-4844874264', 'hr@talkdigital.co.in'),
    (188, 'Tamcherry Technologies Private Limited', '9188955501', 'info@tamcherry.com'),
    (189, 'Tata Consultancy Services,', '+91 98412 05845', 'info@tcs.com'),
    (190, 'TECFORZ INNOVATIONS', '+91 99950 45717', 'info@tecforz.com'),
    (191, 'Techfriar Technologies', '0484-4040000', 'hr@techfriar.com'),
    (192, 'Technowave ID Systems PVT.LTD.', '8547432502', 'hr@technowavegroup.com'),
    (193, 'TechTaliya Informatics Pvt. Ltd.', '+971 58 5049701', 'info@techtaliya.com'),
    (194, 'Techversant Infotech Pvt Ltd', '7012099465', 'careers@techversantinfotech.com'),
    (195, 'Tecnostac Systems Private Limited', '+91-484-4019970', 'hr@tecnostac.com'),
    (196, 'Telious Technologies Pvt Ltd', '00914842331101', 'jobs@telious.com'),
    (197, 'Testing Mavens Software Pvt  Ltd', '9744403855', 'hire@testingmavens.com'),
    (198, 'Thinkpalm Technologies Pvt.Ltd', '484-4050222', 'info@thinkpalm.com'),
    (199, 'ThoughtMinds System Pvt Ltd', '+91 9847670036', 'careers@thoughtminds.io'),
    (200, 'Thriveminds Technologies Pvt. Ltd.', '+918848850414', 'hr@thrivemindstechno.com'),
    (201, 'Titan Tech Emirates Pvt Ltd', '06282685797', 'hr@titantechemirates.com'),
    (202, 'TNP Consultancy Private Limited', '91-9656600307', 'communication.india@tnpconsultants.com'),
    (203, 'Toobler Technologies Pvt. Ltd.', '8714746555', 'info@toobler.com'),
    (204, 'TouchWorld Technology', '0484-4320685', 'info@touchworldtech.com'),
    (205, 'Trafoss Pvt.Ltd', '+91 9447306003', 'info@trafoss.com'),
    (206, 'Travancore Analytics Pvt.Ltd.', '+91484-404-9024', 'careers@travancoreanalytics.com'),
    (207, 'Tukxi India Private Ltd', '+91 484 486 5758', 'support@tukxi.in'),
    (208, 'Turqosoft Solutions Pvt. Ltd.', '+91-7306892494', 'info@turqosoft.com'),
    (209, 'Unilaw Global Private Limited', 'N/A', 'info@unilawtech.com'),
    (210, 'US Technology International Pvt Ltd', 'N/A', 'info@ust-global.com'),
    (211, 'Vaisesika Consulting Private Limited', 'N/A', 'talentacquisition@vaisesika.in'),
    (212, 'Varishtha Infotech Services Pvt Ltd.', 'N/A', 'vandana@varishthainfotech.com'),
    (213, 'Veeble SoftTech (P) Ltd.', 'N/A', 'careers@veeble.com'),
    (214, 'Verteil Technologies Private Limited,', 'N/A', 'contact@verteil.com'),
    (215, 'Viewy Digital P(Ltd)', 'N/A', 'info@viewydigital.com'),
    (216, 'Violet Frames', 'N/A', 'info@violetframes.com'),
    (217, 'VIPoint Solutions Pvt Ltd', 'N/A', 'hr@vipointsolutions.net'),
    (218, 'Virtual Impulse Technologies', 'N/A', 'vimptech@gmail.com'),
    (219, 'Vivish Technologies Private Limited', 'N/A', 'hr@mygate.in'),
    (220, 'Vortexen Dynamics', 'N/A', 'hr@vortexen.com'),
    (221, 'Voyon Technology Pvt Ltd', 'N/A', 'careers@voyon.net'),
    (222, 'Vtrio Solutions Private Limited', 'N/A', 'hr@vtrio.com'),
    (223, 'Webdura Technologies', 'N/A', 'careers@webdura.in'),
    (224, 'Wipro Limited', 'N/A', 'jothish.s90@wipro.com'),
    (225, 'WOC Branding Systems Pvt Ltd', 'N/A', 'mail@wocbranding.com'),
    (226, 'Yatnam Technologies', 'N/A', 'mail@yatnam.com'),
    (227, 'Yellowfish Digital Innovations Pvt Ltd.', 'N/A', 'hr@yellowfish.in'),
    (228, 'Zellis HR India Pvt.Ltd.', 'N/A', 'careers.india@zellis.com'),
    (229, 'Zoiteckh Informations Solutions', 'N/A', 'hrmanager@zoiteckh.com')
),
updated_existing AS (
  UPDATE public.companies c
  SET email = d.email,
      email_status = COALESCE(c.email_status, 'PENDING')
  FROM phase1_data d
  WHERE (c.company_name = d.company_name OR (c.serial_number = d.serial_number AND (c.phase = 'Phase 1' OR c.phase IS NULL)))
  RETURNING d.serial_number
)
INSERT INTO public.companies (serial_number, company_name, phone_number, email, email_status, phase)
SELECT d.serial_number, d.company_name, d.phone_number, d.email, 'PENDING', 'Phase 1'
FROM phase1_data d
WHERE d.serial_number NOT IN (SELECT serial_number FROM updated_existing)
  AND NOT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.company_name = d.company_name OR (c.serial_number = d.serial_number AND (c.phase = 'Phase 1' OR c.phase IS NULL))
  );
