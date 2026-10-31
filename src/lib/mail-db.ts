import fs from 'fs';
import path from 'path';
import { EmailCompany, EmailConfig } from '@/types/email';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const companiesPath = path.join(process.cwd(), 'src', 'data', 'email_companies.json');
const configPath = path.join(process.cwd(), 'src', 'data', 'email_config.json');

// In-memory cache to prevent concurrent thread race conditions
let cachedCompaniesList: EmailCompany[] | null = null;

/**
 * Read email companies from local JSON file (with shared in-memory singleton)
 */
export function getLocalEmailCompanies(): EmailCompany[] {
  if (cachedCompaniesList && cachedCompaniesList.length > 0) {
    return cachedCompaniesList;
  }
  try {
    if (fs.existsSync(companiesPath)) {
      cachedCompaniesList = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
      return cachedCompaniesList!;
    }
  } catch (e) {
    console.error('Error reading local email companies:', e);
  }
  return [];
}

/**
 * Save email companies to local JSON file safely (never throws on read-only filesystem)
 */
export function saveLocalEmailCompanies(companies: EmailCompany[]): void {
  cachedCompaniesList = companies;
  try {
    fs.writeFileSync(companiesPath, JSON.stringify(companies, null, 2), 'utf8');
  } catch (e) {
    // Expected on Vercel read-only filesystem; Supabase is the primary store
    console.warn('Could not write to local email_companies.json (read-only filesystem):', e);
  }
}

/**
 * Read email config from local JSON file
 */
export function getLocalConfig(): EmailConfig {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading local config:', e);
  }

  return {
    active: true,
    test_mode: false,
    test_recipient_email: 'aibinjoseph9605573691@gmail.com',
    batch_count: 39,
    schedules: [
      { id: 'batch-1', label: 'Morning Slot (10:00 AM)', time: '10:00', count: 39, enabled: true },
      { id: 'batch-2', label: 'Midday Slot (12:00 PM)', time: '12:00', count: 39, enabled: true },
      { id: 'batch-3', label: 'Afternoon Slot (02:00 PM)', time: '14:00', count: 39, enabled: true },
    ],
    template: {
      subject: 'Request for MCA Internship Opportunity',
      body: `Dear Team,

We are a team of five final-year MCA students from Saintgits College of Engineering, Kottayam, seeking an internship opportunity as part of our final semester.

We are available for a three-month unpaid internship from January 1 to March 31. We have attached the resumes of all five team members for your reference.

Kindly consider us for a suitable internship opportunity at your company.

Thank you for your time and consideration.

Best regards,
Final-Year MCA Students
Saintgits College of Engineering, Kottayam`,
    },
    last_run_at: null,
    next_run_info: 'Ready for automated schedule',
  };
}

/**
 * Save email config to local JSON file safely
 */
export function saveLocalConfig(config: EmailConfig): void {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write to local email_config.json (read-only filesystem):', e);
  }
}

/**
 * Get all email companies (Supabase primary with fallback to local JSON)
 */
export async function getEmailCompaniesList(): Promise<EmailCompany[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('email_companies')
      .select('id, serial_number, company_name, email, website, status, sent_at, replied_at, last_error, reply_snippet, sent_by_name, sent_by_email')
      .order('serial_number', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((c) => ({
        id: c.id,
        serial_number: c.serial_number,
        company_name: c.company_name,
        email: c.email || '',
        website: c.website || undefined,
        status: (c.status as EmailCompany['status']) || 'PENDING',
        sent_at: c.sent_at || null,
        replied_at: c.replied_at || null,
        last_error: c.last_error || null,
        reply_snippet: c.reply_snippet || null,
        sent_by_name: c.sent_by_name || null,
        sent_by_email: c.sent_by_email || null,
      }));
    }
  } catch (err) {
    console.warn('Supabase query failed, falling back to local email_companies.json:', err);
  }

  return getLocalEmailCompanies();
}

/**
 * Update an email company's status in Supabase and local JSON
 */
