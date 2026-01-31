// Client Files API - Backend endpoints only

import { uploadFiles } from './client';
import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';

export async function uploadClientFiles(
  files: File[],
  type?: string
): Promise<unknown> {
  return uploadFiles<unknown>(
    API_CONFIG.endpoints.clientFiles.upload,
    files,
    type ? { type } : undefined,
    true
  );
}

export async function listMyFiles(): Promise<unknown> {
  return apiRequestWithRefresh(API_CONFIG.endpoints.clientFiles.list, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function listClientFiles(clientId: number | string): Promise<unknown> {
  return apiRequestWithRefresh(
    API_CONFIG.endpoints.clientFiles.byClient(clientId),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
}

export async function getFileDownloadUrl(id: number | string): Promise<{ url: string }> {
  const res = await apiRequestWithRefresh<{ url?: string; downloadUrl?: string }>(
    API_CONFIG.endpoints.clientFiles.downloadUrl(id),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return { url: res.url ?? res.downloadUrl ?? '' };
}

export interface UploadResponse {
  id: number;
  filename?: string;
  fileName?: string; // backend returns camelCase
  file_type?: string;
  file_size?: number;
  /** Presigned S3 URL to view/download the file (from list response). */
  previewUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  format?: string;
  date?: string;
  time?: string;
  type?: string | null;
  [key: string]: unknown;
}

/** Fetch a presigned URL – no Authorization header (URL is self-contained; adding it can cause CORS). */
async function fetchPresignedUrl(url: string): Promise<Response> {
  return fetch(url, { mode: 'cors' });
}

export async function downloadFile(
  id: number | string,
  filename: string
): Promise<string> {
  const { url } = await getFileDownloadUrl(id);
  if (!url) throw new Error('No download URL returned');
  const response = await fetchPresignedUrl(url);
  if (!response.ok) throw new Error(`Failed to download file (${response.status})`);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
  return blobUrl;
}

export async function getFilePreviewBlobUrl(id: number | string): Promise<string> {
  const { url } = await getFileDownloadUrl(id);
  if (!url) throw new Error('No preview URL returned');
  const response = await fetchPresignedUrl(url);
  if (!response.ok) throw new Error(`Failed to fetch file (${response.status}). Check CORS and S3 bucket policy.`);
  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}
