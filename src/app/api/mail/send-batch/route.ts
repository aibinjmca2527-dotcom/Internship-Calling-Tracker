import { NextResponse } from 'next/server';
import { executeBatchSend } from '@/lib/batch-mailer';

export const maxDuration = 60; // Max allowed serverless duration on Vercel Hobby

export async function GET(req: Request) {
  return handleSend(req);
}

export async function POST(req: Request) {
  return handleSend(req);
}

async function handleSend(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'infopark_mail_cron_secret_2026';

  // Allow GET with secret parameter or POST from dashboard
  if (req.method === 'GET' && secret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Valid secret parameter required: ?secret=...' },
      { status: 401 }
    );
  }

  try {
    let count: number | undefined;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body.count === 'number' && body.count > 0) count = body.count;
    }

    const result = await executeBatchSend({
      count,
      force: true,
      slotLabel: 'Manual Batch Trigger',
    });

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
