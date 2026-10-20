import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import initialCompanies from '@/data/companies.json';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('serial_number', { ascending: true });

  if (error || !data || data.length === 0) {
    // Return initial companies if database table has not been seeded yet
    return NextResponse.json({
      source: 'fallback_seed',
      companies: initialCompanies.map((c, i) => ({
        id: `local-${c.serial_number}`,
        serial_number: c.serial_number,
        company_name: c.company_name,
        phone_number: c.phone_number,
        status: 'NOT_CONTACTED',
        called_by_user_id: null,
        called_by_name: null,
        contacted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    });
  }

  return NextResponse.json({
    source: 'supabase',
    companies: data,
  });
}
