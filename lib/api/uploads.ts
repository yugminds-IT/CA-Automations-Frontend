// Upload API functions

import { API_CONFIG } from './config';
import { uploadFiles, apiRequest, ApiError } from './client';
import type { Organization, Client } from './types';

export interface UploadResponse {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  url?: string;
  organization?: Organization;
  client?: Client;
  client_id?: number | null;
}

export interface UploadFilesResponse {
  files: UploadResponse[];
  message?: string;
}

/**
 * Upload multiple files
 */
export async function uploadFilesToServer(
  files: File[],
  clientId?: number | string,
  onProgress?: (progress: number) => void
): Promise<UploadFilesResponse> {
  try {
    // Build endpoint with query parameter if clientId is provided
    let endpoint: string = API_CONFIG.endpoints.uploads.upload;
    if (clientId) {
      endpoint = `${endpoint}?client_id=${clientId}`;
    }
    
    const response = await uploadFiles<UploadFilesResponse>(
      endpoint,
      files,
      undefined,
      true,
      onProgress
    );
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to upload files');
  }
}

/**
 * Get list of uploaded files
 */
export async function getUploadedFiles(): Promise<UploadResponse[]> {
  try {
    const response = await apiRequest<UploadResponse[]>(
      API_CONFIG.endpoints.uploads.list,
      {
        method: 'GET',
        requiresAuth: true,
      }
    );
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to fetch uploaded files');
  }
}

/**
 * Delete an uploaded file
 */
export async function deleteUploadedFile(id: number | string): Promise<void> {
  try {
    await apiRequest<void>(
      API_CONFIG.endpoints.uploads.delete(id),
      {
        method: 'DELETE',
        requiresAuth: true,
      }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to delete file');
  }
}

/**
 * Get file download URL (with authentication)
 * @param id File ID
 * @param includeToken If true, includes token as query parameter (for preview in iframe/img)
 */
export function getFileDownloadUrl(id: number | string, includeToken: boolean = false): string {
  const baseUrl = API_CONFIG.baseUrl;
  const endpoint = API_CONFIG.endpoints.uploads.download(id);
  let url = `${baseUrl}${endpoint}`;
  
  // If includeToken is true, append token as query parameter (for preview in iframe/img tags)
  if (includeToken) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      url = `${url}?token=${encodeURIComponent(token)}`;
    }
  }
  
  return url;
}

/**
 * Get file preview URL as blob (for preview without triggering download)
 */
export async function getFilePreviewBlobUrl(id: number | string): Promise<string> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const url = getFileDownloadUrl(id, false);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch file for preview');
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    return blobUrl;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to get file preview');
  }
}

/**
 * Download a file (returns blob URL)
 */
export async function downloadFile(id: number | string, filename: string): Promise<string> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const url = getFileDownloadUrl(id);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download file');
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after a delay
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    
    return blobUrl;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to download file');
  }
}

