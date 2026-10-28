import { ImapFlow } from 'imapflow';
import { getActiveSenders } from './mailer';

export interface DetectedReply {
  fromEmail: string;
  fromName: string;
  subject: string;
  date: string;
  snippet?: string;
  receivedBy: string;
}

/**
 * Connects to Gmail via IMAP for each active sender and scans recent inbox emails for replies from companies.
 * @param knownCompanyEmails List of company emails in our directory to match against.
 */
export async function checkGmailReplies(knownCompanyEmails: string[]): Promise<DetectedReply[]> {
  const activeSenders = getActiveSenders().filter((s) => s.isActive && s.password);

  if (activeSenders.length === 0) {
    throw new Error('No active Gmail accounts configured with App Passwords.');
  }

  // Create a lowercase lookup set
  const emailSet = new Set(knownCompanyEmails.map((e) => e.trim().toLowerCase()));
  const allDetected: DetectedReply[] = [];

  for (const sender of activeSenders) {
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: sender.email,
        pass: sender.password,
      },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Look back at the last 14 days of emails in INBOX
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 14);

        const messages = await client.search({ since: sinceDate });

        if (messages && messages.length > 0) {
          const recentUids = messages.slice(-100);

          for await (const msg of client.fetch(recentUids, { envelope: true, bodyStructure: true })) {
            const fromAddress = msg.envelope?.from?.[0]?.address?.toLowerCase();
            const fromName = msg.envelope?.from?.[0]?.name || fromAddress || '';
            const subject = msg.envelope?.subject || '(No subject)';
            const rawDate = msg.envelope?.date;
            const date = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

            if (
              fromAddress &&
              (emailSet.has(fromAddress) ||
                subject.toLowerCase().includes('internship') ||
                subject.toLowerCase().includes('saintgits') ||
                fromAddress.includes('aibin12joseph12'))
            ) {
              allDetected.push({
                fromEmail: fromAddress,
                fromName,
                subject,
                date,
                receivedBy: sender.name,
              });
            }
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: unknown) {
      console.error(`Error scanning inbox for ${sender.name} (${sender.email}):`, err);
    }
  }

  return allDetected;
}
