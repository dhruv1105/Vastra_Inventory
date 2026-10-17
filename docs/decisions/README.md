# Decisions

One short entry per decision that would be expensive to reverse. Newest last.
Format: date · decision · why · what it rules out.

- **2026-10-17 · One Next.js app for staff and customers.** One shop does not need two
  backends. Staff screens in `app/(protected)`, customer screens later in their own route group.
  Rules out: a separate storefront repo.
- **2026-10-17 · UI redesign before real auth.** The built screens are the baseline for every new
  screen; fixing the kit first stops new screens copying old inconsistencies. Auth.js or
  better-auth replaces the Cognito stub right after. Rules out: auth changes inside redesign commits.
- **2026-10-17 · Payments deferred to phase 2, behind a `PaymentProvider` interface.** A mature
  gateway for online orders; YouPI-PG evaluated only for in-shop UPI at the counter after a
  licence and reliability review. Rules out: payment code in phase 1.
- **2026-10-17 · Motion: staff app gets small transitions + short intros; the rest is storefront.**
  GSAP in the staff app only for the login/first-open intro and page entrance (skippable,
  reduced-motion aware). Lenis, React Bits and Vanta.js stay for the phase 2 storefront.
- **2026-10-17 · Brand follows the logo.** Logo violet `#6D37C0` + petal gradient, lavender tints,
  a small gold "zari" accent; Indian-feel typography and logo motifs on every screen, staff
  included. Dark mode supported, low priority.
- **2026-10-17 · Fonts: Cormorant (wordmark), Marcellus (titles), Eczar (accent), Mukta (UI).**
  Cormorant matches the logo wordmark; Marcellus reads best across screens. Sets B/C kept as presets.
- **2026-10-17 · The look is data, not code.** Palette, fonts, radii and motion come from a typed
  `ThemeConfig` (`lib/theme/`) rendered as CSS variables, so an admin can switch themes (incl.
  festival themes) later without a code change. Real logo files only, never redrawn.
- **2026-10-17 · Target: stock as a movement ledger** (purchase, sale, return, adjustment),
  current quantity derived. Needed before Sales. Rules out: editing `variants.quantity` directly
  from new features.
