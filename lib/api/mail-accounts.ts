// Outbound SMTP accounts. Each account belongs to one business unit, or to the whole
// organization (businessUnitId null). Passwords are write-only: the API never returns them.
import { apiRequestWithRefresh } from './interceptor';

export interface MailAccount {
  id: number;
  organizationId: number;
  /** null = organization-wide account */
  businessUnitId: number | null;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string | null;
  whiteLabel: boolean;
  isActive: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMailAccountInput {
  businessUnitId?: number | null;
  label: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string | null;
  whiteLabel?: boolean;
}

export type UpdateMailAccountInput = Partial<Omit<CreateMailAccountInput, 'businessUnitId'>> & {
  isActive?: boolean;
};

const base = '/mail-accounts';

/** businessUnitId: a unit id, "org" for organization-wide accounts, or omit for all. */
export const listMailAccounts = (businessUnitId?: number | 'org') => {
  const qs = businessUnitId === undefined ? '' : `?businessUnitId=${businessUnitId}`;
  return apiRequestWithRefresh<MailAccount[]>(`${base}${qs}`, { method: 'GET', requiresAuth: true });
};

export const createMailAccount = (data: CreateMailAccountInput) =>
  apiRequestWithRefresh<MailAccount>(base, { method: 'POST', body: data, requiresAuth: true });

export const updateMailAccount = (id: number, data: UpdateMailAccountInput) =>
  apiRequestWithRefresh<MailAccount>(`${base}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });

export const deactivateMailAccount = (id: number) =>
  apiRequestWithRefresh<MailAccount>(`${base}/${id}/deactivate`, { method: 'POST', requiresAuth: true });

/** Logs in to the SMTP server with the saved credentials. Throws with the server's reason on failure. */
export const verifyMailAccount = (id: number) =>
  apiRequestWithRefresh<MailAccount>(`${base}/${id}/verify`, { method: 'POST', requiresAuth: true });
