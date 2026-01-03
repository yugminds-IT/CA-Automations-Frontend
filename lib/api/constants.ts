// API Constants and Enum Utilities

import { UserRole, TokenType } from './types';

/**
 * User Role Constants
 */
export const USER_ROLES = {
  MASTER_ADMIN: UserRole.MASTER_ADMIN,
  ADMIN: UserRole.ADMIN,
  EMPLOYEE: UserRole.EMPLOYEE,
  CLIENT: UserRole.CLIENT,
} as const;

/**
 * Token Type Constants
 */
export const TOKEN_TYPES = {
  BEARER: TokenType.BEARER,
} as const;

/**
 * Check if user is master admin
 */
export function isMasterAdmin(role: UserRole | string): boolean {
  return role === UserRole.MASTER_ADMIN || role === 'master_admin';
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | string): boolean {
  return role === UserRole.ADMIN || role === 'admin';
}

/**
 * Check if user is employee
 */
export function isEmployee(role: UserRole | string): boolean {
  return role === UserRole.EMPLOYEE || role === 'employee';
}

/**
 * Check if user is client
 */
export function isClient(role: UserRole | string): boolean {
  return role === UserRole.CLIENT || role === 'client';
}

/**
 * Get user role display name
 */
export function getUserRoleDisplayName(role: UserRole | string): string {
  switch (role) {
    case UserRole.MASTER_ADMIN:
    case 'master_admin':
      return 'Master Admin';
    case UserRole.ADMIN:
    case 'admin':
      return 'Admin';
    case UserRole.EMPLOYEE:
    case 'employee':
      return 'Employee';
    case UserRole.CLIENT:
    case 'client':
      return 'Client';
    default:
      return 'Unknown';
  }
}

