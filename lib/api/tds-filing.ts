import { API_CONFIG, TOKEN_KEYS } from './config';

export interface TdsSession {
  id: string;
  clientId: number;
  organizationId: number | null;
  status: TdsStatus;
  formType: string | null;
  formVersion: string | null;
  quarter: string | null;
  assessmentYear: string | null;
  financialYear: string | null;
  challanData: any | null;
  deducteesData: any[] | null;
  comparisonData: any | null;
  selectedSections: string[] | null;
  generatedFiles: any | null;
  celeryTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string };
}

export type TdsStatus =
  | 'DRAFT'
  | 'CHALLAN_UPLOADED'
  | 'EXCEL_UPLOADED'
  | 'COMPARED'
  | 'FORM_SELECTED'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED';

export interface FormSection { code: string; label: string }
export interface FormMeta {
  label: string;
  description: string;
  category: string;
  type: string;
  old_name: string;
  new_name: string;
  sections: FormSection[];
}
export interface FormsResponse {
  status: string;
  forms: Record<string, FormMeta>;
  quarters: { value: string; label: string }[];
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEYS.accessToken);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const base = API_CONFIG.baseUrl;

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getForms(): Promise<FormsResponse> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.forms}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function createSession(clientId: number): Promise<TdsSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.sessions}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
  return handleRes(res);
}

export async function listSessions(): Promise<TdsSession[]> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.sessions}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function getSession(id: string): Promise<TdsSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.byId(id)}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function uploadChallan(id: string, file: File): Promise<TdsSession> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.challan(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleRes(res);
}

export async function uploadExcel(id: string, file: File): Promise<TdsSession> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.excel(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleRes(res);
}

export async function compareData(id: string): Promise<TdsSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.compare(id)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function setFormType(
  id: string,
  payload: { formType: string; formVersion: string; quarter: string; selectedSections: string[] },
): Promise<TdsSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.form(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function generateFiles(id: string): Promise<TdsSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.generate(id)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function getGenerationStatus(id: string): Promise<any> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.status(id)}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function getDownloadUrl(id: string, type: 'csi' | 'fvu'): Promise<{ url: string; taskId: string }> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.download(id, type)}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.tdsFiling.delete(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
}
