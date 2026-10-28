import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { EmailCompany } from '@/types/email';
import { getEmailCompaniesList, updateEmailCompanyStatus } from '@/lib/mail-db';

const companiesPath = path.join(process.cwd(), 'src', 'data', 'email_companies.json');

export function getEmailCompanies(): EmailCompany[] {
  try {
    if (fs.existsSync(companiesPath)) {
      const data = fs.readFileSync(companiesPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading email companies:', e);
  }
  return [];
}

export function saveEmailCompanies(companies: EmailCompany[]) {
  try {
    fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write to email_companies.json:', e);
  }
}

export async function GET() {
  const companies = await getEmailCompaniesList();

  const todayStr = new Date().toISOString().split('T')[0];

  const stats = {
    total: companies.length,
    pending: companies.filter((c) => c.status === 'PENDING').length,
    sent: companies.filter((c) => c.status === 'SENT' || c.status === 'REPLIED').length,
    replied: companies.filter((c) => c.status === 'REPLIED').length,
    failed: companies.filter((c) => c.status === 'FAILED').length,
    sent_today: companies.filter((c) => c.sent_at && c.sent_at.startsWith(todayStr)).length,
    by_sender: {
      Aibin: {
        sent: companies.filter((c) => c.sent_by_name?.toLowerCase().includes('aibin')).length,
        replied: companies.filter((c) => c.sent_by_name?.toLowerCase().includes('aibin') && c.status === 'REPLIED').length,
      },
      Lakshmi: {
        sent: companies.filter((c) => c.sent_by_name?.toLowerCase().includes('lakshmi')).length,
        replied: companies.filter((c) => c.sent_by_name?.toLowerCase().includes('lakshmi') && c.status === 'REPLIED').length,
      },
      Seba: {
        sent: companies.filter((c) => c.sent_by_name?.toLowerCase().includes('seba')).length,
        replied: companies.filter((c) => c.sent_by_name?.toLowerCase().includes('seba') && c.status === 'REPLIED').length,
      },
    },
  };

  return NextResponse.json({
    success: true,
    stats,
    companies,
  });
}

export async function POST(req: Request) {
  try {
    const { action, companyId, status } = await req.json();

    if (action === 'UPDATE_STATUS' && companyId) {
      await updateEmailCompanyStatus(companyId, { status });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error modifying companies';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