export async function updateEmailCompanyStatus(
  companyIdentifier:
    | {
        id?: string | number;
        serial_number?: number;
        company_name?: string;
        email?: string;
      }
    | string
    | number,
  updates: {
    status: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'REPLIED';
    sent_at?: string | null;
    replied_at?: string | null;
    sent_by_name?: string | null;
    sent_by_email?: string | null;
    last_error?: string | null;
    reply_snippet?: string | null;
  }
): Promise<void> {
  // Extract identifiers
  let serialNumber: number | null = null;
  let companyName: string | null = null;
  let email: string | null = null;

  if (typeof companyIdentifier === 'number') {
    serialNumber = companyIdentifier;
  } else if (typeof companyIdentifier === 'string') {
    if (companyIdentifier.startsWith('email-')) {
      const parsed = parseInt(companyIdentifier.replace('email-', ''), 10);
      if (!isNaN(parsed)) serialNumber = parsed;
    } else {
      companyName = companyIdentifier;
    }
  } else if (typeof companyIdentifier === 'object' && companyIdentifier !== null) {
    if (typeof companyIdentifier.serial_number === 'number') {
      serialNumber = companyIdentifier.serial_number;
    } else if (typeof companyIdentifier.id === 'string' && companyIdentifier.id.startsWith('email-')) {
      const parsed = parseInt(companyIdentifier.id.replace('email-', ''), 10);
      if (!isNaN(parsed)) serialNumber = parsed;
    }
    if (companyIdentifier.company_name) companyName = companyIdentifier.company_name;
    if (companyIdentifier.email) email = companyIdentifier.email;
  }

  // 1. Update in local file cache
  const localList = getLocalEmailCompanies();
  const localIdx = localList.findIndex((c) => {
    if (serialNumber && c.serial_number === serialNumber) return true;
    if (companyName && c.company_name.toLowerCase() === companyName.toLowerCase()) return true;
    if (email && c.email.toLowerCase() === email.toLowerCase()) return true;
    if (typeof companyIdentifier === 'string' && (c.id === companyIdentifier || c.company_name === companyIdentifier)) return true;
    return false;
  });

  if (localIdx !== -1) {
    localList[localIdx] = {
      ...localList[localIdx],
      ...updates,
    };
    saveLocalEmailCompanies(localList);
  }

  // 2. Update in Supabase (with resilient upsert)
  try {
    const supabase = getSupabaseAdminClient();
    const targetCompany = localIdx !== -1 ? localList[localIdx] : null;

    if (targetCompany) {
      const upsertPayload = {
        id: targetCompany.id,
        serial_number: targetCompany.serial_number,
        company_name: targetCompany.company_name,
        email: targetCompany.email,
        website: targetCompany.website || null,
        status: updates.status,
        sent_at: updates.sent_at !== undefined ? updates.sent_at : targetCompany.sent_at,
        replied_at: updates.replied_at !== undefined ? updates.replied_at : targetCompany.replied_at,
        sent_by_name: updates.sent_by_name !== undefined ? updates.sent_by_name : targetCompany.sent_by_name,
        sent_by_email: updates.sent_by_email !== undefined ? updates.sent_by_email : targetCompany.sent_by_email,
        last_error: updates.last_error !== undefined ? updates.last_error : targetCompany.last_error,
        reply_snippet: updates.reply_snippet !== undefined ? updates.reply_snippet : targetCompany.reply_snippet,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from('email_companies')
        .upsert(upsertPayload, { onConflict: 'serial_number' });

      if (upsertErr) {
        console.error('Supabase upsert error for company', targetCompany.company_name, ':', upsertErr.message);
      }
    } else {
      const payload: Record<string, unknown> = {
        status: updates.status,
        sent_at: updates.sent_at,
        replied_at: updates.replied_at,
        sent_by_name: updates.sent_by_name,
        sent_by_email: updates.sent_by_email,
        last_error: updates.last_error,
        reply_snippet: updates.reply_snippet,
        updated_at: new Date().toISOString(),
      };

      if (serialNumber && !isNaN(serialNumber)) {
        await supabase.from('email_companies').update(payload).eq('serial_number', serialNumber);
      } else if (companyName) {
        await supabase.from('email_companies').update(payload).ilike('company_name', companyName);
      } else if (email) {
        await supabase.from('email_companies').update(payload).ilike('email', email);
      }
    }

    // Optional audit log (safely isolated)
    if (updates.status === 'SENT' || updates.status === 'FAILED' || updates.status === 'REPLIED') {
      try {
        await supabase.from('email_logs').insert({
          company_name: targetCompany?.company_name || companyName || String(serialNumber || 'unknown'),
          recipient_email: targetCompany?.email || 'unknown',
          sent_by_name: updates.sent_by_name,
          sent_by_email: updates.sent_by_email,
          status: updates.status,
          error_message: updates.last_error,
          reply_snippet: updates.reply_snippet,
          sent_at: updates.sent_at || new Date().toISOString(),
          replied_at: updates.replied_at,
        });
      } catch {
        // Safe to ignore audit log failures
      }
    }
  } catch (err) {
    console.warn('Could not update company in Supabase:', err);
  }
}

/**
 * Get email schedule configuration (Supabase primary with local fallback)
 */
export async function getEmailConfig(): Promise<EmailConfig> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('email_schedule_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        active: data.active,
        test_mode: data.test_mode,
        test_recipient_email: data.test_recipient_email || 'aibinjoseph9605573691@gmail.com',
        batch_count: data.batch_count || 39,
        schedules: Array.isArray(data.schedules) ? data.schedules : getLocalConfig().schedules,
        template: {
          subject: data.subject_template || 'Request for MCA Internship Opportunity',
          body: data.body_template || getLocalConfig().template.body,
        },
        last_run_at: data.last_run_at || null,
        next_run_info: data.active
          ? 'Automated schedule active for 10 AM, 12 PM, 2 PM IST'
          : 'Scheduler is currently paused',
      };
    }
  } catch (err) {
    console.warn('Could not read email config from Supabase, using local:', err);
  }

  return getLocalConfig();
}

/**
 * Save email schedule configuration
 */
export async function saveEmailConfig(config: EmailConfig): Promise<void> {
  saveLocalConfig(config);

  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase.from('email_schedule_settings').select('id').limit(1).maybeSingle();

    if (data?.id) {
      await supabase
        .from('email_schedule_settings')
        .update({
          active: config.active,
          test_mode: config.test_mode,
          test_recipient_email: config.test_recipient_email,
          batch_count: config.batch_count,
          schedules: config.schedules,
          subject_template: config.template.subject,
          body_template: config.template.body,
          last_run_at: config.last_run_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
    } else {
      await supabase.from('email_schedule_settings').insert({
        active: config.active,
        test_mode: config.test_mode,
        test_recipient_email: config.test_recipient_email,
        batch_count: config.batch_count,
        schedules: config.schedules,
        subject_template: config.template.subject,
        body_template: config.template.body,
        last_run_at: config.last_run_at,
      });
    }
  } catch (err) {
    console.warn('Could not save email config to Supabase:', err);
  }
}
