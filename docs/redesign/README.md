# UI redesign: plan

Status: **Done (R0–R6), 2026-10-18** · Plan written 2026-10-17
Before: [screens-before.pdf](screens-before.pdf) (all screens at 4 sizes + UI/UX observations page).
After: [../screens.pdf](../screens.pdf) (every screen at 4 sizes, light and dark).
Progress and resume notes: [PROGRESS.md](PROGRESS.md).

## 1. Verdict

The app works and is already responsive, but it reads as screens styled one at a time.

- **Tokens exist but are bypassed.** `tailwind.config.ts` defines brand colours, fonts and two
  radii, yet components use `gray-100/200/300`, `red-500/600/700`, `green-600`, `rounded-[12px]`,
  `rounded-[8px]`, `rounded-md`, `rounded-lg` beside `rounded-card`/`rounded-input`.
- **Fonts likely not applied as intended.** `layout.tsx` loads Inter and Cormorant via
  `next/font` as CSS variables, but Tailwind's `fontFamily` names `"Inter"` / `"Cormorant Garamond"`
  literally instead of `var(--font-inter)` / `var(--font-cormorant)`. Verify in the browser.
  `globals.css` also sets `body { font-family: Arial }` and an unused dark-mode variable pair.
- **No shared kit.** Buttons, inputs, chips, cards, empty states and dialogs are written inline
  per page. Empty states differ (dashed card on Inventory, plain card on Sales/Dashboard).
- **Navigation.** Page titles repeat in-page and aren't tied to the header; Manage Lists only
  via a small gear icon; user menu closes only by re-clicking the avatar; collapsed sidebar
  uses 10px labels.
- **Add Item.** 474-line page; long single scroll on phones with no section nav; variant grid
  shows 0 in every cell, no fill-all; no image preview or alt text; no error summary after a failed
  submit; "Draft" isn't explained; `window.confirm` for "no images".
- **Typography.** Serif brand font only on the header and Manage Lists title; other titles bold sans.
- **Already good, keep:** phone-first layout with icon-rail sidebar and bottom nav, the size ×
  colour grid concept, live margin display, cover-photo badge, inline field errors.

## 2. Phases (one commit per item; ids go in commit messages)

| Phase | Scope | Risk |
|---|---|---|
| **R0 — Mock** | One HTML mock of the target look (intro, login, shell, Manage Lists, Add Item, empty state, dialog) at phone + laptop width, light + dark, with 2 font pairings side by side and the logo motifs. Published for review. Source of truth for R1–R5 | none |
| **R1 — Tokens + kit** | Logo palette as CSS variables (light + dark) in `globals.css`, mapped in Tailwind; fonts via `next/font` variables; motif SVGs; `components/ui/`: Button, IconButton, Input, Textarea, Select, Chip, Section, PageHeader, EmptyState, ConfirmDialog, Toast, Tabs, Skeleton, Loader, Menu; theme toggle | low |
| **R1.7 — Motion** | Add GSAP; `Intro` component (login + first open), page entrance stagger, transition tokens; reduced-motion path | low |
| **R2 — Shell** | Header shows page title/back; **Manage Lists as its own item** in sidebar + bottom nav; user menu closes on outside click/Esc and holds the theme toggle; collapsed sidebar with tooltips | low |
| **R3 — Manage Lists** | On the kit: one list pattern, ConfirmDialog for delete, skeleton loading, empty/search-no-result states | low |
| **R4 — Add Item** | Split page into section components; section nav/progress on phone; collapsible sections; variant grid blank cells + fill row/column/all; image preview + alt text; error summary with jump links; explain Draft; ConfirmDialog instead of `window.confirm` | medium |
| **R5 — Login + placeholders** | Login restyle (visual only — auth unchanged); Inventory/Sales/Dashboard use the shared EmptyState | low |
| **R6 — Regression** | Screenshots of every screen at the 4 sizes vs baseline; regenerate `screens.pdf` | — |

## 3. Decisions (2026-10-17)

- **D1 Colours follow the logo.** Primary becomes the logo violet `#6D37C0` with the petal
  gradient `#9E69E4 → #713BC4` and lavender tints; the old `#6B3FA0`/`#9B6FD0` retire. Gold stays
  only as a small "zari" thread accent (`#B8923A`). Indian/ethnic feel on every screen through
  typography and logo motifs — details in the `ui-kit` skill. Font pairing chosen from the R0 mock.
- **D2 Dark mode now, low priority.** Dark tokens + toggle in R1; must be readable, not polished.
- **D3 Manage Lists gets its own nav item** (sidebar and bottom nav).
- **D4 Motion:** small transitions everywhere, plus short intro animations (login / first open,
  page entrance stagger). GSAP for the intro; reduced-motion respected.

## 4. Rules for every redesign commit

- UI only. No API, DB or auth change without asking; list any in the summary.
- Behaviour kept: every button, validation message and save path works as before.
- Before/after screenshots at 390×844, 844×390, 768×1024, 1366×768.
- `npx tsc --noEmit` + `npm run lint` pass; `npm run build` at the end of each phase.
