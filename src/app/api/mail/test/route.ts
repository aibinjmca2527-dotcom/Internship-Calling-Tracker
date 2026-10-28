import { NextResponse } from 'next/server';
import { sendOutreachEmail } from '@/lib/mailer';

export async function POST(req: Request) {
  try {
    const { testEmail, companyName, subject, body } = await req.json();

    const recipient = testEmail?.trim() || process.env.GMAIL_USER;
    if (!recipient || !recipient.includes('@')) {
      return NextResponse.json({ success: false, error: 'A valid recipient email is required.' }, { status: 400 });
    }

    const targetCompany = companyName?.trim() || 'Demo Tech Solutions Pvt Ltd';
    const emailSubject = subject || 'Request for MCA Internship Opportunity - {{company_name}}';
    const emailBody = body || `Dear Team,

We are a team of five final-year MCA students from Saintgits College of Engineering, Kottayam, seeking an internship opportunity as part of our final semester.

We are available for a three-month unpaid internship from January 1 to March 31. We have attached the resumes of all five team members for your reference.

Kindly consider us for a suitable internship opportunity at your company.

Thank you for your time and consideration.

Best regards,
Final-Year MCA Students
Saintgits College of Engineering, Kottayam`;

    const info = await sendOutreachEmail({
      to: recipient,
      companyName: targetCompany,
      subjectTemplate: emailSubject,
      bodyTemplate: emailBody,
    });

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipient} with all 5 resumes attached!`,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (error: unknown) {
    console.error('Test email failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to send test email';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
