import { query } from "@/lib/db";
import { smsSender } from "./sms";

/**
 * Called by better-auth when someone asks for a sign-in code. Only phones that belong to an
 * active staff account get a text; for any other number nothing is sent but the caller sees the
 * same response, so the form can't be used to find accounts or to run up SMS costs.
 */
export async function sendOtpToStaff(phoneNumber: string, code: string): Promise<void> {
  const { rows } = await query(`SELECT 1 FROM users WHERE phone = $1 AND NOT disabled LIMIT 1`, [phoneNumber]);
  if (rows.length === 0) return;
  await smsSender().sendOtp(phoneNumber, code);
}
