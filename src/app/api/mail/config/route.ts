import { NextResponse } from 'next/server';
import { EmailConfig } from '@/types/email';
import { getVerifiedResumes, getActiveSenders } from '@/lib/mailer';
import { getEmailConfig, saveEmailConfig } from '@/lib/mail-db';

export async function GET() {
  const config = await getEmailConfig();
  const resumes = getVerifiedResumes();
  const senders = getActiveSenders().map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    isActive: s.isActive,
  }));

  return NextResponse.json({
    success: true,
    config,
    resumes,
    senders,
    gmailAccount: process.env.GMAIL_USER || 'aibinjoseph9605573691@gmail.com',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = await getEmailConfig();

    const updated: EmailConfig = {
      ...current,
      ...body,
      template: {
        ...current.template,
        ...(body.template || {}),
      },
      schedules: body.schedules || current.schedules,
    };

    await saveEmailConfig(updated);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save configuration';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
