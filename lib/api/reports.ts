// Reports and dashboards: the standard pack, widgets, saved dashboards, scheduled emails and exports.
// Backend: reports/ (routes under /reports). Figures always follow the viewer's data scope.
import { apiRequestWithRefresh } from './interceptor';
import { getAccessToken, ApiError } from './client';
import { API_CONFIG } from './config';

export type WidgetType = 'kpi' | 'bar' | 'line' | 'table' | 'funnel';
export type Metric = 'lead_count' | 'won_count' | 'pipeline_value' | 'won_value';
export type GroupBy = 'none' | 'source' | 'stage' | 'owner' | 'unit' | 'day' | 'lost_reason';

export interface WidgetSpec {
  id: string;
  title: string;
  type: WidgetType;
  metric: Metric;
  groupBy: GroupBy;
}

export interface ReportFilters {
  businessUnitId?: number | null;
  ownerUserId?: number | null;
  source?: string | null;
  /** IST calendar day, YYYY-MM-DD. */
  from?: string | null;
  /** IST calendar day, YYYY-MM-DD. */
  to?: string | null;
}

export interface WidgetRow {
  key: string | number | null;
  label: string;
  value: number;
}

export interface WidgetResult {
  widget: WidgetSpec;
  rows: WidgetRow[];
  total: number;
}

export interface Dashboard {
  id: number;
  organizationId: number;
  name: string;
  widgets: WidgetSpec[];
  filters: ReportFilters;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardInput {
  name: string;
  widgets: WidgetSpec[];
  filters: ReportFilters;
}

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  id: number;
  name: string;
  scope: 'standard' | 'dashboard';
  dashboardId: number | null;
  frequency: ScheduleFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourIst: number;
  recipients: string[];
  format: 'xlsx' | 'csv';
  rangeDays: number;
  filters: ReportFilters;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastStatus: 'sent' | 'failed' | null;
  lastError: string | null;
}

export interface ScheduleInput {
  name: string;
  scope: 'standard' | 'dashboard';
  dashboardId?: number | null;
  frequency: ScheduleFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  hourIst: number;
  recipients: string[];
  format: 'xlsx' | 'csv';
  rangeDays: number;
  filters: ReportFilters;
  enabled: boolean;
}

export interface GroupedRow {
  key: string | number | null;
  label: string;
  values: Partial<Record<Metric, number>>;
}

export interface StandardReport {
  range: { from: string; to: string };
  totals: {
    leads: number;
    won: number;
    lost: number;
    open: number;
    pipelineValue: number;
    wonValue: number;
    /** Won as a share of closed leads. Null while nothing has closed. */
    winRate: number | null;
  };
  bySource: GroupedRow[];
  byUnit: GroupedRow[];
  byStage: GroupedRow[];
  responseTime: {
    responded: number;
    avgMinutes: number | null;
    medianMinutes: number | null;
    slaMetPercent: number | null;
  };
  owners: GroupedRow[];
  lostReasons: GroupedRow[];
  forms: GroupedRow[];
  email: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number | null;
    clickRate: number | null;
  };
}

const base = '/reports';

/** Only the filters that are set, as a query string. */
export function filtersQuery(f: ReportFilters): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== null && v !== undefined && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const getStandardReport = (filters: ReportFilters) =>
  apiRequestWithRefresh<StandardReport>(`${base}/standard${filtersQuery(filters)}`, { method: 'GET', requiresAuth: true });

export const previewWidget = (widget: WidgetSpec, filters: ReportFilters) =>
  apiRequestWithRefresh<WidgetResult>(`${base}/preview`, { method: 'POST', body: { widget, filters }, requiresAuth: true });

export const listDashboards = () =>
  apiRequestWithRefresh<Dashboard[]>(`${base}/dashboards`, { method: 'GET', requiresAuth: true });

export const getDashboard = (id: number) =>
  apiRequestWithRefresh<Dashboard>(`${base}/dashboards/${id}`, { method: 'GET', requiresAuth: true });

export const createDashboard = (input: DashboardInput) =>
  apiRequestWithRefresh<Dashboard>(`${base}/dashboards`, { method: 'POST', body: input, requiresAuth: true });

export const updateDashboard = (id: number, input: DashboardInput) =>
  apiRequestWithRefresh<Dashboard>(`${base}/dashboards/${id}`, { method: 'PUT', body: input, requiresAuth: true });

export const deleteDashboard = (id: number) =>
  apiRequestWithRefresh<{ deleted: true }>(`${base}/dashboards/${id}`, { method: 'DELETE', requiresAuth: true });

export const getDashboardData = (id: number, filters: ReportFilters) =>
  apiRequestWithRefresh<{ dashboard: { id: number; name: string; filters: ReportFilters }; widgets: WidgetResult[] }>(
    `${base}/dashboards/${id}/data${filtersQuery(filters)}`,
    { method: 'GET', requiresAuth: true },
  );

export const listSchedules = () =>
  apiRequestWithRefresh<ReportSchedule[]>(`${base}/schedules`, { method: 'GET', requiresAuth: true });

export const createSchedule = (input: ScheduleInput) =>
  apiRequestWithRefresh<ReportSchedule>(`${base}/schedules`, { method: 'POST', body: input, requiresAuth: true });

export const updateSchedule = (id: number, input: ScheduleInput) =>
  apiRequestWithRefresh<ReportSchedule>(`${base}/schedules/${id}`, { method: 'PUT', body: input, requiresAuth: true });

export const deleteSchedule = (id: number) =>
  apiRequestWithRefresh<{ deleted: true }>(`${base}/schedules/${id}`, { method: 'DELETE', requiresAuth: true });

export const sendScheduleNow = (id: number) =>
  apiRequestWithRefresh<{ status: 'sent'; filename: string }>(`${base}/schedules/${id}/send-now`, { method: 'POST', requiresAuth: true });

/**
 * Downloads an Excel or CSV export. A plain link cannot send the bearer token, so the file is fetched
 * with it and handed to the browser as a download.
 */
export async function downloadReport(path: string, query: string, fallbackName: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new ApiError(401, 'Please sign in again to download this report.');
  const res = await fetch(`${API_CONFIG.baseUrl}${base}${path}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new ApiError(res.status, message || 'The report could not be downloaded.');
  }
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(disposition);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
