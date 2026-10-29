import { NextResponse } from 'next/server';
import { executeBatchSend } from '@/lib/batch-mailer';

export const maxDuration = 60; // Max allowed serverless duration on Vercel Hobby

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = typeof body.count === 'number' && body.count > 0 ? body.count : undefined;

    const result = await executeBatchSend({ count });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Batch send failed:', error);
    const message = error instanceof Error ? error.message : 'Batch send encountered an error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
