import { API_CONFIG, TOKEN_KEYS } from './config';

export interface GstSession {
  id: string;
  clientId: number;
  organizationId: number | null;
  status: GstStatus;
  documentName: string | null;
  documentType: string | null;
  financialYear: string | null;
  period: string | null;
  extractedData: any | null;
  comparisonData: any | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string };
}

export type GstStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'UPLOADED'
  | 'COMPARED'
  | 'COMPLETED'
  | 'FAILED';

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

export async function createGstSession(clientId: number): Promise<GstSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.gstFiling.sessions}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
  return handleRes(res);
}

export async function listGstSessions(): Promise<GstSession[]> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.gstFiling.sessions}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function getGstSession(id: string): Promise<GstSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.gstFiling.byId(id)}`, {
    headers: authHeaders(),
  });
  return handleRes(res);
}

export async function uploadGstDocument(id: string, file: File): Promise<GstSession> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}${API_CONFIG.endpoints.gstFiling.upload(id)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleRes(res);
}

export async function compareGstData(id: string): Promise<GstSession> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.gstFiling.compare(id)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleRes(res);
}

/** Poll GET /sessions/:id every `intervalMs` until status leaves PROCESSING (max 10 min). */
export async function pollGstSession(
  id: string,
  intervalMs = 4_000,
  timeoutMs = 600_000,
): Promise<GstSession> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = await getGstSession(id);
    if (session.status !== 'PROCESSING') return session;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('GST extraction timed out — please try again.');
}

export async function deleteGstSession(id: string): Promise<void> {
  const res = await fetch(`${base}${API_CONFIG.endpoints.gstFiling.delete(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
}
