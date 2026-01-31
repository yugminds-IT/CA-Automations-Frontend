// API Types - Backend enums and payload structures (from FRONTEND_INTEGRATION.md)
// No frontend-specific handling - types only

// ============ ENUMS (from backend) ============

export enum RoleName {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  CAA = 'CAA',
  ORG_EMPLOYEE = 'ORG_EMPLOYEE',
  CLIENT = 'CLIENT',
}

export type ClientStatus = 'active' | 'inactive' | 'terminated';

export enum TemplateCategory {
  SERVICE = 'service',
  LOGIN = 'login',
  NOTIFICATION = 'notification',
  FOLLOW_UP = 'follow_up',
  REMINDER = 'reminder',
}

export type EmailScheduleStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type ScheduleType = 'single_date' | 'date_range' | 'multiple_dates';

// ============ AUTH ============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  roleName: RoleName;
  organizationId: number;
}

export interface SignupOrganizationRequest {
  organization: {
    name: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  admin: {
    name: string;
    email: string;
    password: string;
    phone: string;
  };
}

export interface SignupOrgAdminRequest {
  organizationId: number;
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface User {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  roleName?: RoleName;
  organizationId?: number;
}

// ============ ORGANIZATIONS ============

export interface Organization {
  id: number;
  name: string;
  slug?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

// ============ USERS ============

export interface CreateEmployeeRequest {
  organizationId: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  roleName: 'ORG_ADMIN' | 'CAA' | 'ORG_EMPLOYEE';
}

// ============ CLIENTS ============

export interface CreateClientRequest {
  organizationId: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface CreateClientWithLoginRequest {
  email: string;
  name: string;
  phone: string;
  organizationId: number;
}

/** Director item for onboard payload (backend OnboardDirectorDto) */
export interface OnboardDirectorRequest {
  directorName: string;
  email?: string;
  phone?: string;
  designation?: string;
  din?: string;
  pan?: string;
  aadharNumber?: string;
}

export interface OnboardClientRequest {
  name: string;
  email: string;
  companyName?: string;
  businessTypeId?: number;
  panNumber?: string;
  gstNumber?: string;
  status?: ClientStatus;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  serviceIds?: number[];
  onboardDate?: string;
  followupDate?: string;
  additionalNotes?: string;
  phone?: string;
  organizationId?: number;
  directors?: OnboardDirectorRequest[];
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  status?: ClientStatus;
  companyName?: string;
  businessTypeId?: number | null;
  panNumber?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  serviceIds?: number[];
  onboardDate?: string;
  followupDate?: string;
  additionalNotes?: string;
  /** When true, removes the client's login user from DB. */
  remove_login?: boolean;
  login_email?: string;
  login_password?: string;
  directors?: OnboardDirectorRequest[];
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  organizationId?: number;
  companyName?: string;
  status?: ClientStatus;
  [key: string]: unknown;
}

export interface Director {
  id?: number;
  directorName: string;
  email: string;
  phone: string;
  designation?: string;
  din?: string;
  pan?: string;
  aadharNumber?: string;
}

export interface AddDirectorRequest {
  directorName: string;
  email: string;
  phone: string;
  designation?: string;
  din?: string;
  pan?: string;
  aadharNumber?: string;
}

export interface UpdateDirectorRequest {
  directorName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  din?: string;
  pan?: string;
  aadharNumber?: string;
}

// ============ BUSINESS TYPES ============

export interface CreateBusinessTypeRequest {
  name: string;
  organizationId: number;
}

export interface BusinessType {
  id: number;
  name: string;
}

// ============ SERVICES ============

export interface CreateServiceRequest {
  name: string;
  organizationId: number;
}

export interface Service {
  id: number;
  name: string;
}

// ============ EMAIL TEMPLATES ============

export interface CreateEmailTemplateRequest {
  category: string;
  type: string;
  name: string;
  subject: string;
  body: string;
}

export interface UpdateEmailTemplateRequest {
  subject?: string;
  body?: string;
  name?: string;
}

export interface SendEmailRequest {
  to: string;
  templateId: number;
  variables?: Record<string, string>;
}

export interface EmailTemplate {
  id: number;
  category: string;
  type: string;
  name: string;
  subject: string;
  body: string;
  /** null = global (master admin created); number = org-specific */
  organizationId?: number | null;
  [key: string]: unknown;
}

// ============ MAIL MANAGEMENT ============

export interface ScheduleSingleDate {
  type: 'single_date';
  date: string;
  times: string[];
  /** User's timezone offset so time is interpreted locally (e.g. "+05:30", "-08:00"). Mail is sent at that local time. */
  timeZoneOffset?: string;
}

export interface ScheduleDateRange {
  type: 'date_range';
  fromDate: string;
  toDate: string;
  times: string[];
  timeZoneOffset?: string;
}

export interface ScheduleMultipleDates {
  type: 'multiple_dates';
  dates: string[];
  times: string[];
  timeZoneOffset?: string;
}

export type ScheduleConfig = ScheduleSingleDate | ScheduleDateRange | ScheduleMultipleDates;

export interface ScheduleEmailRequest {
  templateId: number;
  recipientEmails: string[];
  variables?: Record<string, string>;
  schedule: ScheduleConfig;
}

// ============ SCHEDULED EMAIL (Mail Management) ============

export interface GetScheduledEmailsParams {
  status?: EmailScheduleStatus;
  skip?: number;
  limit?: number;
}

export interface ScheduledEmail {
  id: number;
  templateId?: number;
  recipientEmails?: string[];
  status?: EmailScheduleStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  [key: string]: unknown;
}

// ============ API ERROR ============

export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  status?: number;
}

// Compatibility: UserRole = RoleName
export const UserRole = RoleName;
