// Default Email Templates
// These templates are used when creating new templates or resetting to defaults

import {
  EmailTemplateCategory,
  EmailTemplateType,
  type CreateEmailTemplateRequest,
} from './email-templates';

export const DEFAULT_EMAIL_TEMPLATES: CreateEmailTemplateRequest[] = [
  // ========== SERVICE TEMPLATES ==========
  
  // GST Filing
  {
    name: 'GST Filing Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.GST_FILING,
    subject: 'GST Filing Service - {{service_name}}',
    body: `Dear {{client_name}},

We are pleased to inform you that we will be handling your GST filing services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please ensure all required documents are submitted before the deadline: {{deadline_date}}.

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone', 'deadline_date'],
  },

  // Income Tax Return
  {
    name: 'Income Tax Return Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.INCOME_TAX_RETURN,
    subject: 'Income Tax Return Filing - {{service_name}}',
    body: `Dear {{client_name}},

This email is regarding your Income Tax Return filing services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Important Dates:
- Deadline: {{deadline_date}}
- Follow-up Date: {{follow_up_date}}

Please submit all required documents and information at your earliest convenience.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone', 'deadline_date', 'follow_up_date'],
  },

  // TDS
  {
    name: 'TDS Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.TDS,
    subject: 'TDS Compliance Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be managing your TDS (Tax Deducted at Source) compliance for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please ensure timely submission of all TDS-related documents and information.

If you need any clarification, please contact us.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // Audit
  {
    name: 'Audit Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.AUDIT,
    subject: 'Audit Services - {{service_name}}',
    body: `Dear {{client_name}},

We are pleased to inform you that we will be conducting the audit services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please prepare all necessary documents and records for the audit process. We will coordinate with you to schedule the audit dates.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // ROC Filing
  {
    name: 'ROC Filing Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.ROC_FILING,
    subject: 'ROC Filing Service - {{service_name}}',
    body: `Dear {{client_name}},

This email is regarding your ROC (Registrar of Companies) filing services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Important: Please ensure all ROC filing documents are submitted before the deadline: {{deadline_date}}.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone', 'deadline_date'],
  },

  // PF/ESIC
  {
    name: 'PF/ESIC Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.PF_ESIC,
    subject: 'PF/ESIC Compliance Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be handling your PF (Provident Fund) and ESIC (Employee State Insurance Corporation) compliance for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please ensure all employee-related documents and information are provided for timely compliance.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // Accounting
  {
    name: 'Accounting Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.ACCOUNTING,
    subject: 'Accounting Services - {{service_name}}',
    body: `Dear {{client_name}},

We are pleased to inform you that we will be managing your accounting services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

We will maintain your books of accounts and provide regular financial reports.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // Book Keeping
  {
    name: 'Book Keeping Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.BOOK_KEEPING,
    subject: 'Book Keeping Services - {{service_name}}',
    body: `Dear {{client_name}},

We will be handling your book keeping services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please ensure all financial documents are shared regularly for accurate book keeping.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // Company Registration
  {
    name: 'Company Registration Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.COMPANY_REGISTRATION,
    subject: 'Company Registration Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be assisting you with the company registration process for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please provide all required documents and information to proceed with the registration.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // LLP Registration
  {
    name: 'LLP Registration Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.LLP_REGISTRATION,
    subject: 'LLP Registration Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be handling your LLP (Limited Liability Partnership) registration for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please ensure all partners' documents and required information are submitted.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // Trademark
  {
    name: 'Trademark Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.TRADEMARK,
    subject: 'Trademark Registration Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be assisting you with trademark registration services for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please provide all necessary documents and trademark details to proceed.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // ISO Certification
  {
    name: 'ISO Certification Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.ISO_CERTIFICATION,
    subject: 'ISO Certification Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be guiding you through the ISO certification process for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

We will coordinate with you to ensure all requirements are met for certification.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // Labour Compliance
  {
    name: 'Labour Compliance Service',
    category: EmailTemplateCategory.SERVICE,
    type: EmailTemplateType.LABOUR_COMPLIANCE,
    subject: 'Labour Compliance Service - {{service_name}}',
    body: `Dear {{client_name}},

We will be managing your labour compliance requirements for {{company_name}}.

Service Details:
- Service: {{service_name}}
- Organization: {{org_name}}
- Contact: {{org_email}} / {{org_phone}}

Please ensure all employee-related documents are provided for compliance.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'org_name', 'org_email', 'org_phone'],
  },

  // ========== LOGIN TEMPLATES ==========
  
  // Login Credentials
  {
    name: 'Login Credentials',
    category: EmailTemplateCategory.LOGIN,
    type: EmailTemplateType.LOGIN_CREDENTIALS,
    subject: 'Your Login Credentials - {{org_name}}',
    body: `Dear {{client_name}},

Your login credentials for {{company_name}} have been created.

Login Details:
- Email: {{login_email}}
- Password: {{login_password}}
- Login URL: {{login_url}}

Please keep these credentials secure and change your password after first login.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'login_email', 'login_password', 'login_url', 'org_name'],
  },

  // Password Reset
  {
    name: 'Password Reset',
    category: EmailTemplateCategory.LOGIN,
    type: EmailTemplateType.PASSWORD_RESET,
    subject: 'Password Reset Request - {{org_name}}',
    body: `Dear {{client_name}},

Your password has been reset for {{company_name}}.

New Login Details:
- Email: {{login_email}}
- New Password: {{login_password}}
- Login URL: {{login_url}}

Please login and change your password immediately for security purposes.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'login_email', 'login_password', 'login_url', 'org_name'],
  },

  // Welcome Email
  {
    name: 'Welcome Email',
    category: EmailTemplateCategory.LOGIN,
    type: EmailTemplateType.WELCOME_EMAIL,
    subject: 'Welcome to {{org_name}}',
    body: `Dear {{client_name}},

Welcome to {{org_name}}! We are excited to have you on board.

Your account has been created for {{company_name}}.

Login Details:
- Email: {{login_email}}
- Password: {{login_password}}
- Login URL: {{login_url}}

If you have any questions, please feel free to contact us at {{org_email}} or {{org_phone}}.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'login_email', 'login_password', 'login_url', 'org_name', 'org_email', 'org_phone'],
  },

  // ========== NOTIFICATION TEMPLATES ==========
  
  // Client Onboarded
  {
    name: 'Client Onboarded',
    category: EmailTemplateCategory.NOTIFICATION,
    type: EmailTemplateType.CLIENT_ONBOARDED,
    subject: 'Welcome - Client Onboarded Successfully',
    body: `Dear {{client_name}},

We are pleased to inform you that {{company_name}} has been successfully onboarded.

Onboarding Date: {{current_date}}

We look forward to providing you with excellent service. If you have any questions, please contact us at {{org_email}} or {{org_phone}}.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'current_date', 'org_name', 'org_email', 'org_phone'],
  },

  // Service Assigned
  {
    name: 'Service Assigned',
    category: EmailTemplateCategory.NOTIFICATION,
    type: EmailTemplateType.SERVICE_ASSIGNED,
    subject: 'Service Assigned - {{service_name}}',
    body: `Dear {{client_name}},

The following service has been assigned to {{company_name}}:

Service: {{service_name}}
Description: {{service_description}}

We will begin working on this service shortly. If you have any questions, please contact us.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'service_description', 'org_name'],
  },

  // Document Uploaded
  {
    name: 'Document Uploaded',
    category: EmailTemplateCategory.NOTIFICATION,
    type: EmailTemplateType.DOCUMENT_UPLOADED,
    subject: 'Document Received - {{document_name}}',
    body: `Dear {{client_name}},

We have received the following document for {{company_name}}:

Document: {{document_name}}
Date: {{current_date}}

We will review the document and get back to you if any additional information is required.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'document_name', 'current_date', 'org_name'],
  },

  // Payment Received
  {
    name: 'Payment Received',
    category: EmailTemplateCategory.NOTIFICATION,
    type: EmailTemplateType.PAYMENT_RECEIVED,
    subject: 'Payment Received - {{amount}}',
    body: `Dear {{client_name}},

We have received your payment for {{company_name}}.

Payment Details:
- Amount: {{amount}}
- Date: {{current_date}}

Thank you for your payment. If you have any questions, please contact us.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'amount', 'current_date', 'org_name'],
  },

  // ========== FOLLOW-UP TEMPLATES ==========
  
  // Follow-up Documents
  {
    name: 'Follow-up Documents',
    category: EmailTemplateCategory.FOLLOW_UP,
    type: EmailTemplateType.FOLLOW_UP_DOCUMENTS,
    subject: 'Follow-up: Required Documents - {{service_name}}',
    body: `Dear {{client_name}},

This is a follow-up regarding the required documents for {{service_name}} for {{company_name}}.

Follow-up Date: {{follow_up_date}}

Please submit the required documents at your earliest convenience. If you have any questions, please contact us.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'follow_up_date', 'org_name'],
  },

  // Follow-up Payment
  {
    name: 'Follow-up Payment',
    category: EmailTemplateCategory.FOLLOW_UP,
    type: EmailTemplateType.FOLLOW_UP_PAYMENT,
    subject: 'Follow-up: Payment Pending - {{amount}}',
    body: `Dear {{client_name}},

This is a follow-up regarding the pending payment for {{company_name}}.

Payment Details:
- Amount: {{amount}}
- Follow-up Date: {{follow_up_date}}

Please process the payment at your earliest convenience. If you have any questions, please contact us.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'amount', 'follow_up_date', 'org_name'],
  },

  // Follow-up Meeting
  {
    name: 'Follow-up Meeting',
    category: EmailTemplateCategory.FOLLOW_UP,
    type: EmailTemplateType.FOLLOW_UP_MEETING,
    subject: 'Follow-up: Meeting Scheduled - {{follow_up_date}}',
    body: `Dear {{client_name}},

This is a follow-up regarding the scheduled meeting for {{company_name}}.

Meeting Date: {{follow_up_date}}

Please confirm your availability or let us know if you need to reschedule.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'follow_up_date', 'org_name'],
  },

  // ========== REMINDER TEMPLATES ==========
  
  // Reminder Deadline
  {
    name: 'Reminder Deadline',
    category: EmailTemplateCategory.REMINDER,
    type: EmailTemplateType.REMINDER_DEADLINE,
    subject: 'Reminder: Deadline Approaching - {{deadline_date}}',
    body: `Dear {{client_name}},

This is a reminder that the deadline for {{service_name}} for {{company_name}} is approaching.

Deadline: {{deadline_date}}
Current Date: {{current_date}}

Please ensure all required documents and information are submitted before the deadline.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'deadline_date', 'current_date', 'org_name'],
  },

  // Reminder Submission
  {
    name: 'Reminder Submission',
    category: EmailTemplateCategory.REMINDER,
    type: EmailTemplateType.REMINDER_SUBMISSION,
    subject: 'Reminder: Submission Required - {{service_name}}',
    body: `Dear {{client_name}},

This is a reminder that submission is required for {{service_name}} for {{company_name}}.

Submission Deadline: {{deadline_date}}

Please submit all required documents and information at your earliest convenience.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'deadline_date', 'org_name'],
  },

  // Reminder Renewal
  {
    name: 'Reminder Renewal',
    category: EmailTemplateCategory.REMINDER,
    type: EmailTemplateType.REMINDER_RENEWAL,
    subject: 'Reminder: Renewal Due - {{service_name}}',
    body: `Dear {{client_name}},

This is a reminder that renewal is due for {{service_name}} for {{company_name}}.

Renewal Deadline: {{deadline_date}}

Please complete the renewal process before the deadline to avoid any interruption in services.

Best regards,
{{org_name}}`,
    is_default: true,
    variables: ['client_name', 'company_name', 'service_name', 'deadline_date', 'org_name'],
  },
];

