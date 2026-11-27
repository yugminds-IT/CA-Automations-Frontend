// Automation: assignment rules, workflows, sequences, SLA and lead scoring, and in-CRM email.
// Backend: automation/ (routes under /automation) and the lead routes it extends.
import { apiRequestWithRefresh } from './interceptor';

export type AssignmentStrategy = 'round_robin' | 'load_balanced' | 'by_field';
export type WorkflowTrigger = 'lead_created' | 'stage_changed' | 'field_changed' | 'lead_inactive' | 'followup_overdue';
export type ConditionOp = 'exists' | 'equals' | 'contains' | 'gte';

export interface AutomationCatalog {
  fields: string[];
  operators: ConditionOp[];
  triggers: WorkflowTrigger[];
  actions: WorkflowActionType[];
  strategies: AssignmentStrategy[];
  stepKinds: Array<'email' | 'task'>;
}

export type WorkflowActionType = 'assign' | 'create_task' | 'add_tag' | 'notify' | 'send_email' | 'set_follow_up';

/** One action in a workflow. Only the fields for its type are used. */
export interface WorkflowAction {
  type: WorkflowActionType;
  userId?: number;
  title?: string;
  dueInDays?: number;
  tag?: string;
  message?: string;
  templateId?: number | null;
  subject?: string;
  body?: string;
  inDays?: number;
}

export interface WorkflowCondition {
  field: string;
  op: ConditionOp;
  value?: string | number | null;
}

export interface AssignmentRule {
  id: number;
  businessUnitId: number;
  name: string;
  strategy: AssignmentStrategy;
  priority: number;
  enabled: boolean;
  memberUserIds: number[];
  conditionField: string | null;
  conditionValue: string | null;
  targetUserId: number | null;
  cursorUserId: number | null;
}

export interface AssignmentRuleInput {
  name: string;
  strategy: AssignmentStrategy;
  businessUnitId: number;
  priority?: number;
  enabled?: boolean;
  memberUserIds?: number[];
  conditionField?: string | null;
  conditionValue?: string | null;
  targetUserId?: number | null;
}

export interface WorkflowRule {
  id: number;
  organizationId: number;
  businessUnitId: number | null;
  name: string;
  trigger: WorkflowTrigger;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
}

export interface WorkflowInput {
  name: string;
  trigger: WorkflowTrigger;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled?: boolean;
  businessUnitId?: number | null;
}

export interface WorkflowRun {
  id: number;
  leadId: number;
  trigger: WorkflowTrigger;
  status: 'ok' | 'failed';
  detail: string | null;
  createdAt: string;
}

export interface SequenceStep {
  delayDays: number;
  kind: 'email' | 'task';
  templateId?: number | null;
  subject?: string | null;
  body?: string | null;
  taskTitle?: string | null;
}

export interface Sequence {
  id: number;
  businessUnitId: number;
  name: string;
  enabled: boolean;
  stopOnStageChange: boolean;
  stopOnReply: boolean;
  steps: SequenceStep[];
}

export interface SequenceInput {
  name: string;
  businessUnitId: number;
  enabled?: boolean;
  stopOnStageChange?: boolean;
  stopOnReply?: boolean;
  steps: SequenceStep[];
}

export type EnrollmentStatus = 'active' | 'completed' | 'stopped';

export interface SequenceEnrollment {
  id: number;
  sequenceId: number;
  leadId: number;
  currentStep: number;
  nextStepAt: string | null;
  status: EnrollmentStatus;
  stopReason: string | null;
  createdAt: string;
}

export interface SlaPolicy {
  businessUnitId: number;
  enabled: boolean;
  firstResponseMinutes: number;
  escalateToUserId: number | null;
}

export interface ScoringRule {
  id: number;
  businessUnitId: number;
  name: string;
  field: string;
  op: ConditionOp;
  value: string | null;
  points: number;
  enabled: boolean;
}

export interface ScoringRuleInput {
  name: string;
  businessUnitId: number;
  field: string;
  op: ConditionOp;
  value?: string | null;
  points: number;
  enabled?: boolean;
}

export interface LeadEmailInput {
  templateId?: number | null;
  subject?: string;
  body?: string;
}

export interface LeadEmailResult {
  id: string;
  status: 'queued' | 'suppressed' | string;
  subject: string;
}

const base = '/automation';

export const getAutomationCatalog = () =>
  apiRequestWithRefresh<AutomationCatalog>(`${base}/catalog`, { method: 'GET', requiresAuth: true });

// ---- assignment rules
export const listAssignmentRules = (businessUnitId: number) =>
  apiRequestWithRefresh<AssignmentRule[]>(`${base}/assignment-rules?businessUnitId=${businessUnitId}`, {
    method: 'GET',
    requiresAuth: true,
  });

export const createAssignmentRule = (input: AssignmentRuleInput) =>
  apiRequestWithRefresh<AssignmentRule>(`${base}/assignment-rules`, { method: 'POST', body: input, requiresAuth: true });

