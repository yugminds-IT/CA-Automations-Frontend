// API Types - Matching Backend Schemas

// Enums
export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
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

