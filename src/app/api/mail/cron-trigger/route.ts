import { NextResponse } from 'next/server';
import { getEmailConfig, saveEmailConfig } from '@/lib/mail-db';
import { executeBatchSend } from '@/lib/batch-mailer';

export const maxDuration = 60;

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  const url = new URL(req.url);
  const secretParam = url.searchParams.get('secret');
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
  const userAgent = req.headers.get('user-agent') || '';
  const isVercelCronHeader =
    req.headers.get('x-vercel-cron') === '1' ||
    userAgent.includes('vercel-cron') ||
    Boolean(req.headers.get('x-vercel-cron-schedule'));

  const expectedSecret = process.env.CRON_SECRET || 'infopark_mail_cron_secret_2026';

  // Allow trigger if secret matches OR if request originates from Vercel's automated cron engine
  const isAuthorized =
    secretParam === expectedSecret ||
    authHeader === expectedSecret ||
    isVercelCronHeader;

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized cron trigger. Provide valid secret or CRON_SECRET.' },
      { status: 401 }
    );
  }

  const force = url.searchParams.get('force') === 'true';
  const requestedSlotId = url.searchParams.get('slot');

  const config = await getEmailConfig();
  if (!config.active && !force) {
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
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const istTimeStr = istFormatter.format(now); // e.g. "10:00" or "10:15"
  const [curH, curM] = istTimeStr.split(':').map(Number);
  const curMinutesOfDay = curH * 60 + curM;

  // Determine slot:
  // 1. Explicit slot ID passed via query param (e.g. ?slot=batch-1)
  // 2. Or Vercel cron schedule header match (e.g. "30 4 * * *" -> 10:00 AM)
  // 3. Or closest enabled slot within a strict 15-minute window (prevents delayed triggers like 2:50 PM)
  // 4. Fallback to first enabled slot only if force=true
  const MAX_TOLERANCE_MINUTES = 15;
  const scheduleHeader = req.headers.get('x-vercel-cron-schedule');
  let matchedSlot = config.schedules.find((s) => s.enabled && s.id === requestedSlotId);

  if (!matchedSlot && scheduleHeader) {
    if (scheduleHeader.includes('30 4')) {
      matchedSlot = config.schedules.find((s) => s.id === 'batch-1' && s.enabled);
    } else if (scheduleHeader.includes('30 6')) {
      matchedSlot = config.schedules.find((s) => s.id === 'batch-2' && s.enabled);
    } else if (scheduleHeader.includes('30 8')) {
      matchedSlot = config.schedules.find((s) => s.id === 'batch-3' && s.enabled);
    }
  }

  if (!matchedSlot) {
    // Find closest enabled slot within strict 15 minutes of current IST time (10:00, 12:00, 14:00)
    matchedSlot = config.schedules.find((slot) => {
      if (!slot.enabled) return false;
      const [targetH, targetM] = slot.time.split(':').map(Number);
      const targetMinutes = targetH * 60 + targetM;
      return Math.abs(curMinutesOfDay - targetMinutes) <= MAX_TOLERANCE_MINUTES;
    });
  }

  // If force is set but no window matched, fallback to first enabled slot
  if (!matchedSlot && force) {
    matchedSlot = config.schedules.find((s) => s.enabled) || config.schedules[0];
  }

  if (!matchedSlot && !force) {
    return NextResponse.json({
      success: true,
      skipped: true,
      currentTimeIST: istTimeStr,
      message: `No active schedule slot due right now. Current IST: ${istTimeStr}. Only slots at 10:00 AM, 12:00 PM, and 02:00 PM IST (±${MAX_TOLERANCE_MINUTES}m) are permitted.`,
    });
  }

  // Strict time window check: Even if a slot was matched by ID or header, verify it is within ±15m of scheduled time
  if (matchedSlot && !force) {
    const [targetH, targetM] = matchedSlot.time.split(':').map(Number);
    const targetMinutes = targetH * 60 + targetM;
    const diffMinutes = Math.abs(curMinutesOfDay - targetMinutes);

    if (diffMinutes > MAX_TOLERANCE_MINUTES) {
      return NextResponse.json({
        success: true,
        skipped: true,
        slot: matchedSlot.label,
        currentTimeIST: istTimeStr,
        message: `Trigger time (${istTimeStr} IST) is ${diffMinutes} minutes away from '${matchedSlot.label}' (${matchedSlot.time} IST). Allowed window is ±${MAX_TOLERANCE_MINUTES}m. Skipped to prevent unexpected execution at arbitrary times like 2:50 PM.`,
      });
    }
  }

  // Enforce slot-level daily execution lock: A slot can run at most ONCE per calendar day
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  if (matchedSlot?.last_executed_date === todayIST && !force) {
    return NextResponse.json({
      success: true,
      skipped: true,
      slot: matchedSlot.label,
      currentTimeIST: istTimeStr,
      message: `Slot '${matchedSlot.label}' has already executed today (${todayIST}). Skipped to guarantee exactly one send per slot per day.`,
    });
  }

  const countToRun = matchedSlot?.count || config.batch_count || 39;

  try {
    // Direct in-memory execution: avoids internal HTTP network hops and lambda timeouts
    const batchResult = await executeBatchSend({
      count: countToRun,
      slotLabel: matchedSlot?.label || (force ? 'Manual Force Trigger' : undefined),
      force,
    });

    if (batchResult.success && matchedSlot) {
      matchedSlot.last_executed_date = todayIST;
      await saveEmailConfig(config);
    }

    return NextResponse.json({
      success: batchResult.success,
      slot: matchedSlot?.label || 'Manual force trigger',
      currentTimeIST: istTimeStr,
      batchResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error executing batch send in cron';
    console.error('Cron execution error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
