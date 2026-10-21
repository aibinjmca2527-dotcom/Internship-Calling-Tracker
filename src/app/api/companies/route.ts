import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import initialCompanies from '@/data/companies.json';
import initialCompaniesPhase2 from '@/data/companies_phase2.json';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('serial_number', { ascending: true });

  if (error || !data || data.length === 0) {
    const p1 = initialCompanies.map((c) => ({
      id: `p1-${c.serial_number}`,
      serial_number: c.serial_number,
      company_name: c.company_name,
      phone_number: c.phone_number,
      status: 'NOT_CONTACTED',
      phase: 'Phase 1',
      called_by_user_id: null,
      called_by_name: null,
      contacted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const p2 = initialCompaniesPhase2.map((c) => ({
      id: `p2-${c.serial_number}`,
      serial_number: c.serial_number,
      company_name: c.company_name,
      phone_number: c.phone_number,
      status: 'NOT_CONTACTED',
      phase: 'Phase 2',
      called_by_user_id: null,
      called_by_name: null,
      contacted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return NextResponse.json({
      source: 'fallback_seed',
      companies: [...p1, ...p2],
    });
  }

  const formatted = data.map((c: Record<string, unknown>) => ({
    ...c,
    phase: c.phase || 'Phase 1',
  }));

  return NextResponse.json({
    source: 'supabase',
    companies: formatted,
  });
}
