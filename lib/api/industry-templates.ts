// Industry starter kits: pipeline stages, email templates and variables. Backend: industry-templates/ and leads/pipelines (POST /pipelines/from-template).
import { apiRequestWithRefresh } from './interceptor';

export interface IndustryStage {
  name: string;
  probability: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface IndustryTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  pipelineStages: IndustryStage[];
  starterTemplates: Array<{ category: string; type: string; name: string; subject: string; body: string }>;
}

export const listIndustryTemplates = () =>
  apiRequestWithRefresh<IndustryTemplate[]>('/industry-templates', { method: 'GET', requiresAuth: true });

export const createPipelineFromTemplate = (input: { key: string; businessUnitId: number; name?: string }) =>
  apiRequestWithRefresh<{ id: number; name: string }>('/pipelines/from-template', { method: 'POST', body: input, requiresAuth: true });
