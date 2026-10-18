/** Join class names, skipping falsy values. Kit components accept `className` for layout only. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
