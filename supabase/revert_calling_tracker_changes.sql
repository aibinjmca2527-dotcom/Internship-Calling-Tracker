-- =====================================================================
-- REVERT ACCIDENTAL CALLING TRACKER UPDATES IN SUPABASE
-- =====================================================================
-- If you want to reset the Calling Tracker companies back to 'NOT_CONTACTED'
-- so that automated mail and calling tracker remain 100% separate,
-- run this script in your Supabase SQL Editor.
-- =====================================================================

-- 1. Revert companies status back to NOT_CONTACTED
UPDATE public.companies c
SET status = 'NOT_CONTACTED',
    called_by_name = NULL,
    contacted_at = NULL
FROM public.contact_history ch
WHERE ch.company_id = c.id
  AND ch.notes LIKE 'Outreach email sent at 2:50 PM%';

-- 2. Clean up the automated mail entries from contact_history
DELETE FROM public.contact_history
WHERE notes LIKE 'Outreach email sent at 2:50 PM%';

