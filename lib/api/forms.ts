// Hosted and embeddable forms. A form's submissions go through the same intake as every other key.
import { apiRequest } from './client';
import { apiRequestWithRefresh } from './interceptor';

export const FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'select',
  'checkbox',
  'date',
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  select: 'Choice (dropdown)',
  checkbox: 'Tick box',
  date: 'Date',
};

/** Which sender field this answer fills. Email and phone fields map by type, so they need no role. */
export type FormFieldRole = 'name' | 'email' | 'phone' | 'message';

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  role?: FormFieldRole | null;
}

export interface FormItem {
  id: number;
  name: string;
  slug: string;
  path: string;
  status: 'active' | 'archived';
  businessUnitId: number;
  fields: FormField[];
  submitLabel: string;
  successMessage: string;
  autoCreateLead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormInput {
  businessUnitId?: number;
  name: string;
  fields: FormField[];
  submitLabel?: string;
  successMessage?: string;
  autoCreateLead?: boolean;
}

export type FormPatch = Partial<Omit<FormInput, 'name'>> & {
  name?: string;
  status?: 'active' | 'archived';
};

export interface PublicFormField extends FormField {
  options: string[];
  placeholder: string;
}

export interface PublicForm {
  name: string;
  submitLabel: string;
  successMessage: string;
  organizationName: string | null;
  fields: PublicFormField[];
}

export const listForms = (businessUnitId?: number) =>
  apiRequestWithRefresh<FormItem[]>(
    `/forms${businessUnitId ? `?businessUnitId=${businessUnitId}` : ''}`,
    { method: 'GET', requiresAuth: true },
  );

export const createForm = (input: FormInput) =>
  apiRequestWithRefresh<FormItem>('/forms', { method: 'POST', body: input, requiresAuth: true });

export const updateForm = (id: number, patch: FormPatch) =>
  apiRequestWithRefresh<FormItem>(`/forms/${id}`, { method: 'PATCH', body: patch, requiresAuth: true });

/** Public: the form definition for the hosted page. */
export const getPublicForm = (slug: string) =>
  apiRequest<PublicForm>(`/api/v1/f/${encodeURIComponent(slug)}`, { method: 'GET', requiresAuth: false });

/** Public: submit answers. Keys are field keys. */
export const submitPublicForm = (slug: string, values: Record<string, string | boolean>) =>
  apiRequest<{ success: boolean; message: string }>(
    `/api/v1/f/${encodeURIComponent(slug)}/submit`,
    { method: 'POST', body: values, requiresAuth: false },
  );
