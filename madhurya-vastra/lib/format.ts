const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹ with Indian digit grouping: 129999.5 → "₹1,29,999.5". */
export function formatINR(value: number): string {
  return `₹${inr.format(value)}`;
}
