// Lead custom fields, defined per business unit. Values live on each lead as customData.
import { apiRequestWithRefresh } from './interceptor';

export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'email',
  'phone',
  'url',
  'select',
  'radio',
  'multiselect',
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

/** Roles that can be listed in visibleToRoles / editableByRoles. Empty list = every staff role. */
export const FIELD_ROLES = [
  { value: 'ORG_ADMIN', label: 'Admin' },
  { value: 'CAA', label: 'Accountant' },
  { value: 'ORG_EMPLOYEE', label: 'Staff' },
] as const;

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  number: 'Number',
  date: 'Date',
  boolean: 'Yes / no',
  email: 'Email',
  phone: 'Phone',
  url: 'Link',
  select: 'Dropdown (choose one)',
  radio: 'Radio buttons (choose one)',
  multiselect: 'Checkboxes (choose many)',
};

export interface CustomField {
  id: number;
  organizationId: number;
  businessUnitId: number;
  key: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[];
  required: boolean;
  position: number;
  section: string;
  helpText: string | null;
  showIfKey: string | null;
  showIfValue: string | null;
  visibleToRoles: string[];
  editableByRoles: string[];
  isActive: boolean;
  /** Computed by the server for the signed-in role. */
  canSee: boolean;
  canEdit: boolean;
}

export interface CreateCustomFieldInput {
  label: string;
  key?: string;
  fieldType: CustomFieldType;
  options?: string[];
  required?: boolean;
  section?: string;
  helpText?: string;
  showIfKey?: string;
  showIfValue?: string;
  visibleToRoles?: string[];
  editableByRoles?: string[];
  businessUnitId?: number;
}

export type UpdateCustomFieldInput = Partial<
  Pick<
    CustomField,
    'label' | 'fieldType' | 'options' | 'required' | 'section' | 'helpText' | 'showIfKey' | 'showIfValue' | 'visibleToRoles' | 'editableByRoles' | 'isActive' | 'position'
  >
>;

const base = '/custom-fields';

export const listCustomFields = (businessUnitId?: number) => {
  const qs = businessUnitId ? `?businessUnitId=${businessUnitId}` : '';
  return apiRequestWithRefresh<CustomField[]>(`${base}${qs}`, { method: 'GET', requiresAuth: true });
};

export const createCustomField = (data: CreateCustomFieldInput) =>
  apiRequestWithRefresh<CustomField>(base, { method: 'POST', body: data, requiresAuth: true });

export const updateCustomField = (id: number, data: UpdateCustomFieldInput) =>
  apiRequestWithRefresh<CustomField>(`${base}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });

/** Removes the field and its value from every lead in the unit. Turning it off keeps the data instead. */
export const deleteCustomField = (id: number) =>
  apiRequestWithRefresh<{ deleted: true }>(`${base}/${id}`, { method: 'DELETE', requiresAuth: true });

/** ids must list every active field of the unit, in the new order. */
export const reorderCustomFields = (businessUnitId: number, ids: number[]) =>
  apiRequestWithRefresh<CustomField[]>(`${base}/reorder`, {
    method: 'POST',
    body: { businessUnitId, ids },
    requiresAuth: true,
  });
