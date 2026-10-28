import { NextResponse } from 'next/server';
import { getEmailCompaniesList, updateEmailCompanyStatus } from '@/lib/mail-db';
import { checkGmailReplies } from '@/lib/reply-checker';

export const maxDuration = 60;

export async function POST() {
  try {
    const companies = await getEmailCompaniesList();
    const knownEmails = companies.map((c) => c.email);

    const replies = await checkGmailReplies(knownEmails);
    let newlyMarked = 0;

    if (replies.length > 0) {
      for (const rep of replies) {
        const fromLower = rep.fromEmail.toLowerCase();
        const matched = companies.find((c) => c.email.toLowerCase() === fromLower);

        if (matched && matched.status !== 'REPLIED') {
          await updateEmailCompanyStatus(matched.id, {
            status: 'REPLIED',
            replied_at: rep.date,
            reply_snippet: `To ${rep.receivedBy || 'Team'}: ${rep.subject}`,
          });
          newlyMarked++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked Gmail Inbox. Found ${replies.length} potential reply emails (${newlyMarked} newly marked in tracker).`,
      foundCount: replies.length,
      newlyMarked,
      replies,
    });
  } catch (error: unknown) {
    console.error('Error checking replies:', error);
    const message = error instanceof Error ? error.message : 'Failed to check replies via IMAP';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
