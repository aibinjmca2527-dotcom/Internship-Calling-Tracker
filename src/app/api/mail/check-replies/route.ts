import { NextResponse } from 'next/server';
import { getEmailCompaniesList, updateEmailCompanyStatus } from '@/lib/mail-db';
import { checkGmailReplies } from '@/lib/reply-checker';

export const maxDuration = 60;

export async function POST() {
  try {
    const companies = await getEmailCompaniesList();
    const knownEmails = companies.map((c) => c.email);

    // Build corporate domain map for high-accuracy sender resolution
    const domainMap = new Map<string, typeof companies[0]>();
    companies.forEach((c) => {
      const emailLower = (c.email || '').toLowerCase().trim();
      if (emailLower.includes('@')) {
        const domain = emailLower.split('@')[1];
        if (domain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(domain)) {
          domainMap.set(domain, c);
        }
      }
    });

    const replies = await checkGmailReplies(knownEmails);
    let newlyMarked = 0;
    const updatedCompanies: Array<{
      serial_number: number;
      company_name: string;
      email: string;
      status: 'REPLIED';
      replied_at: string;
      reply_snippet: string;
      receivedBy: string;
    }> = [];

    if (replies.length > 0) {
      for (const rep of replies) {
        const fromLower = rep.fromEmail.toLowerCase().trim();
        const fromDomain = fromLower.includes('@') ? fromLower.split('@')[1] : '';

        // Exclude bounces / postmasters / newsletters
        if (
          fromLower.includes('postmaster') ||
          fromLower.includes('mailer-daemon') ||
          fromLower.includes('jobalert') ||
          fromLower.includes('indeed') ||
          rep.subject.toLowerCase().includes('undeliverable')
        ) {
          continue;
        }

        // 1. Direct email match
        let matched = companies.find((c) => c.email.toLowerCase().trim() === fromLower);

        // 2. Corporate domain match (e.g. robin.joy@mitz.ai matches careers@mitz.ai)
        if (!matched && fromDomain && domainMap.has(fromDomain)) {
          matched = domainMap.get(fromDomain);
        }

        if (matched) {
          const snippet = `${rep.fromName || rep.fromEmail}: ${rep.subject}`;
          await updateEmailCompanyStatus(matched.serial_number, {
            status: 'REPLIED',
            replied_at: rep.date,
            reply_snippet: snippet,
            sent_by_name: rep.receivedBy || matched.sent_by_name,
          });

          matched.status = 'REPLIED';
          matched.replied_at = rep.date;
          matched.reply_snippet = snippet;
          if (rep.receivedBy) matched.sent_by_name = rep.receivedBy;

          updatedCompanies.push({
            serial_number: matched.serial_number,
            company_name: matched.company_name,
            email: matched.email,
            status: 'REPLIED',
            replied_at: rep.date,
            reply_snippet: snippet,
            receivedBy: rep.receivedBy,
          });

          newlyMarked++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked Gmail Inboxes across 3 accounts. Found ${replies.length} incoming messages (${newlyMarked} mapped to companies in tracker).`,
      foundCount: replies.length,
      newlyMarked,
      updatedCompanies,
      replies,
    });
  } catch (error: unknown) {
    console.error('Error checking replies:', error);
    const message = error instanceof Error ? error.message : 'Failed to check replies via IMAP';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
