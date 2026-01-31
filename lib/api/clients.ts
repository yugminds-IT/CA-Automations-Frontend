// Clients API - Backend endpoints only

import { apiRequestWithRefresh } from './interceptor';
import { API_CONFIG } from './config';
import { listServices } from './services';
import { listBusinessTypes } from './business-types';
import type {
  Client,
  Director,
  CreateClientRequest,
  CreateClientWithLoginRequest,
  OnboardClientRequest,
  UpdateClientRequest,
  AddDirectorRequest,
  UpdateDirectorRequest,
} from './types';

export async function createClient(data: CreateClientRequest): Promise<Client> {
  return apiRequestWithRefresh<Client>(API_CONFIG.endpoints.clients.base, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function createClientWithLogin(
  data: CreateClientWithLoginRequest
): Promise<Client & { generatedPassword?: string }> {
  return apiRequestWithRefresh<Client & { generatedPassword?: string }>(
    API_CONFIG.endpoints.clients.withLogin,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
}

export async function onboardClient(data: OnboardClientRequest): Promise<Client> {
  return apiRequestWithRefresh<Client>(API_CONFIG.endpoints.clients.onboard, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function getClients(params?: {
  organizationId?: number;
}): Promise<{ clients: Client[]; total: number; skip: number; limit: number }> {
  const clients = await listClients(params?.organizationId);
  return {
    clients,
    total: clients.length,
    skip: 0,
    limit: clients.length,
  };
}

export async function listClients(organizationId?: number): Promise<Client[]> {
  const url = organizationId
    ? `${API_CONFIG.endpoints.clients.base}?organizationId=${organizationId}`
    : API_CONFIG.endpoints.clients.base;
  return apiRequestWithRefresh<Client[]>(url, {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getClientById(id: number | string): Promise<Client> {
  return apiRequestWithRefresh<Client>(API_CONFIG.endpoints.clients.byId(id), {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function updateClient(
  id: number | string,
  data: UpdateClientRequest
): Promise<Client> {
  return apiRequestWithRefresh<Client>(API_CONFIG.endpoints.clients.byId(id), {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

export async function deleteClient(id: number | string): Promise<void> {
  return apiRequestWithRefresh<void>(API_CONFIG.endpoints.clients.byId(id), {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function listDirectors(clientId: number | string): Promise<Director[]> {
  return apiRequestWithRefresh<Director[]>(
    API_CONFIG.endpoints.clients.directors(clientId),
    {
      method: 'GET',
      requiresAuth: true,
    }
  );
}

export async function addDirector(
  clientId: number | string,
  data: AddDirectorRequest
): Promise<Director> {
  return apiRequestWithRefresh<Director>(
    API_CONFIG.endpoints.clients.directors(clientId),
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
}

export async function updateDirector(
  clientId: number | string,
  dirId: number | string,
  data: UpdateDirectorRequest
): Promise<Director> {
  return apiRequestWithRefresh<Director>(
    API_CONFIG.endpoints.clients.directorById(clientId, dirId),
    {
      method: 'PATCH',
      body: data,
      requiresAuth: true,
    }
  );
}

export async function deleteDirector(
  clientId: number | string,
  dirId: number | string
): Promise<void> {
  return apiRequestWithRefresh<void>(
    API_CONFIG.endpoints.clients.directorById(clientId, dirId),
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
}

export async function getServices(organizationId?: number) {
  const services = await listServices(organizationId);
  return { services };
}

export async function getClientStatusEnum(): Promise<{ values: string[] }> {
  return Promise.resolve({
    values: ['active', 'inactive', 'terminated'],
  });
}

export async function getBusinessTypeEnum(
  organizationId?: number
): Promise<{ values: string[] }> {
  const types = await listBusinessTypes(organizationId);
  return {
    values: Array.isArray(types) ? types.map((t) => t.name) : [],
  };
}

export async function updateClientLogin(
  clientId: number | string,
  loginEmail: string,
  loginPassword?: string
): Promise<Client & { generatedPassword?: string }> {
  const data: UpdateClientRequest = { login_email: loginEmail };
  if (loginPassword) data.login_password = loginPassword;
  return updateClient(clientId, data) as Promise<Client & { generatedPassword?: string }>;
}

/** Removes the client's login credentials from the DB (deletes user, clears client.userId). */
export async function removeClientLogin(clientId: number | string): Promise<Client> {
  return updateClient(clientId, { remove_login: true });
}

/** Check if a login email already exists in the current organization (for Add email validation). */
export async function checkLoginEmailExists(email: string, organizationId?: number): Promise<{ exists: boolean }> {
  const params = new URLSearchParams();
  if (email?.trim()) params.set('email', email.trim());
  if (organizationId != null) params.set('organizationId', String(organizationId));
  const url = params.toString() ? `${API_CONFIG.endpoints.clients.checkLoginEmail}?${params.toString()}` : API_CONFIG.endpoints.clients.checkLoginEmail;
  return apiRequestWithRefresh<{ exists: boolean }>(url, { method: 'GET', requiresAuth: true });
}
