// Deprecated: All templates, categories, and types are dynamically fetched from the database / Master Admin API.

import type { CreateEmailTemplateRequest } from './types';

export const DEFAULT_EMAIL_TEMPLATES: CreateEmailTemplateRequest[] = [];

export function getDefaultTemplateByType(
  _category: string,
  _type: string
): CreateEmailTemplateRequest | undefined {
  return undefined;
}
