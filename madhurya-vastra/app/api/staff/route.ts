import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { auth } from "@/lib/auth/server";
import { normalizePhone, placeholderEmail } from "@/lib/auth/staff.mjs";
import { getStaff, listStaff, logStaff, setMustChangePassword, temporaryPassword } from "@/lib/staff";

// Staff accounts — owner only. GET lists everyone; POST adds a person with a temporary password
// that is returned once and must be changed at their first sign-in.

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const g = await requireUser(request, { role: "owner" });
  if (g.response) return g.response;
  try {
    return NextResponse.json({ data: await listStaff() });
  } catch {
    return bad("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  const g = await requireUser(request, { role: "owner" });
  if (g.response) return g.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) ?? {};
  } catch {
    return bad("Invalid JSON body");
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : null);
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "owner" ? "owner" : body.role === "seller" || body.role === undefined ? "seller" : null;

  if (!name) return bad("Enter their name.");
  if (name.length > 80) return bad("Keep the name to 80 characters or fewer.");
  if (!phone) return bad("Enter a 10-digit mobile number, e.g. 98765 43210.");
  if (emailRaw && !EMAIL.test(emailRaw)) return bad("That email address doesn't look right.");
  if (!role) return bad("Role must be Seller or Owner.");

  const password = temporaryPassword();
  try {
    const created = await auth.api.createUser({
      headers: request.headers,
      body: { name, email: emailRaw || placeholderEmail(phone), password, role, data: { phoneNumber: phone } },
    });
    const id = created.user.id;
    await setMustChangePassword(id, true);
    await logStaff(g.user.id, "user.created", id, { role });
    return NextResponse.json({ data: { member: await getStaff(id), temporaryPassword: password } }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/already|exists|unique/i.test(msg)) return bad("Someone with this phone number or email already has an account.", 409);
    return bad("Internal server error", 500);
  }
}
