import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { auth } from "@/lib/auth/server";
import { logStaff, setMustChangePassword } from "@/lib/staff";

// The signed-in person changes their own password (also the first sign-in after a temporary
// password). Other sessions are signed out; the "must change" flag is cleared.

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const g = await requireUser(request, { allowPasswordChangePending: true });
  if (g.response) return g.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) ?? {};
  } catch {
    return bad("Invalid JSON body");
  }
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!current) return bad("Enter your current password.");
  if (next.length < 8) return bad("The new password needs at least 8 characters.");
  if (next.length > 128) return bad("Keep the new password to 128 characters or fewer.");
  if (next === current) return bad("Choose a password different from the current one.");

  try {
    await auth.api.changePassword({ headers: request.headers, body: { currentPassword: current, newPassword: next, revokeOtherSessions: true } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/invalid|incorrect|password/i.test(msg)) return bad("Your current password is not right.", 400);
    return bad("Internal server error", 500);
  }
  await setMustChangePassword(g.user.id, false);
  await logStaff(g.user.id, "user.password_changed", g.user.id);
  return NextResponse.json({ success: true });
}
