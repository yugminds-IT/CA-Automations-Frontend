// Default Email Templates - Reference for creating templates
// Uses backend types (TemplateCategory, CreateEmailTemplateRequest)

import { TemplateCategory } from './types';
import type { CreateEmailTemplateRequest } from './types';

export const DEFAULT_EMAIL_TEMPLATES: CreateEmailTemplateRequest[] = [
  { category: TemplateCategory.SERVICE, type: 'gst_filing', name: 'GST Filing Service', subject: 'GST Filing Service - {{service_name}}', body: 'Dear {{client_name}},\n\nWe will be handling your GST filing services for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.SERVICE, type: 'income_tax_return', name: 'Income Tax Return Service', subject: 'Income Tax Return Filing - {{service_name}}', body: 'Dear {{client_name}},\n\nThis email is regarding your Income Tax Return filing services for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.SERVICE, type: 'tds', name: 'TDS Service', subject: 'TDS Compliance Service - {{service_name}}', body: 'Dear {{client_name}},\n\nWe will be managing your TDS compliance for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.SERVICE, type: 'audit', name: 'Audit Service', subject: 'Audit Services - {{service_name}}', body: 'Dear {{client_name}},\n\nWe will be conducting the audit services for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.SERVICE, type: 'roc_filing', name: 'ROC Filing Service', subject: 'ROC Filing Service - {{service_name}}', body: 'Dear {{client_name}},\n\nROC filing services for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.LOGIN, type: 'login_credentials', name: 'Login Credentials', subject: 'Your Login Credentials - {{org_name}}', body: 'Dear {{client_name}},\n\nYour login credentials:\nEmail: {{login_email}}\nPassword: {{login_password}}\nURL: {{login_url}}\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.LOGIN, type: 'password_reset', name: 'Password Reset', subject: 'Password Reset - {{org_name}}', body: 'Dear {{client_name}},\n\nYour password has been reset for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.LOGIN, type: 'welcome_email', name: 'Welcome Email', subject: 'Welcome to {{org_name}}', body: 'Dear {{client_name}},\n\nWelcome! Your account has been created for {{company_name}}.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.NOTIFICATION, type: 'client_onboarded', name: 'Client Onboarded', subject: 'Welcome - Client Onboarded', body: 'Dear {{client_name}},\n\n{{company_name}} has been successfully onboarded.\n\nBest regards,\n{{org_name}}' },
  { category: TemplateCategory.REMINDER, type: 'reminder_deadline', name: 'Reminder Deadline', subject: 'Reminder: Deadline - {{deadline_date}}', body: 'Dear {{client_name}},\n\nThe deadline for {{service_name}} is approaching.\n\nBest regards,\n{{org_name}}' },
];

export function getDefaultTemplateByType(
  _category: string,
  type: string
): CreateEmailTemplateRequest | undefined {
  return DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === type);
}
