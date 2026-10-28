import { NextResponse } from 'next/server';
import { getEmailConfig } from '@/lib/mail-db';

export const maxDuration = 60;

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET || 'infopark_mail_cron_secret_2026';

  if (secret !== expectedSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  const config = await getEmailConfig();
  if (!config.active) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Automated email sending is currently PAUSED in dashboard settings.',
    });
  }

  // Get current time in Asia/Kolkata (IST)
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTimeIST = istFormatter.format(now); // e.g. "10:00"

  const force = url.searchParams.get('force') === 'true';

  // Check if current IST time matches any enabled schedule
  // E.g. within 20 minutes of the slot time
  const matchedSlot = config.schedules.find((slot) => {
    if (!slot.enabled) return false;
    if (force) return true;

    // Compare hours and minutes
    const [targetH, targetM] = slot.time.split(':').map(Number);
    const [curH, curM] = currentTimeIST.split(':').map(Number);

    return targetH === curH && Math.abs(curM - targetM) <= 20;
  });

  if (!matchedSlot && !force) {
    return NextResponse.json({
      success: true,
      skipped: true,
      currentTimeIST,
      message: `No active schedule slot due right now. Current IST: ${currentTimeIST}. Configured slots: ${config.schedules.map((s) => s.time).join(', ')}`,
    });
  }

  const countToRun = matchedSlot?.count || config.batch_count || 39;

  // Execute internal batch call
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const batchUrl = `${protocol}://${host}/api/mail/send-batch`;

  try {
    const res = await fetch(batchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: countToRun }),
    });

    const data = await res.json();
    return NextResponse.json({
      success: true,
      slot: matchedSlot?.label || 'Manual force trigger',
      currentTimeIST,
      batchResult: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error invoking batch send';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
