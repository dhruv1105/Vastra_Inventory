import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// Who may manage staff accounts (better-auth admin plugin). App permissions (who may edit lists,
// see cost price …) are checked by requireUser() in lib/auth/guard.ts — see docs/plans/auth.md.

export const ac = createAccessControl(defaultStatements);

/** Owner: add staff, change roles, disable, reset passwords. No delete (disable instead), no impersonation. */
export const owner = ac.newRole({
  user: ["create", "list", "set-role", "ban", "set-password", "get", "update"],
  session: ["list", "revoke"],
});

/** Seller: no staff management. */
export const seller = ac.newRole({ user: [], session: [] });

export const ROLES = ["owner", "seller"] as const;
export type Role = (typeof ROLES)[number];
