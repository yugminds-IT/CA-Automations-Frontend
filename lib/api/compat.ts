// Compatibility helpers for migration (read-only)

import { getUserData } from './client';

/** Get role string from a user object (backend may return role.name or roleName) */
export function getRoleFromUser(user: { role?: { name?: string }; roleName?: string } | null | undefined): string | null {
  if (!user) return null;
  return (user as any).role?.name ?? user.roleName ?? null;
}

export function isMasterAdminUser(): boolean {
  const user = getUserData();
  const role = getRoleFromUser(user);
  return role != null && role.toUpperCase() === 'MASTER_ADMIN';
}

/** Get role from login/me response (backend returns user.role.name) */
export function getRoleFromResponse(
  response: { user?: { role?: { name?: string }; roleName?: string }; roleName?: string } | null
): string | null {
  if (!response) return null;
  const user = (response as any).user;
  return user?.role?.name ?? user?.roleName ?? (response as any).roleName ?? null;
}

export function restoreAutoLogoutTimer(): void {
  // No-op: backend handles token expiration
}
