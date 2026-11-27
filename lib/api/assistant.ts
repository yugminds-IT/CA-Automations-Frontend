// Sales assistant (next steps, reply drafts, note cleanup) and SMS / WhatsApp messaging.
// Backend: ai/ (routes under /ai) and messaging/ (routes under /messaging).
import { apiRequestWithRefresh } from './interceptor';

export type ActionPriority = 'high' | 'medium' | 'low';
export interface NextAction {
  priority: ActionPriority;
  title: string;
  reason: string;
}
export type DraftTone = 'formal' | 'friendly' | 'brief';
export interface DraftReply {
  subject: string;
  body: string;
  source: 'model' | 'template';
}
export interface CleanedNote {
  text: string;
  source: 'model' | 'rules';
}
export type MessageChannel = 'sms' | 'whatsapp';
export interface MessagingStatus {
  sms: boolean;
  whatsapp: boolean;
}

export const getAssistantStatus = () =>
  apiRequestWithRefresh<{ modelConfigured: boolean }>('/ai/status', { method: 'GET', requiresAuth: true });

export const getNextActions = (leadId: number) =>
  apiRequestWithRefresh<{ actions: NextAction[] }>(`/ai/leads/${leadId}/next-actions`, { method: 'GET', requiresAuth: true });

export const draftReply = (leadId: number, input: { intent?: string; tone?: DraftTone }) =>
  apiRequestWithRefresh<DraftReply>(`/ai/leads/${leadId}/draft-reply`, { method: 'POST', body: input, requiresAuth: true });

export const cleanNote = (text: string) =>
  apiRequestWithRefresh<CleanedNote>('/ai/notes/clean', { method: 'POST', body: { text }, requiresAuth: true });

export const getMessagingStatus = () =>
  apiRequestWithRefresh<MessagingStatus>('/messaging/status', { method: 'GET', requiresAuth: true });

export const sendLeadMessage = (leadId: number, channel: MessageChannel, body: string) =>
  apiRequestWithRefresh<{ ok: true; providerMessageId: string; activityId: number }>(`/messaging/leads/${leadId}`, {
    method: 'POST',
    body: { channel, body },
    requiresAuth: true,
  });
