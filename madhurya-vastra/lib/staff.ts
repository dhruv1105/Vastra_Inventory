import { randomInt } from "node:crypto";
import { query } from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/auth/staff.mjs";
import type { Role } from "@/lib/auth/roles";

export type StaffMember = {
  id: string;
  name: string;
  phone: string | null;
  /** null when only the hidden placeholder email exists. */
  email: string | null;
  role: Role;
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

/** Readable temporary password: 3 groups of 4, no look-alike characters (0/O, 1/l/I). */
export function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

export async function listStaff(): Promise<StaffMember[]> {
  const { rows } = await query(
    `SELECT id, name, phone, email, role, disabled, must_change_password AS "mustChangePassword", created_at AS "createdAt"
     FROM users ORDER BY disabled ASC, (role = 'owner') DESC, name ASC LIMIT 500`,
  );
  return rows.map((r) => ({ ...r, email: isPlaceholderEmail(r.email) ? null : r.email }));
}

export async function getStaff(id: string): Promise<StaffMember | null> {
  const { rows } = await query(
    `SELECT id, name, phone, email, role, disabled, must_change_password AS "mustChangePassword", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ? { ...rows[0], email: isPlaceholderEmail(rows[0].email) ? null : rows[0].email } : null;
}

/** Active owners other than `exceptId` — the last active owner can't be demoted or turned off. */
export async function otherActiveOwners(exceptId: string): Promise<number> {
  const { rows } = await query(`SELECT count(*)::int AS n FROM users WHERE role = 'owner' AND NOT disabled AND id <> $1`, [exceptId]);
  return rows[0].n;
}

export async function setMustChangePassword(id: string, value: boolean) {
  await query(`UPDATE users SET must_change_password = $2, updated_at = now() WHERE id = $1`, [id, value]);
}

/** Append-only staff audit entry (metadata only: no passwords, no phone numbers). */
export async function logStaff(actorId: string, action: string, targetId: string, payload: object = {}) {
  await query(
    `INSERT INTO activity_log (actor_id, action, entity_type, entity_id, payload, created_by) VALUES ($1, $2, 'user', $3, $4, $1)`,
    [actorId, action, targetId, JSON.stringify(payload)],
  );
}