export const updateAssignmentRule = (id: number, input: AssignmentRuleInput) =>
  apiRequestWithRefresh<AssignmentRule>(`${base}/assignment-rules/${id}`, { method: 'PUT', body: input, requiresAuth: true });

export const deleteAssignmentRule = (id: number) =>
  apiRequestWithRefresh<void>(`${base}/assignment-rules/${id}`, { method: 'DELETE', requiresAuth: true });

// ---- workflows
export const listWorkflows = (businessUnitId?: number) =>
  apiRequestWithRefresh<WorkflowRule[]>(`${base}/workflows${businessUnitId ? `?businessUnitId=${businessUnitId}` : ''}`, {
    method: 'GET',
    requiresAuth: true,
  });

export const createWorkflow = (input: WorkflowInput) =>
  apiRequestWithRefresh<WorkflowRule>(`${base}/workflows`, { method: 'POST', body: input, requiresAuth: true });

export const updateWorkflow = (id: number, input: WorkflowInput) =>
  apiRequestWithRefresh<WorkflowRule>(`${base}/workflows/${id}`, { method: 'PUT', body: input, requiresAuth: true });

export const deleteWorkflow = (id: number) =>
  apiRequestWithRefresh<void>(`${base}/workflows/${id}`, { method: 'DELETE', requiresAuth: true });

export const listWorkflowRuns = (id: number) =>
  apiRequestWithRefresh<WorkflowRun[]>(`${base}/workflows/${id}/runs`, { method: 'GET', requiresAuth: true });

// ---- sequences
export const listSequences = (businessUnitId: number) =>
  apiRequestWithRefresh<Sequence[]>(`${base}/sequences?businessUnitId=${businessUnitId}`, { method: 'GET', requiresAuth: true });

export const createSequence = (input: SequenceInput) =>
  apiRequestWithRefresh<Sequence>(`${base}/sequences`, { method: 'POST', body: input, requiresAuth: true });

export const updateSequence = (id: number, input: SequenceInput) =>
  apiRequestWithRefresh<Sequence>(`${base}/sequences/${id}`, { method: 'PUT', body: input, requiresAuth: true });

export const deleteSequence = (id: number) =>
  apiRequestWithRefresh<void>(`${base}/sequences/${id}`, { method: 'DELETE', requiresAuth: true });

export const listSequenceEnrollments = (id: number) =>
  apiRequestWithRefresh<SequenceEnrollment[]>(`${base}/sequences/${id}/enrollments`, { method: 'GET', requiresAuth: true });

// ---- SLA and scoring
export const getSlaPolicy = (businessUnitId: number) =>
  apiRequestWithRefresh<SlaPolicy | null>(`${base}/sla-policy?businessUnitId=${businessUnitId}`, { method: 'GET', requiresAuth: true });

export const saveSlaPolicy = (input: SlaPolicy) =>
  apiRequestWithRefresh<SlaPolicy>(`${base}/sla-policy`, { method: 'PUT', body: input, requiresAuth: true });

export const listScoringRules = (businessUnitId: number) =>
  apiRequestWithRefresh<ScoringRule[]>(`${base}/scoring-rules?businessUnitId=${businessUnitId}`, { method: 'GET', requiresAuth: true });

export const createScoringRule = (input: ScoringRuleInput) =>
  apiRequestWithRefresh<ScoringRule>(`${base}/scoring-rules`, { method: 'POST', body: input, requiresAuth: true });

export const updateScoringRule = (id: number, input: ScoringRuleInput) =>
  apiRequestWithRefresh<ScoringRule>(`${base}/scoring-rules/${id}`, { method: 'PUT', body: input, requiresAuth: true });

export const deleteScoringRule = (id: number) =>
  apiRequestWithRefresh<void>(`${base}/scoring-rules/${id}`, { method: 'DELETE', requiresAuth: true });

// ---- per lead
export const sendLeadEmail = (leadId: number, input: LeadEmailInput) =>
  apiRequestWithRefresh<LeadEmailResult>(`${base}/leads/${leadId}/email`, { method: 'POST', body: input, requiresAuth: true });

export const listLeadEnrollments = (leadId: number) =>
  apiRequestWithRefresh<SequenceEnrollment[]>(`${base}/leads/${leadId}/enrollments`, { method: 'GET', requiresAuth: true });

export const enrollLead = (leadId: number, sequenceId: number) =>
  apiRequestWithRefresh<SequenceEnrollment>(`${base}/leads/${leadId}/enrollments`, {
    method: 'POST',
    body: { sequenceId },
    requiresAuth: true,
  });

export const stopEnrollment = (enrollmentId: number) =>
  apiRequestWithRefresh<{ stopped: boolean }>(`${base}/enrollments/${enrollmentId}/stop`, { method: 'POST', requiresAuth: true });