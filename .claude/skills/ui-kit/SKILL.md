---
name: ui-kit
description: >
  Load before changing ANY screen, component or style in the Madhurya Vastra app. Defines the
  logo-derived violet palette, the Indian/ethnic typography and motifs that must be felt on
  every screen, light and dark tokens, the motion rules (small transitions + short intro
  animations), the shared component kit in components/ui/, the four device sizes, and the bans
  (raw hex, palette classes, arbitrary px, window.confirm). Pairs with redesign-method.
---

# UI kit — Madhurya Vastra

## 1. Feel

An Indian ethnic-wear boutique, not a generic admin tool — on **every** screen, including the
staff inventory. The feel comes from four things used consistently, never from clutter:

1. **Logo violet** as the one brand colour, with lavender tints for surfaces.
2. **Indian-flavoured typography** — a classical display face for titles, an Indian-made sans
   for UI text.
3. **Motifs from the logo** — lotus, the dotted crown, the vine flourish — as dividers, empty
   states, loaders and the login backdrop. Thin lines, low opacity.
4. **Gentle motion** — short intro on entry, small transitions after that.

Restraint: one motif per region, generous white space, content always wins.

## 2. Colour — from the logo

Sampled from `assets/Madhurya vastra Logo.png` (wordmark `#6D37C0`, petals `#9E69E4 → #713BC4`)
and the Instagram tile (lavender backdrop). Approved in R0.

**Where values live:** `lib/theme/presets.ts` (the only place hex values are written) →
`lib/theme/css.ts` renders `--mv-*` variables (RGB channels) → `app/layout.tsx` injects them →
`tailwind.config.ts` maps classes to them. To change a colour, edit the preset — never Tailwind
or a component. Dark applies with `<html data-theme="dark">`; following the OS setting is
switched on in R6.

**Tailwind classes:** `bg-canvas` (page) · `bg-surface` · `text-fg` · `text-muted` ·
`border-line` · `bg-primary` / `hover:bg-primary-hover` / `text-primary-on` · `primary-soft` ·
`bg-tint` / `bg-tint-strong` · `text-zari` / `bg-zari-tint` · `success` / `success-tint` ·
`danger` / `danger-tint`. Opacity works: `bg-primary/10`. Fonts: `font-brand` (wordmark only),
`font-display`, `font-accent`, `font-sans` (UI). Radius: `rounded-sm|md|lg` (6/10/16px) and
`rounded-full`. Motion: `duration-fast|base|slow`, `ease-brand`. The old `brand-*`, `font-serif`,
`rounded-card|input` names still work for unconverted screens and are removed in R6.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#6D37C0` | `#B48CF0` | Primary buttons, active nav, links, wordmark |
| `primary-hover` | `#5A2BA3` | `#C6A6F5` | Hover/pressed |
| `primary-soft` | `#9E69E4` | `#8752D4` | Petal-top accent, gradients, focus ring |
| `tint` | `#F3ECFC` | `#2A2140` | Selected chip, hover rows, soft badges |
| `background` | `#FBF9FE` | `#16111F` | Page |
| `surface` | `#FFFFFF` | `#211A2D` | Cards, header, sidebar, dialogs |
| `border` | `#E7DFF3` | `#3A3150` | Hairlines (use sparingly) |
| `text` | `#241A33` | `#EEE8F7` | Body |
| `text-muted` | `#6E6680` | `#A79FB8` | Help, inactive nav |
| `zari` | `#B8923A` | `#D4B062` | Gold thread accent: cover badge, motif highlights, needs-attention |
| `success` / `danger` | `#2E7D5B` / `#C0392B` | `#5FBF95` / `#E57368` | Status only |

Brand gradient (headers of login/intro, never behind body text):
`linear-gradient(160deg, #9E69E4, #6D37C0)`.

Old values `#6B3FA0` / `#9B6FD0` / `#C9A84C` are retired by R1.

**Dark mode:** `context/ThemeContext.tsx` (choice saved in localStorage, applied before paint by
`themeBootScript`) + `components/ui/ThemeSwitch.tsx` (goes in the user menu in R2). Following the
OS setting is behind `FOLLOW_SYSTEM_THEME` in `lib/theme/presets.ts` — off until R6, so the
switch offers Light / Dark only. `bg-lavender` / `lavender-glow` stay light in dark mode (logo
backdrop). Low priority — it must work and be readable, not be polished screen by screen.

## 3. Typography — Indian feel, readable UI

**Locked (decision D5)** — loaded in `lib/theme/fonts.ts`, roles set in the theme preset:

| Role | Font | Class | Where |
|---|---|---|---|
| Brand | **Cormorant Garamond** | `font-brand` | The "Madhurya Vastra" wordmark only — matches the logo |
| Display | **Marcellus** | `font-display` | Page and section titles, tagline |
| Accent | **Eczar** (Indian Type Foundry) | `font-accent` | Short expressive phrases: empty-state titles, welcome line |
| UI | **Mukta** (Ek Type) | `font-sans` | Labels, inputs, buttons, tables, all numbers |

Font sets B (Cormorant titles) and C (Eczar titles) are kept in `fontSets` for future themes.

