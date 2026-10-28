export type EmailStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'REPLIED';

export interface EmailCompany {
  id: string;
  serial_number: number;
  company_name: string;
  email: string;
  website?: string | null;
  status: EmailStatus;
  sent_at?: string | null;
  replied_at?: string | null;
  last_error?: string | null;
  reply_snippet?: string | null;
  sent_by_name?: string | null;
  sent_by_email?: string | null;
  is_test_company?: boolean;
}

export interface SenderAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  isActive: boolean;
  totalSent?: number;
  totalReplied?: number;
}

export interface ScheduleSlot {
  id: string;
  label: string;
  time: string; // 'HH:MM' (24-hour)
  count: number;
  enabled: boolean;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailConfig {
  active: boolean;
  test_mode: boolean;
  test_recipient_email: string;
  batch_count: number;
  schedules: ScheduleSlot[];
  template: EmailTemplate;
  last_run_at?: string | null;
  next_run_info?: string;
}

export interface EmailLog {
  id: string;
  company_id?: string;
  company_name: string;
  recipient_email: string;
  status: 'SENT' | 'FAILED' | 'REPLIED';
  sent_at: string;
  error_message?: string | null;
  replied_at?: string | null;
  is_test: boolean;
}

export interface ResumeAttachment {
  filename: string;
  displayName: string;
  studentName: string;
  sizeBytes: number;
  relativePath: string;
  exists: boolean;
}
