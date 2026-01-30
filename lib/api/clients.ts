// Client API Functions

import { apiRequest } from './client';
import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import type {
  CreateClientRequest,
  UpdateClientRequest,
  Client,
  GetClientsParams,
  GetClientsResponse,
  Service,
  CreateServiceRequest,
  CreateServiceResponse,
  GetServicesResponse,
  EnumResponse,
  EmailConfigRequest,
  EmailConfigResponse,
  GetScheduledEmailsParams,
  GetScheduledEmailsResponse,
} from './types';

/**
 * Create a new client with optional login credentials
 */
export async function createClient(data: CreateClientRequest): Promise<Client> {
  const response = await apiRequestWithRefresh<Client>(
    API_CONFIG.endpoints.client.base,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get all clients with optional search and filter
 */
export async function getClients(params?: GetClientsParams): Promise<GetClientsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.skip !== undefined) {
    queryParams.append('skip', params.skip.toString());
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.status_filter) {
    queryParams.append('status_filter', params.status_filter);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString 
    ? `${API_CONFIG.endpoints.client.base}?${queryString}`
    : API_CONFIG.endpoints.client.base;

  const response = await apiRequestWithRefresh<GetClientsResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get a specific client by ID
 */
export async function getClientById(clientId: number | string): Promise<Client> {
  const response = await apiRequestWithRefresh<Client>(
    `${API_CONFIG.endpoints.client.base}${clientId}`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update client information
 */
export async function updateClient(
  clientId: number | string,
  data: UpdateClientRequest
): Promise<Client> {
  // Log the payload being sent (mask password for security)
  const logData = { ...data };
  if (logData.login_password) {
    logData.login_password = '***';
  }
  console.log('updateClient called with payload:', logData);
  
  const response = await apiRequestWithRefresh<Client>(
    `${API_CONFIG.endpoints.client.base}${clientId}`,
    {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update client login credentials
 * If loginPassword is empty, only email will be updated (password won't be changed)
 */
export async function updateClientLogin(
  clientId: number | string,
  loginEmail: string,
  loginPassword: string
): Promise<Client> {
  const updateData: UpdateClientRequest = {
    login_email: loginEmail,
  };
  
  // Always include password if provided (non-empty)
  // This allows updating email without changing password when password is empty
  const passwordTrimmed = loginPassword?.trim() || '';
  console.log('updateClientLogin called:', { 
    clientId, 
    loginEmail, 
    loginPassword: loginPassword ? '***' : 'empty',
    passwordTrimmedLength: passwordTrimmed.length 
  });
  
  if (passwordTrimmed.length > 0) {
    updateData.login_password = passwordTrimmed;
    console.log('Including password in update payload');
  } else {
    console.log('Password not included (empty or not provided)');
  }
  
  console.log('Update payload:', { ...updateData, login_password: updateData.login_password ? '***' : undefined });
  
  return updateClient(clientId, updateData);
}

/**
 * Delete a client
 */
export async function deleteClient(clientId: number | string): Promise<void> {
  await apiRequestWithRefresh<void>(
    `${API_CONFIG.endpoints.client.base}${clientId}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

/**
 * Export clients to Excel
 */
export async function exportClientsToExcel(): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const response = await fetch(
    `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.client.export}`,
    {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to export clients: ${errorText}`);
  }

  return response.blob();
}

/**
 * Get all services (default and custom)
 * Handles both array response and object with services property
 */
export async function getServices(): Promise<GetServicesResponse> {
  const response = await apiRequestWithRefresh<GetServicesResponse | Service[]>(
    API_CONFIG.endpoints.client.services,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  
  // Handle both array and object responses
  if (Array.isArray(response)) {
    return { services: response };
  }
  
  return response as GetServicesResponse;
}

/**
 * Create a custom service
 */
export async function createService(data: CreateServiceRequest): Promise<CreateServiceResponse> {
  const response = await apiRequestWithRefresh<CreateServiceResponse>(
    API_CONFIG.endpoints.client.services,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get client status enum values
 */
export async function getClientStatusEnum(): Promise<EnumResponse> {
  const response = await apiRequestWithRefresh<EnumResponse>(
    API_CONFIG.endpoints.client.enums.status,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get business type enum values
 */
export async function getBusinessTypeEnum(): Promise<EnumResponse> {
  const response = await apiRequestWithRefresh<EnumResponse>(
    API_CONFIG.endpoints.client.enums.businessType,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get service type enum values
 */
export async function getServiceTypeEnum(): Promise<EnumResponse> {
  const response = await apiRequestWithRefresh<EnumResponse>(
    API_CONFIG.endpoints.client.enums.serviceType,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

// ========== EMAIL CONFIGURATION FUNCTIONS ==========

/**
 * Create or update email configuration for a client
 */
export async function createEmailConfig(
  clientId: number | string,
  data: EmailConfigRequest
): Promise<EmailConfigResponse> {
  const response = await apiRequestWithRefresh<EmailConfigResponse>(
    API_CONFIG.endpoints.client.emailConfig(clientId),
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Update email configuration for a client
 */
export async function updateEmailConfig(
  clientId: number | string,
  data: EmailConfigRequest
): Promise<EmailConfigResponse> {
  const response = await apiRequestWithRefresh<EmailConfigResponse>(
    API_CONFIG.endpoints.client.emailConfig(clientId),
    {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Get email configuration for a client
 */
export async function getEmailConfig(
  clientId: number | string
): Promise<EmailConfigResponse | null> {
  try {
    const response = await apiRequestWithRefresh<EmailConfigResponse>(
      API_CONFIG.endpoints.client.emailConfig(clientId),
      {
        method: 'GET',
        requiresAuth: true,
      }
    );
    return response;
  } catch (error: any) {
    // Return null if 404 (config doesn't exist)
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Delete email configuration for a client
 */
export async function deleteEmailConfig(clientId: number | string): Promise<void> {
  await apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.client.emailConfig(clientId),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

/**
 * Delete an individual email address from client's email configuration
 * This removes the email from the emails array and emailTemplates object
 */
export async function deleteEmailFromConfig(
  clientId: number | string,
  email: string
): Promise<void> {
  await apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.client.deleteEmailFromConfig(clientId, email),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

/**
 * Get scheduled emails for a client
 */
export async function getScheduledEmails(
  clientId: number | string,
  params?: GetScheduledEmailsParams
): Promise<GetScheduledEmailsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.skip !== undefined) {
    queryParams.append('skip', params.skip.toString());
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `${API_CONFIG.endpoints.client.scheduledEmails(clientId)}?${queryString}`
    : API_CONFIG.endpoints.client.scheduledEmails(clientId);

  const response = await apiRequestWithRefresh<GetScheduledEmailsResponse>(
    endpoint,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
  return response;
}

/**
 * Cancel a scheduled email
 */
export async function cancelScheduledEmail(
  clientId: number | string,
  emailId: number | string
): Promise<void> {
  await apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.client.cancelScheduledEmail(clientId, emailId),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

/**
 * Retry a failed scheduled email
 */
export async function retryScheduledEmail(
  clientId: number | string,
  emailId: number | string
): Promise<void> {
  await apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.client.retryScheduledEmail(clientId, emailId),
    {
      method: 'POST',
      requiresAuth: true,
    }
  );
}

export interface SendTestEmailRequest {
  to_email: string;
  subject?: string;
  message?: string;
}

/**
 * Send a test email (requires admin or employee). Use from Mail Management to verify SMTP.
 */
export async function sendTestEmail(
  payload: SendTestEmailRequest
): Promise<{ success: boolean; message: string; to_email: string }> {
  const response = await apiRequestWithRefresh<{
    success: boolean;
    message: string;
    to_email: string;
  }>(API_CONFIG.endpoints.testEmail, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });
  return response;
}