Rules: display faces only at ≥ 20px and never for numbers in inputs or tables; prices and
quantities use the UI font with `tabular-nums`. Tagline style: uppercase, letter-spacing 0.15em,
like the logo. No fake-Devanagari Latin fonts ("Samarkan"-style) — they read as costume.
Fonts reference the `next/font` CSS variables, never literal family names.

## 4. Brand assets and motifs — the real logo, never redrawn

All cut from `assets/Madhurya vastra Logo.png` into `public/brand/`:

| File | What | Where |
|---|---|---|
| `logo.png` (1024w) | Full lockup: lotus, wordmark, tagline, vine | Login / intro on the lavender backdrop |
| `mark.png` (480w) | Lotus with the M | Header, empty states, loader |
| `vine.png` (900w) | The flourish under the tagline | Under page titles on wide screens |
| `icon-192/512.png` | Mark on lavender | PWA / favicon |

Never redraw, trace or recolour the logo in code. If a new crop or a white version is needed,
cut it from the asset file. Decorative use: low opacity (≤ 0.6 for the vine), full opacity only
for the logo and the mark.

## 5. Motion

| Kind | Rule |
|---|---|
| **Intro** | Login screen and first app open of a session: the logo blooms in (scale + soft blur), rings ripple, the sign-in card rises — ≤ 1.2s, skippable by tap, never blocks input after 300ms. Page first load: content staggers in (≤ 40ms per block, ≤ 300ms total). Use GSAP for the intro timeline. |
| **Transitions** | 150–250ms, ease-out: hover, press, drawer/dialog open, tab change, toast. CSS/Tailwind first. |
| **Never** | Parallax, scroll-jacking, looping decoration, motion on data-entry fields. |
| **Always** | `prefers-reduced-motion: reduce` → no intro, instant transitions. Animate only `transform` and `opacity`. |

Lenis / Vanta / React Bits stay out of the staff app (storefront, phase 2).

## 6. Bans

- Raw hex/rgb in `className` or `style` (except data: a lookup colour swatch's `hexCode`).
- Tailwind palette classes (`gray-*`, `red-*`, `purple-*` …) — use tokens.
- Arbitrary values (`rounded-[12px]`, `text-[10px]`, `z-[60]`) — add a token. Stacking uses
  `z-nav | z-menu | z-toast | z-dialog`. Only exception: layout `calc()` with
  `env(safe-area-inset-*)`, `--bottom-nav-h` or the 4rem header height.
- `window.confirm` / `alert` — use `ConfirmDialog` / toast.
- A button, input, chip, card or empty state written inline in a page — use or extend the kit.
- Card inside a card. Motif behind body text.
- `max-sm:` / `max-md:` variants — Tailwind silently disables them because the config has a raw
  `short:` screen. Write mobile-first instead (`sr-only md:not-sr-only`).

## 7. The kit — `components/ui/`

Built in redesign R1. Until a piece exists, the closest existing component is the reference:

| Kit piece | Replaces / reference today |
|---|---|
| `Button` (primary · secondary · ghost · danger; sm/md; loading) | inline buttons in `items/new`, `LookupList` |
| `IconButton` (needs `aria-label`) | edit/delete icons in `LookupList`, header gear |
| `Input`, `Textarea` (label, help, error, counter) | `items/new` fields |
| `Select` / searchable select | `components/items/SearchableSelect.tsx` |
| `Chip` / chip group | `components/items/ChipSelect.tsx` |
| `Section` (titled block, `VineDivider`, collapsible option) | "Photos", "Basic Details" cards |
| `PageHeader` (display-font title, back, one primary action) | in-page `<h1>`s |
| `EmptyState` (`mark.png`, accent-font title, why, next action) | Inventory dashed card, Sales/Dashboard text |
| `Skeleton`, `Loader` (three pulsing dots) | spinner in `(protected)/layout.tsx` |
| `ConfirmDialog` | `window.confirm` in `items/new` |
| `Toast` | `context/ToastContext.tsx` (restyle onto tokens) |
| `Tabs`, `Menu` (outside click + Esc closes) | Manage Lists tabs, header user dropdown |
| `Intro` (GSAP timeline, skippable, reduced-motion aware) | — new |

Each kit component: typed props, `className` only for layout, keyboard accessible, visible focus
ring (`primary-soft`), works in light and dark and at all four sizes.

## 8. Device sizes — every screen

Phone portrait 390×844 · Phone landscape 844×390 · Tablet portrait 768×1024 · Laptop 1366×768.
No horizontal page scroll. Tap targets ≥ 44px. Bottom padding respects
`env(safe-area-inset-bottom)`.

## 9. Navigation

One list, `components/layout/nav.ts` (`NAV`), feeds the sidebar, the bottom nav and the phone
header title — add a screen there, never in one place only. Items: Inventory · Add Item ·
Sales · Dashboard · **Manage Lists** ("Lists" on the phone bar). Five bottom-nav items is the
maximum. Active item: tint + primary text + a small zari dot. On phones the header shows the
screen name and `PageHeader` hides its visible title (kept for screen readers). Account menu
(avatar): name, role label, Theme switch, Sign out.

## 10. Words

Labels, not machine values: `both` → "Top + Bottom", `sold_out` → "Sold out". Prices `₹1,999`
(`Intl.NumberFormat('en-IN')`). Same noun everywhere: **Item**, **Variant**, **Lists**.
