import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  cookieStore.delete('infopark_user');

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 303,
  });
}
