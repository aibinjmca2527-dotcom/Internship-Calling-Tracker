import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  return createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from Server Component
          }
        },
      },
    }
  );
}
