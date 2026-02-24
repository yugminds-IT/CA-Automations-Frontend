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

/** Get role from login/me response (backend returns user.role.name or user.roleName) */
export function getRoleFromResponse(
  response: { user?: { role?: { name?: string } | string; roleName?: string }; roleName?: string } | null
): string | null {
  if (!response) return null;
  const user = (response as { user?: { role?: { name?: string } | string; roleName?: string }; roleName?: string }).user;
  if (!user) return null;
  const role = user.role;
  const roleName = typeof role === 'object' && role?.name ? role.name : typeof role === 'string' ? role : undefined;
  return roleName ?? user.roleName ?? (response as { roleName?: string }).roleName ?? null;
}

export function restoreAutoLogoutTimer(): void {
  // No-op: backend handles token expiration
}
