// Permission profiles, teams, staff accounts, invites and the audit trail. Backend: access/ and staff/.
import { apiRequest } from './client';
import { apiRequestWithRefresh } from './interceptor';
import type { UnitStructure } from '../unit-structure';

export type DataScope = 'own' | 'team' | 'units' | 'org';

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  title: string;
  permissions: PermissionDef[];
}

export interface PermissionCatalog {
  groups: PermissionGroup[];
  dataScopes: Record<DataScope, string>;
}

export interface PermissionProfile {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  dataScope: DataScope;
  isPreset: boolean;
  staffCount: number;
}

export interface ProfileInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
  dataScope?: DataScope;
}

export interface Team {
  id: number;
  name: string;
  parentTeamId: number | null;
  managerUserId: number | null;
  managerName: string | null;
  memberCount: number;
}

export interface TeamInput {
  name?: string;
  parentTeamId?: number | null;
  managerUserId?: number | null;
}

export interface StaffMember {
  id: number;
  name: string | null;
  email: string;
  roleName: string | null;
  isActive: boolean;
  profileId: number | null;
  profileName: string | null;
  teamId: number | null;
  teamName: string | null;
  businessUnitIds: number[];
  /** Whole units: they see every brand in them, including brands added later. */
  orgUnitIds: number[];
  inviteStatus: 'pending' | 'accepted';
}

export interface InviteInput {
  name: string;
  email: string;
  roleName?: 'CAA' | 'ORG_EMPLOYEE' | 'ORG_ADMIN';
  profileId?: number;
  businessUnitIds?: number[];
  orgUnitIds?: number[];
  mode?: 'email' | 'temporary_password';
  teamId?: number;
}

export interface InviteResult {
  id: number;
  email: string;
  mode: 'email' | 'temporary_password';
  sent?: boolean;
  inviteLink?: string;
  temporaryPassword?: string;
}

export interface BulkInviteInput {
  csv: string;
  defaultProfileId?: number;
  businessUnitIds?: number[];
  orgUnitIds?: number[];
  mode?: 'email' | 'temporary_password';
  teamId?: number;
}

export interface BulkInviteRowResult {
  line: number;
  email: string;
  ok: boolean;
  error?: string;
  sent?: boolean;
  inviteLink?: string;
  temporaryPassword?: string;
}

export interface BulkInviteResult {
  total: number;
  invited: number;
  failed: number;
  results: BulkInviteRowResult[];
}

export interface StaffUpdate {
  profileId?: number | null;
  teamId?: number | null;
  businessUnitIds?: number[];
  orgUnitIds?: number[];
  isActive?: boolean;
  reassignTo?: number | null;
}

export interface AuditEvent {
  id: number;
  actorName: string | null;
  action: string;
  summary: string;
  createdAt: string;
}

export interface SignInEvent {
  id: number;
  type: string;
  userEmail: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isError: boolean;
  createdAt: string;
}

export const getPermissionCatalog = () =>
  apiRequestWithRefresh<PermissionCatalog>('/access/permissions', { method: 'GET', requiresAuth: true });

export const listProfiles = () =>
  apiRequestWithRefresh<PermissionProfile[]>('/access/profiles', { method: 'GET', requiresAuth: true });

export const createProfile = (input: ProfileInput) =>
  apiRequestWithRefresh<PermissionProfile>('/access/profiles', { method: 'POST', body: input, requiresAuth: true });

export const updateProfile = (id: number, input: ProfileInput) =>
  apiRequestWithRefresh<PermissionProfile>(`/access/profiles/${id}`, { method: 'PATCH', body: input, requiresAuth: true });

export const deleteProfile = (id: number) =>
  apiRequestWithRefresh<void>(`/access/profiles/${id}`, { method: 'DELETE', requiresAuth: true });

export const listTeams = () =>
  apiRequestWithRefresh<Team[]>('/access/teams', { method: 'GET', requiresAuth: true });

export const createTeam = (input: TeamInput) =>
  apiRequestWithRefresh<Team>('/access/teams', { method: 'POST', body: input, requiresAuth: true });

export const updateTeam = (id: number, input: TeamInput) =>
  apiRequestWithRefresh<Team>(`/access/teams/${id}`, { method: 'PATCH', body: input, requiresAuth: true });

export const deleteTeam = (id: number) =>
  apiRequestWithRefresh<{ deleted: boolean }>(`/access/teams/${id}`, { method: 'DELETE', requiresAuth: true });

export const listStaff = () =>
  apiRequestWithRefresh<StaffMember[]>('/staff', { method: 'GET', requiresAuth: true });

export const inviteStaff = (input: InviteInput) =>
  apiRequestWithRefresh<InviteResult>('/staff/invites', { method: 'POST', body: input, requiresAuth: true });

export const bulkInviteStaff = (input: BulkInviteInput) =>
  apiRequestWithRefresh<BulkInviteResult>('/staff/invites/bulk', { method: 'POST', body: input, requiresAuth: true });

export const updateStaff = (id: number, patch: StaffUpdate) =>
  apiRequestWithRefresh<{ id: number; isActive: boolean; profileId: number | null }>(`/staff/${id}`, {
    method: 'PATCH',
    body: patch,
    requiresAuth: true,
  });

/** Recent staff, profile and team changes. Pass a prefix such as "staff." to narrow. */
export const listAuditEvents = (prefix?: string) =>
  apiRequestWithRefresh<AuditEvent[]>(`/access/audit${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`, {
    method: 'GET',
    requiresAuth: true,
  });

/** Sign-ins for the organization, or for one person when userId is given. */
export const listSignIns = (userId?: number) =>
  apiRequestWithRefresh<SignInEvent[]>(`/access/sign-ins${userId ? `?userId=${userId}` : ''}`, {
    method: 'GET',
    requiresAuth: true,
  });

/** Public: sets the password for an invite token. */
export const acceptStaffInvite = (token: string, password: string) =>
  apiRequest<{ success: boolean }>('/staff/invites/accept', {
    method: 'POST',
    body: { token, password },
    requiresAuth: false,
  });

export interface MyAccess {
  permissions: string[];
  dataScope: string;
  unitIds: number[];
  /** False for a single-brand layout: no units or brands to manage, everyone sees its data directly. */
  adminPanel: boolean;
  unitStructure?: UnitStructure;
}

/** The signed-in user's permission keys, data scope, unit ids and admin-panel setting. Backend: access/ GET /access/me. */
export const getMyAccess = () =>
  apiRequestWithRefresh<MyAccess>('/access/me', {
    method: 'GET',
    requiresAuth: true,
  });
