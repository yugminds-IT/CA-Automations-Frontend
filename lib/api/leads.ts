// Leads, pipelines, activities and tasks. Every lead belongs to one business unit.
import { apiRequestWithRefresh } from './interceptor';

export type LeadStatus = 'open' | 'won' | 'lost';

export interface Lead {
  id: number;
  organizationId: number;
  businessUnitId: number;
  pipelineId: number;
  stageId: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: LeadStatus;
  value: number | null;
  ownerUserId: number | null;
  tags: string[];
  /** Custom field values, already filtered to what the signed-in role can see. */
  customData: Record<string, unknown>;
  lostReason: string | null;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  /** Rules-based score, 0 to 100 (automation). */
  score: number;
  /** First-response deadline from the unit's SLA policy. Null when none applies. */
  firstResponseDueAt: string | null;
  firstRespondedAt: string | null;
  slaEscalatedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: number;
  pipelineId: number;
  name: string;
  position: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  /** False when the stage is turned off. Missing means on. */
  isActive?: boolean;
}

export interface Pipeline {
  id: number;
  businessUnitId: number;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
}

export interface LeadActivity {
  id: number;
  leadId: number;
  type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'system' | 'email_received' | 'email_opened' | 'email_clicked';
  body: string | null;
  createdByUserId: number | null;
  createdAt: string;
}

export interface LeadTask {
  id: number;
  leadId: number;
  title: string;
  dueAt: string | null;
  assignedToUserId: number | null;
  completedAt: string | null;
}

export interface DuplicateMatch {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
}

/** Thrown shape when the server finds duplicates (HTTP 409). */
export interface DuplicateConflict {
  message: string;
  duplicates: DuplicateMatch[];
}

export interface CreateLeadInput {
  businessUnitId: number;
  pipelineId?: number;
  stageId?: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  value?: number;
  customData?: Record<string, unknown>;
  ownerUserId?: number;
  allowDuplicate?: boolean;
}

export interface ListLeadsParams {
  businessUnitId?: number;
  pipelineId?: number;
  status?: LeadStatus;
  ownerUserId?: string;
  search?: string;
  /** ISO range on the next follow-up date, [from, to). */
  followUpFrom?: string;
  followUpTo?: string;
  page?: number;
  limit?: number;
}

const base = '/leads';

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : '';
};

export const listLeads = (params: ListLeadsParams) =>
  apiRequestWithRefresh<{ items: Lead[]; total: number; page: number; limit: number }>(
    `${base}${qs(params as Record<string, string | number | undefined>)}`,
    { method: 'GET', requiresAuth: true },
  );

export const getLead = (id: number) =>
  apiRequestWithRefresh<Lead>(`${base}/${id}`, { method: 'GET', requiresAuth: true });

export const createLead = (data: CreateLeadInput) =>
  apiRequestWithRefresh<Lead>(base, { method: 'POST', body: data, requiresAuth: true });

export const updateLead = (id: number, data: Partial<Lead>) =>
  apiRequestWithRefresh<Lead>(`${base}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });

export const moveLead = (id: number, stageId: number, lostReason?: string) =>
  apiRequestWithRefresh<Lead>(`${base}/${id}/move`, {
    method: 'POST',
    body: { stageId, ...(lostReason ? { lostReason } : {}) },
    requiresAuth: true,
  });

export const mergeLeads = (keepId: number, dropId: number) =>
  apiRequestWithRefresh<Lead>(`${base}/${keepId}/merge/${dropId}`, { method: 'POST', requiresAuth: true });

export const deleteLead = (id: number) =>
  apiRequestWithRefresh<void>(`${base}/${id}`, { method: 'DELETE', requiresAuth: true });

export const listActivities = (leadId: number) =>
  apiRequestWithRefresh<LeadActivity[]>(`${base}/${leadId}/activities`, { method: 'GET', requiresAuth: true });

export const addActivity = (leadId: number, type: LeadActivity['type'], body: string) =>
  apiRequestWithRefresh<LeadActivity>(`${base}/${leadId}/activities`, {
    method: 'POST',
    body: { type, body },
    requiresAuth: true,
  });

export const addTask = (leadId: number, title: string, dueAt?: string) =>
  apiRequestWithRefresh<LeadTask>(`${base}/${leadId}/tasks`, {
    method: 'POST',
    body: { title, ...(dueAt ? { dueAt } : {}) },
    requiresAuth: true,
  });

/** Open tasks. Pass a unit and/or a due range (ISO, [dueFrom, dueTo)) to narrow them. */
export const listOpenTasks = (params?: { businessUnitId?: number; dueFrom?: string; dueTo?: string }) =>
  apiRequestWithRefresh<LeadTask[]>(`/tasks${qs({ status: 'open', ...params } as Record<string, string | number | undefined>)}`, {
    method: 'GET',
    requiresAuth: true,
  });

export const setTaskDone = (taskId: number, done: boolean) =>
  apiRequestWithRefresh<LeadTask>(`/tasks/${taskId}`, { method: 'PATCH', body: { done }, requiresAuth: true });

export const listPipelines = (businessUnitId: number) =>
  apiRequestWithRefresh<Pipeline[]>(`/pipelines?businessUnitId=${businessUnitId}`, {
    method: 'GET',
    requiresAuth: true,
  });

export const addPipelineStage = (pipelineId: number, name: string, outcome: 'open' | 'won' | 'lost') =>
  apiRequestWithRefresh<PipelineStage>(`/pipelines/${pipelineId}/stages`, {
    method: 'POST',
    body: { name, outcome },
    requiresAuth: true,
  });

export const updatePipelineStage = (stageId: number, data: { name?: string; isActive?: boolean }) =>
  apiRequestWithRefresh<PipelineStage>(`/pipelines/stages/${stageId}`, {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });

export const reorderPipelineStages = (pipelineId: number, ids: number[]) =>
  apiRequestWithRefresh<Pipeline>(`/pipelines/${pipelineId}/stages/order`, {
    method: 'PATCH',
    body: { ids },
    requiresAuth: true,
  });

/** Leads in the unit with the same email or phone. Check before creating so the user can merge instead. */
export const findDuplicateLeads = (businessUnitId: number, email?: string, phone?: string) =>
  apiRequestWithRefresh<DuplicateMatch[]>(
    `${base}/duplicates${qs({ businessUnitId, email, phone })}`,
    { method: 'GET', requiresAuth: true },
  );

/** Staff who can own a lead (client-portal users are never listed). */
export interface LeadOwner {
  id: number;
  name: string;
  email: string;
  role: string | null;
}

export interface ImportIssue {
  /** Line in the file; the header is line 1. */
  line: number;
  reason: string;
}

export interface ImportLeadsResult {
  created: number;
  duplicates: ImportIssue[];
  failed: ImportIssue[];
}

export const listLeadOwners = () =>
  apiRequestWithRefresh<LeadOwner[]>(`${base}/owners`, { method: 'GET', requiresAuth: true });

/** Up to 500 rows per call. Rows are judged one by one; the result says which lines were skipped and why. */
export const importLeads = (businessUnitId: number, rows: Record<string, string>[]) =>
  apiRequestWithRefresh<ImportLeadsResult>(`${base}/import`, {
    method: 'POST',
    body: { businessUnitId, rows },
    requiresAuth: true,
  });
