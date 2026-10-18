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
