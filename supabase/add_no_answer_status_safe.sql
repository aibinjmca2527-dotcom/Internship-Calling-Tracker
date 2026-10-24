-- =====================================================================
-- SAFE MIGRATION: ADD 'NO_ANSWER' STATUS TO CALL TRACKER
-- Safe & Non-Destructive:
-- 1. Does NOT delete, drop, or alter any existing records, callers, or timestamps.
-- 2. Preserves all existing 'CONTACTED' and 'NOT_CONTACTED' rows completely intact.
-- 3. Safely updates CHECK constraints on companies and contact_history.
-- 4. Updates atomic stored procedures (mark_company_contacted & reset_company_status).
-- =====================================================================

-- Step 1: Safely update check constraint on public.companies.status
alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies add constraint companies_status_check
  check (status in ('NOT_CONTACTED', 'CONTACTED', 'NO_ANSWER'));

-- Step 2: Safely update check constraint on public.contact_history.action
alter table public.contact_history drop constraint if exists contact_history_action_check;
alter table public.contact_history add constraint contact_history_action_check
  check (action in ('MARK_CONTACTED', 'MARK_NO_ANSWER', 'RESET_NOT_CONTACTED'));

-- Step 3: Drop previous function overloads to prevent "function is not unique" (42725) errors
drop function if exists public.mark_company_contacted(uuid, text);
drop function if exists public.mark_company_contacted(uuid, text, text);
drop function if exists public.reset_company_status(uuid);

-- Step 4: Atomic Mark Company Status (Supports both 'CONTACTED' and 'NO_ANSWER')
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
    'message', case when v_target_status = 'NO_ANSWER' then 'Marked company as Did Not Pick Up.' else 'Company successfully marked as contacted.' end,
    'company', row_to_json(v_updated)
  );
end;
$$;

-- Step 5: Atomic Reset Company Status (Handles both CONTACTED and NO_ANSWER)
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

-- Step 6: Grant execution permissions to anon and authenticated
grant execute on function public.mark_company_contacted(uuid, text, text) to anon, authenticated;
grant execute on function public.reset_company_status(uuid) to anon, authenticated;
