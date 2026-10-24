-- Migration: 20261024000000_add_no_answer_status.sql
-- Add 'NO_ANSWER' status and update RPC functions safely

alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies add constraint companies_status_check
  check (status in ('NOT_CONTACTED', 'CONTACTED', 'NO_ANSWER'));

alter table public.contact_history drop constraint if exists contact_history_action_check;
alter table public.contact_history add constraint contact_history_action_check
  check (action in ('MARK_CONTACTED', 'MARK_NO_ANSWER', 'RESET_NOT_CONTACTED'));

drop function if exists public.mark_company_contacted(uuid, text);
drop function if exists public.mark_company_contacted(uuid, text, text);
drop function if exists public.reset_company_status(uuid);

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
  v_cleaned_name := trim(p_caller_name);
  if v_cleaned_name not in ('Aibin', 'Milan', 'Edwin', 'Seba', 'Lakshmi') then
    return jsonb_build_object(
      'success', false, 
      'error', 'UNAUTHORIZED_CALLER', 
      'message', 'Caller must be one of the authorized team members: Aibin, Milan, Edwin, Seba, or Lakshmi.'
    );
  end if;

  v_target_status := coalesce(nullif(trim(p_status), ''), 'CONTACTED');
  if v_target_status not in ('CONTACTED', 'NO_ANSWER') then
    return jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', 'Status must be either CONTACTED or NO_ANSWER.'
    );
  end if;

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

  if v_company.status = 'CONTACTED' and v_target_status = 'CONTACTED' and v_company.called_by_name <> v_cleaned_name then
    return jsonb_build_object(
      'success', false,
      'error', 'ALREADY_CONTACTED',
      'message', 'This company was already marked as contacted by ' || coalesce(v_company.called_by_name, 'another teammate') || '.',
      'company', row_to_json(v_company)
    );
  end if;

  update public.companies
  set status = v_target_status,
      called_by_name = v_cleaned_name,
      contacted_at = now(),
      updated_at = now()
  where id = p_company_id
  returning * into v_updated;

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

  update public.companies
  set status = 'NOT_CONTACTED',
      called_by_user_id = null,
      called_by_name = null,
      contacted_at = null,
      updated_at = now()
  where id = p_company_id
  returning * into v_updated;

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

grant execute on function public.mark_company_contacted(uuid, text, text) to anon, authenticated;
grant execute on function public.reset_company_status(uuid) to anon, authenticated;
