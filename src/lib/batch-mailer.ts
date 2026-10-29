import { sendOutreachEmail, getActiveSenders } from '@/lib/mailer';
import {
  getEmailCompaniesList,
  updateEmailCompanyStatus,
  getEmailConfig,
  saveEmailConfig,
} from '@/lib/mail-db';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface BatchSendResult {
  success: boolean;
  completed?: boolean;
  message: string;
  isTestMode?: boolean;
  targetRecipient?: string;
  activeSendersCount?: number;
  sentCount: number;
  failedCount: number;
  remainingPending?: number;
  results?: Array<{
    companyName: string;
    email: string;
    status: 'SENT' | 'FAILED';
    sentByName: string;
    sentByEmail?: string;
    error?: string;
  }>;
  error?: string;
}

export async function executeBatchSend({
  count: requestedCount,
  slotLabel,
}: {
  count?: number;
  slotLabel?: string;
} = {}): Promise<BatchSendResult> {
  const config = await getEmailConfig();

  // 1. Anti-Duplicate Cooldown Guard: Minimum 10 minutes required between batches
  if (config.last_run_at) {
    const lastRunTime = new Date(config.last_run_at).getTime();
    const timeSinceLastRunMinutes = (Date.now() - lastRunTime) / (1000 * 60);
    if (timeSinceLastRunMinutes < 10) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        message: `Cooldown active: A batch was already executed ${Math.floor(timeSinceLastRunMinutes)} minute(s) ago. At least 10 minutes must pass between batches to prevent duplicate emails to companies.`,
        error: `Cooldown active: Batch already sent ${Math.floor(timeSinceLastRunMinutes)} minute(s) ago.`,
      };
    }
  }

  // Default batch size: 39 companies (13 per sender across Aibin, Lakshmi, Seba)
  const count = typeof requestedCount === 'number' && requestedCount > 0 ? requestedCount : config.batch_count || 39;
  const isTestMode = config.test_mode;
  const testRecipient = config.test_recipient_email || process.env.GMAIL_USER || 'aibinjoseph9605573691@gmail.com';

  // Get active senders (Aibin, Lakshmi, Seba)
  const activeSenders = getActiveSenders().filter((s) => s.isActive && s.password);
  if (activeSenders.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      message: 'No active sender Gmail accounts configured with App Passwords.',
      error: 'No active sender Gmail accounts configured with App Passwords.',
    };
  }

  const companies = await getEmailCompaniesList();

  // 2. Anti-Duplicate Email Guard: Exclude any email address already contacted
  const alreadyContactedEmails = new Set(
    companies
      .filter((c) => c.status === 'SENT' || c.status === 'REPLIED' || Boolean(c.sent_at))
      .map((c) => c.email.toLowerCase().trim())
  );

  // Pick next pending companies that have never been contacted
  const pendingCompanies = companies
    .filter(
      (c) =>
        c.status === 'PENDING' &&
        !c.sent_at &&
        !alreadyContactedEmails.has(c.email.toLowerCase().trim())
    )
    .slice(0, count);

  // If no pending companies left, automatically turn off schedule safely
  if (pendingCompanies.length === 0) {
    config.active = false;
    config.next_run_info = 'All 229 companies contacted! Outreach completed successfully.';
    await saveEmailConfig(config);

    return {
      success: true,
      completed: true,
      message: 'All 229 companies have received outreach emails! The schedule has safely turned off.',
      sentCount: 0,
      failedCount: 0,
      remainingPending: 0,
    };
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
          await updateEmailCompanyStatus(company, {
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

          await updateEmailCompanyStatus(company, {
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
  } else {
    config.next_run_info = slotLabel ? `Executed slot: ${slotLabel}` : 'Automated schedule active';
  }

  config.last_run_at = new Date().toISOString();
  await saveEmailConfig(config);

  return {
    success: true,
    message: `Batch complete! Sent: ${totalSent}, Failed: ${totalFailed} across ${activeSenders.length} sender accounts. Remaining pending: ${remainingPending}`,
    isTestMode,
    targetRecipient: isTestMode ? testRecipient : 'Real Company Inboxes',
    activeSendersCount: activeSenders.length,
    sentCount: totalSent,
    failedCount: totalFailed,
    remainingPending,
    results,
  };
}
