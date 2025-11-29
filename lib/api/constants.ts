// API Constants and Enum Utilities

import { UserRole, TokenType } from './types';

/**
 * User Role Constants
 */
export const USER_ROLES = {
  ADMIN: UserRole.ADMIN,
  EMPLOYEE: UserRole.EMPLOYEE,
} as const;

/**
 * Token Type Constants
 */
export const TOKEN_TYPES = {
  BEARER: TokenType.BEARER,
} as const;

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
 * Get user role display name
 */
export function getUserRoleDisplayName(role: UserRole | string): string {
  switch (role) {
    case UserRole.ADMIN:
    case 'admin':
      return 'Admin';
    case UserRole.EMPLOYEE:
    case 'employee':
      return 'Employee';
    default:
      return 'Unknown';
  }
}

