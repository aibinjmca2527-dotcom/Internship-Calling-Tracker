import { NextResponse } from 'next/server';
import { sendOutreachEmail, getActiveSenders } from '@/lib/mailer';
import {
  getEmailCompaniesList,
  updateEmailCompanyStatus,
  getEmailConfig,
  saveEmailConfig,
} from '@/lib/mail-db';

export const maxDuration = 60; // Max allowed serverless duration on Vercel Hobby

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const config = await getEmailConfig();

    // Default batch size: 39 companies (13 per sender across Aibin, Lakshmi, Seba)
    const count = typeof body.count === 'number' && body.count > 0 ? body.count : config.batch_count || 39;
    const isTestMode = config.test_mode;
    const testRecipient = config.test_recipient_email || process.env.GMAIL_USER || 'aibinjoseph9605573691@gmail.com';

    // Get active senders (Aibin, Lakshmi, Seba)
    const activeSenders = getActiveSenders().filter((s) => s.isActive && s.password);
    if (activeSenders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active sender Gmail accounts configured with App Passwords.' },
        { status: 400 }
      );
    }

    const companies = await getEmailCompaniesList();

    // Pick next pending companies
    const pendingCompanies = companies.filter((c) => c.status === 'PENDING').slice(0, count);

    // If no pending companies left, automatically turn off schedule safely
    if (pendingCompanies.length === 0) {
      config.active = false;
      config.next_run_info = 'All 229 companies contacted! Outreach completed successfully.';
      await saveEmailConfig(config);

      return NextResponse.json({
        success: true,
        completed: true,
        message: 'All 229 companies have received outreach emails! The schedule has safely turned off.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    // Partition pending companies evenly across the active senders
    const senderQueues: { sender: typeof activeSenders[0]; companies: typeof pendingCompanies }[] = activeSenders.map(
      (s) => ({ sender: s, companies: [] })
    );

    pendingCompanies.forEach((company, index) => {
      const targetSenderIdx = index % activeSenders.length;
      senderQueues[targetSenderIdx].companies.push(company);
    });

    const results: Array<{
      companyName: string;
      email: string;
      status: 'SENT' | 'FAILED';
      sentByName: string;
      sentByEmail?: string;
      error?: string;
    }> = [];

    let totalSent = 0;
    let totalFailed = 0;

    // Process all sender queues concurrently.
    // Each sender sends their batch with a 3.5s anti-spam natural gap between sends.
    await Promise.all(
      senderQueues.map(async ({ sender, companies: queue }) => {
        for (let i = 0; i < queue.length; i++) {
          const company = queue[i];
          const destinationEmail = isTestMode ? testRecipient : company.email;
          const subjectPrefix = isTestMode ? `[TEST - To: ${company.company_name}] ` : '';

          try {
            await sendOutreachEmail({
              to: destinationEmail,
              companyName: company.company_name,
              subjectTemplate: `${subjectPrefix}${config.template.subject}`,
              bodyTemplate: config.template.body,
              sender,
            });

            const sentAt = new Date().toISOString();
            await updateEmailCompanyStatus(company.id, {
              status: 'SENT',
              sent_at: sentAt,
              sent_by_name: sender.name,
              sent_by_email: sender.email,
              last_error: null,
            });

            totalSent++;
            results.push({
              companyName: company.company_name,
              email: destinationEmail,
              status: 'SENT',
              sentByName: sender.name,
              sentByEmail: sender.email,
            });
          } catch (err: unknown) {
            console.error(`Error sending to ${company.company_name} via ${sender.name}:`, err);
            const errMsg = err instanceof Error ? err.message : 'Unknown error';

            await updateEmailCompanyStatus(company.id, {
              status: 'FAILED',
              last_error: errMsg,
              sent_by_name: sender.name,
              sent_by_email: sender.email,
            });

            totalFailed++;
            results.push({
              companyName: company.company_name,
              email: destinationEmail,
              status: 'FAILED',
              error: errMsg,
              sentByName: sender.name,
            });
          }

          // Anti-spam gap between consecutive sends for this specific sender account
          if (i < queue.length - 1) {
            await sleep(3500);
          }
        }
      })
    );

    // Re-check remaining pending companies to see if campaign has completed
    const latestCompanies = await getEmailCompaniesList();
    const remainingPending = latestCompanies.filter((c) => c.status === 'PENDING').length;

    if (remainingPending === 0) {
      config.active = false;
      config.next_run_info = 'All 229 companies contacted! Outreach completed successfully.';
    }

    config.last_run_at = new Date().toISOString();
    await saveEmailConfig(config);

    return NextResponse.json({
      success: true,
      message: `Batch complete! Sent: ${totalSent}, Failed: ${totalFailed} across ${activeSenders.length} sender accounts. Remaining pending: ${remainingPending}`,
      isTestMode,
      targetRecipient: isTestMode ? testRecipient : 'Real Company Inboxes',
      activeSendersCount: activeSenders.length,
      sentCount: totalSent,
      failedCount: totalFailed,
      remainingPending,
      results,
    });
  } catch (error: unknown) {
    console.error('Batch send failed:', error);
    const message = error instanceof Error ? error.message : 'Batch send encountered an error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
