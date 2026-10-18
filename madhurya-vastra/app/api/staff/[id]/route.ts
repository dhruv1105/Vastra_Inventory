import { NextResponse } from "next/server";
import { requireUser, UUID } from "@/lib/auth/guard";
import { auth } from "@/lib/auth/server";
import { getStaff, logStaff, otherActiveOwners, setMustChangePassword, temporaryPassword } from "@/lib/staff";

// One staff account — owner only. PATCH { action }:
//   "reset-password"  new temporary password (returned once), signs them out everywhere
//   "set-role"        { role: "owner" | "seller" }
//   "disable"         turns the account off and signs them out (never deleted, history stays)
//   "enable"          turns it back on
// The owner can't turn off or demote themselves, and there is always at least one active owner.

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const g = await requireUser(request, { role: "owner" });
  if (g.response) return g.response;
  if (!UUID.test(params.id)) return bad("That person was not found.", 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) ?? {};
  } catch {
    return bad("Invalid JSON body");
  }

  const target = await getStaff(params.id);
  if (!target) return bad("That person was not found.", 404);
  const self = target.id === g.user.id;
  const headers = request.headers;

  try {
    switch (body.action) {
      case "reset-password": {
        const password = temporaryPassword();
        await auth.api.setUserPassword({ headers, body: { userId: target.id, newPassword: password } });
        await setMustChangePassword(target.id, true);
        if (!self) await auth.api.revokeUserSessions({ headers, body: { userId: target.id } });
        await logStaff(g.user.id, "user.password_reset", target.id);
        return NextResponse.json({ data: { member: await getStaff(target.id), temporaryPassword: password } });
      }
      case "set-role": {
        const role = body.role === "owner" ? "owner" : body.role === "seller" ? "seller" : null;
        if (!role) return bad("Role must be Seller or Owner.");
        if (role === target.role) return NextResponse.json({ data: { member: target } });
        if (role === "seller" && (self || (await otherActiveOwners(target.id)) === 0)) {
          return bad(self ? "You can't remove your own owner role. Ask another owner." : "There must always be at least one owner.", 409);
        }
        await auth.api.setRole({ headers, body: { userId: target.id, role } });
        await logStaff(g.user.id, "user.role_changed", target.id, { from: target.role, to: role });
        return NextResponse.json({ data: { member: await getStaff(target.id) } });
      }
      case "disable": {
        if (self) return bad("You can't turn off your own account.", 409);
        if (target.role === "owner" && (await otherActiveOwners(target.id)) === 0) return bad("There must always be at least one active owner.", 409);
        if (!target.disabled) {
          await auth.api.banUser({ headers, body: { userId: target.id, banReason: "Turned off by the owner" } });
          await logStaff(g.user.id, "user.disabled", target.id);
        }
        return NextResponse.json({ data: { member: await getStaff(target.id) } });
      }
      case "enable": {
        if (target.disabled) {
          await auth.api.unbanUser({ headers, body: { userId: target.id } });
          await logStaff(g.user.id, "user.enabled", target.id);
        }
        return NextResponse.json({ data: { member: await getStaff(target.id) } });
      }
      default:
        return bad("Unknown action.");
    }
  } catch {
    return bad("Internal server error", 500);
  }
}
