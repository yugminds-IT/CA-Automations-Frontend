// Org-defined template variables ({{meeting_link}} …) and per-client values.
import { apiRequestWithRefresh } from './interceptor';

export interface CustomVariable {
  id: number;
  key: string;
  label: string;
  defaultValue: string;
  /** clientId -> that client's value */
  values: Record<string, string>;
}

const base = '/custom-variables';

export const listCustomVariables = () =>
  apiRequestWithRefresh<CustomVariable[]>(base, { method: 'GET', requiresAuth: true });

export const createCustomVariable = (data: { key: string; label: string; defaultValue?: string }) =>
  apiRequestWithRefresh<CustomVariable>(base, { method: 'POST', body: data, requiresAuth: true });

export const updateCustomVariable = (id: number, data: { label?: string; defaultValue?: string }) =>
  apiRequestWithRefresh<CustomVariable>(`${base}/${id}`, { method: 'PATCH', body: data, requiresAuth: true });

export const deleteCustomVariable = (id: number) =>
  apiRequestWithRefresh<void>(`${base}/${id}`, { method: 'DELETE', requiresAuth: true });

/** { meeting_link: "…" }; "" clears the client's value so the default applies. */
export const setClientCustomValues = (clientId: number | string, values: Record<string, string>) =>
  apiRequestWithRefresh<{ saved: number; cleared: number }>(`${base}/clients/${clientId}`, {
    method: 'PUT',
    body: { values },
    requiresAuth: true,
  });
