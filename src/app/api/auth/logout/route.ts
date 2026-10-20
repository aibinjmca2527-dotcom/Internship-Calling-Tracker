import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('infopark_user');

  const requestUrl = new URL(request.url);
  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 303,
  });
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('infopark_user');

  const requestUrl = new URL(request.url);
  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 303,
  });
}
