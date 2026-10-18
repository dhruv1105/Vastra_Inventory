// Staff identity helpers shared by the app and scripts/create-owner.mjs.

/** better-auth requires an email; staff added with only a phone get this hidden placeholder. */
export const PLACEHOLDER_EMAIL_DOMAIN = "staff.madhurya.invalid";

/** @param {string} key a phone number or id */
export function placeholderEmail(key) {
  return `staff-${String(key).replace(/[^0-9a-z]/gi, "")}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

/** @param {string | null | undefined} email */
export function isPlaceholderEmail(email) {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

/**
 * Indian mobile numbers to E.164: "98765 43210", "+91-98765-43210", "09876543210" → "+919876543210".
 * Other numbers must already start with "+" and a country code. Returns null when not a phone.
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return `+${digits}`;
  return null;
}
