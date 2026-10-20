import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isEmailApproved, normalizeEmail } from '@/lib/auth-config';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Error exchanging code for session:', error.message);
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
    }

    const user = data?.user;
    const userEmail = normalizeEmail(user?.email);

    // Enforce the 5-account allowlist strictly on server
    if (!user || !isEmailApproved(userEmail)) {
      console.warn(`[Auth Callback] Rejected unauthorized sign-in attempt from: ${userEmail}`);
      // Immediately destroy session
      await supabase.auth.signOut();
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
    }

    // Attempt to sync auth_user_id into approved_team_members
    try {
      await supabase.rpc('sync_auth_user_member');
    } catch (rpcErr) {
      console.warn('[Auth Callback] Could not sync team member on auth:', rpcErr);
    }

    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_code`);
}
