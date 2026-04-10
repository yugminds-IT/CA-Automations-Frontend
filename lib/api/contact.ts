import { apiRequest } from './client';
import { API_CONFIG } from './config';

export interface ContactSubmitRequest {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  message: string;
}

export async function submitContact(data: ContactSubmitRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(API_CONFIG.endpoints.contact.submit, {
    method: 'POST',
    body: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      company: data.company,
      message: data.message,
    },
  });
}
