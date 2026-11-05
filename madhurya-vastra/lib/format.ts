const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹ with Indian digit grouping: 129999.5 → "₹1,29,999.5". */
export function formatINR(value: number): string {
  return `₹${inr.format(value)}`;
}

/** "+919876543210" → "+91 98765 43210"; other numbers are returned as stored. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

const istDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const istDateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/**
 * When something happened, in words: "just now", "5 minutes ago", "3 hours ago", "yesterday",
 * "4 days ago"; a week or more back, the date in IST ("12 Oct 2026").
 */
export function timeAgo(when: string | Date, now: Date = new Date()): string {
  const t = new Date(when);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return istDate.format(t);
}

/** Full date and time in IST, e.g. for a tooltip: "5 Nov 2026, 3:42 pm". */
export function formatDateTimeIST(when: string | Date): string {
  return istDateTime.format(new Date(when));
}

/**
 * Margin in rupees and as a percentage of the selling price (one decimal), computed in paise so no
 * floating-point drift reaches the screen. Null when there is no cost or no price.
 */
export function margin(selling: number, cost: number | null | undefined): { rupees: number; percent: number } | null {
  if (cost == null || !(selling > 0)) return null;
  const paise = Math.round(selling * 100) - Math.round(cost * 100);
  return { rupees: paise / 100, percent: Math.round((paise * 1000) / Math.round(selling * 100)) / 10 };
}
