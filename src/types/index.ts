export type ContactStatus = 'NOT_CONTACTED' | 'CONTACTED';

export interface Company {
  id: string;
  serial_number: number;
  company_name: string;
  phone_number: string;
  status: ContactStatus;
  called_by_user_id: string | null;
  called_by_name: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedTeamMember {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: 'Aibin' | 'Milan' | 'Edwin' | 'Seba' | 'Lakshmi' | string;
  is_active: boolean;
  created_at: string;
}

export interface ContactHistoryItem {
  id: string;
  company_id: string;
  changed_by_user_id: string | null;
  changed_by_name: string;
  action: 'MARK_CONTACTED' | 'RESET_NOT_CONTACTED';
  previous_status: ContactStatus;
  new_status: ContactStatus;
  notes?: string | null;
  created_at: string;
}

export interface RpcResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  company?: Company;
  data?: T;
}

export const TEAM_MEMBERS = [
  'Aibin',
  'Milan',
  'Edwin',
  'Seba',
  'Lakshmi',
] as const;

export type TeamMemberName = (typeof TEAM_MEMBERS)[number];
