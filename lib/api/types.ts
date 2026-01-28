// API Types - Matching Backend Schemas

// Enums
export enum UserRole {
  MASTER_ADMIN = 'master_admin',
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  CLIENT = 'client',
}

export enum TokenType {
  BEARER = 'bearer',
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  org_id: number;
  role: UserRole;
}

export interface Organization {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
}

// Signup Request
export interface SignupRequest {
  organization_name: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
  admin_phone?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

// Signup Response
export interface SignupResponse {
  organization: Organization;
  admin: User;
  message: string;
}

// Login Request (form data)
export interface LoginRequest {
  username: string; // email
  password: string;
}

// Login Response
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: TokenType;
  expires_in: number; // Token expiration time in seconds
  user: User;
  organization: Organization;
}

// Refresh Token Request
export interface RefreshTokenRequest {
  refresh_token: string;
}

// Refresh Token Response
export interface RefreshTokenResponse {
  access_token: string;
  token_type: TokenType;
  expires_in: number; // Token expiration time in seconds
}

// Create Organization Request
export interface CreateOrganizationRequest {
  name: string;
}

// Create Organization Response
export type CreateOrganizationResponse = Organization;

// Create User Request
export interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  org_id: number;
  role?: UserRole; // Optional role - master admin can specify when creating users
}

// Create User Response
export type CreateUserResponse = User;

// API Error Response
export interface ApiError {
  detail: string;
  status_code?: number;
}

// Health Check Response
export interface HealthResponse {
  status: string;
}

// Client Types
export interface Director {
  id?: number;
  director_name: string;
  email: string;
  phone_number: string;
  designation?: string;
  din?: string;
  pan?: string;
  aadhaar?: string;
}

export interface CreateClientRequest {
  client_name: string;
  email: string;
  phone_number?: string;
  company_name: string;
  business_type?: string;
  pan_number?: string;
  gst_number?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  onboard_date?: string;
  follow_date?: string;
  additional_notes?: string;
  service_ids?: number[];
  directors?: Director[];
  login_email?: string;
  login_password?: string;
}

export interface UpdateClientRequest {
  client_name?: string;
  email?: string;
  phone_number?: string;
  company_name?: string;
  business_type?: string;
  pan_number?: string;
  gst_number?: string;
  status?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  onboard_date?: string;
  follow_date?: string;
  additional_notes?: string;
  service_ids?: number[];
  directors?: Director[];
  login_email?: string;
  login_password?: string;
}

export interface Client {
  id: number;
  client_name: string;
  email: string;
  phone_number: string | null;
  company_name: string;
  business_type: string | null;
  pan_number: string | null;
  gst_number: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin_code: string | null;
  onboard_date: string | null;
  follow_date: string | null;
  additional_notes: string | null;
  user_id: number | null;
  login_email?: string | null; // Login email if client has login credentials
  login_password?: string | null; // Login password (may not be returned by API for security)
  created_at: string;
  updated_at: string;
  directors?: Director[];
  services?: Service[];
}

export interface GetClientsParams {
  skip?: number;
  limit?: number;
  search?: string;
  status_filter?: string;
}

export interface GetClientsResponse {
  clients: Client[];
  total: number;
  skip: number;
  limit: number;
}

export interface Service {
  id: number;
  name: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateServiceRequest {
  name: string;
}

export interface CreateServiceResponse extends Service {}

export interface GetServicesResponse {
  services: Service[];
}

export interface EnumResponse {
  values: string[];
}

// Email Configuration Types
export type DateType = 'all' | 'range' | 'range_multiple' | 'single';

export interface EmailTemplateSelection {
  email: string;
  selectedTemplates: number[]; // Array of template IDs
}

export interface ServiceEmailConfig {
  enabled: boolean;
  templateId?: number | null;
  templateName?: string;
  dateType?: DateType;
  scheduledDate?: string | null; // ISO date string
  scheduledDateFrom?: string | null; // ISO date string
  scheduledDateTo?: string | null; // ISO date string
  scheduledDates?: string[]; // Array of ISO date strings for multiple dates in date range
  scheduledTimes?: string[]; // Array of times in HH:mm format
}

export interface EmailConfig {
  emails: string[];
  emailTemplates: Record<string, EmailTemplateSelection>; // Key is email address
  services: Record<string, ServiceEmailConfig>; // Key is template ID as string
}

export interface EmailConfigRequest {
  emails: string[];
  emailTemplates: Record<string, EmailTemplateSelection>;
  services: Record<string, ServiceEmailConfig>;
}

export interface EmailConfigResponse extends EmailConfig {
  client_id: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledEmail {
  id: number;
  client_id: number;
  template_id: number;
  template_name?: string;
  recipient_emails: string[];
  scheduled_date: string; // ISO date string
  scheduled_time: string; // HH:mm format
  scheduled_datetime: string; // ISO datetime string
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  is_recurring: boolean;
  recurrence_end_date?: string | null; // ISO date string
  error_message?: string | null;
  sent_at?: string | null; // ISO datetime string
  created_at: string;
  updated_at: string;
}

export interface GetScheduledEmailsParams {
  status?: 'pending' | 'sent' | 'failed' | 'cancelled';
  skip?: number;
  limit?: number;
}

export interface GetScheduledEmailsResponse {
  scheduled_emails: ScheduledEmail[];
  total: number;
}

// Master Admin Types
export interface MasterAdminSignupRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  org_id?: number | null;
}

export interface MasterAdminSignupResponse {
  user: User;
  organization: Organization;
  message: string;
}

export interface MasterAdminLoginRequest {
  username: string; // email
  password: string;
}

export interface MasterAdminLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: TokenType;
  expires_in: number; // Token expiration time in seconds
  user: User;
  organization: Organization;
}

export interface MasterAdminRefreshTokenRequest {
  refresh_token: string;
}

export interface MasterAdminRefreshTokenResponse {
  access_token: string;
  token_type: TokenType;
  expires_in: number; // Token expiration time in seconds
}

// Master Admin Organization Types
export interface MasterAdminCreateOrganizationRequest {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export type MasterAdminCreateOrganizationResponse = Organization;

export interface MasterAdminUpdateOrganizationRequest {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface MasterAdminGetOrganizationsParams {
  skip?: number;
  limit?: number;
  search?: string;
}

export interface MasterAdminGetOrganizationsResponse {
  organizations: Organization[];
  total: number;
  skip: number;
  limit: number;
}

// Master Admin User Types
export interface MasterAdminCreateUserRequest {
  email: string;
  password: string;
  org_id: number;
  full_name?: string;
  phone?: string;
  role?: UserRole;
}

export type MasterAdminCreateUserResponse = User;

export interface MasterAdminUpdateUserRequest {
  email?: string;
  full_name?: string;
  phone?: string;
  org_id?: number;
  role?: UserRole;
}

export interface MasterAdminGetUsersParams {
  skip?: number;
  limit?: number;
  org_id?: number;
  role?: UserRole;
  search?: string;
}

export interface MasterAdminGetUsersResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

// Enum Helper Functions
export const UserRoleValues = Object.values(UserRole) as string[];
export const TokenTypeValues = Object.values(TokenType) as string[];

/**
 * Check if a string is a valid UserRole
 */
export function isValidUserRole(value: string): value is UserRole {
  return UserRoleValues.includes(value);
}

/**
 * Check if a string is a valid TokenType
 */
export function isValidTokenType(value: string): value is TokenType {
  return TokenTypeValues.includes(value);
}

