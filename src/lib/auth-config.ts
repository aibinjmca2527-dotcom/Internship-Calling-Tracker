import { TeamMemberName, TEAM_MEMBERS } from '@/types';

export interface ApprovedMemberConfig {
  displayName: TeamMemberName;
  email: string;
  username: string;
}

export const APPROVED_TEAM_ACCOUNTS: ApprovedMemberConfig[] = [
  {
    displayName: 'Aibin',
    username: 'aibin',
    email: 'aibinj.mca2527@saintgits.org',
  },
  {
    displayName: 'Milan',
    username: 'milan',
    email: 'milans.mca2527@saintgits.org',
  },
  {
    displayName: 'Edwin',
    username: 'edwin',
    email: 'edwinj.mca2527@saintgits.org',
  },
  {
    displayName: 'Seba',
    username: 'seba',
    email: 'sebamt.mca2527@saintgits.org',
  },
  {
    displayName: 'Lakshmi',
    username: 'lakshmi',
    email: 'lakshmis.mca2527@saintgits.org',
  },
];

export function getApprovedMembersConfig(): ApprovedMemberConfig[] {
  return APPROVED_TEAM_ACCOUNTS;
}

export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str.trim().toLowerCase();
}

export const normalizeEmail = normalizeString;

/**
 * Validates simple credentials:
 * Username can be their name (e.g., 'Aibin' or 'aibin') or their Saintgits email.
 * Password matches their name (e.g., 'Aibin' or 'aibin').
 */
export function validateSimpleCredentials(
  identifier: string | null | undefined,
  password: string | null | undefined
): ApprovedMemberConfig | null {
  const normId = normalizeString(identifier);
  const normPass = normalizeString(password);

  if (!normId || !normPass) return null;

  for (const account of APPROVED_TEAM_ACCOUNTS) {
    const normName = normalizeString(account.displayName);
    const normEmail = normalizeString(account.email);
    const normUsername = normalizeString(account.username);

    const idMatches =
      normId === normName ||
      normId === normUsername ||
      normId === normEmail;

    const passMatches =
      normPass === normName ||
      normPass === normUsername ||
      normPass === normEmail;

    if (idMatches && passMatches) {
      return account;
    }
  }

  return null;
}

export function isEmailApproved(email: string | null | undefined): boolean {
  const norm = normalizeString(email);
  if (!norm) return false;
  return APPROVED_TEAM_ACCOUNTS.some(
    (m) =>
      normalizeString(m.email) === norm ||
      normalizeString(m.displayName) === norm ||
      normalizeString(m.username) === norm
  );
}

export function getMemberByEmail(email: string | null | undefined): ApprovedMemberConfig | null {
  const norm = normalizeString(email);
  if (!norm) return null;
  return (
    APPROVED_TEAM_ACCOUNTS.find(
      (m) =>
        normalizeString(m.email) === norm ||
        normalizeString(m.displayName) === norm ||
        normalizeString(m.username) === norm
    ) || null
  );
}
