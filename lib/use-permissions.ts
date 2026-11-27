"use client";

import { useEffect, useState } from "react";
import { getMyAccess } from "@/lib/api/access";
import { normalizeStructure, type UnitStructure } from "@/lib/unit-structure";

export interface AccessInfo {
  permissions: string[];
  /** False for a single-branch organization (chosen at signup): no brands, everyone sees its data. */
  adminPanel: boolean;
  unitStructure: UnitStructure;
}

/**
 * The signed-in user's permission keys and admin-panel setting, or null while loading or when the
 * request fails. Client-portal users have no CRM permissions, so the lookup is skipped for them.
 */
export function useAccess(role: string | null): AccessInfo | null {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  useEffect(() => {
    if (!role || role.toLowerCase() === "client") return;
    let active = true;
    getMyAccess()
      .then((res) => {
        // A backend that predates the setting omits it, which means the panel is on.
        if (active) setAccess({
            permissions: res.permissions,
            adminPanel: res.adminPanel !== false,
            unitStructure: normalizeStructure(res.unitStructure),
          });
      })
      .catch(() => {
        if (active) setAccess(null);
      });
    return () => {
      active = false;
    };
  }, [role]);
  return access;
}

/** The signed-in user's permission keys, or null while loading or when the request fails. */
export function usePermissions(role: string | null): string[] | null {
  return useAccess(role)?.permissions ?? null;
}

/** Whether the organization uses the admin panel (brands). True until the answer is known. */
export function useAdminPanel(role: string | null): boolean {
  return useAccess(role)?.adminPanel ?? true;
}
