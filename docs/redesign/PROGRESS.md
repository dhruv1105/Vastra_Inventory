# UI redesign: progress

Plan: [README.md](README.md) · Baseline: [../screens.pdf](../screens.pdf)

## How to resume

1. Read this file, then the plan. Load skills `ui-kit` and `redesign-method`.
2. Pick the first unchecked item below. One commit per item, item id in the message
   (e.g. `R1.3: Button and IconButton in the kit`).
3. Before every commit, from `madhurya-vastra/`: `npx tsc --noEmit` and `npm run lint`.
4. After a UI change: before/after screenshots at the 4 sizes (`ui-snapshot` agent).
5. Tick the item here and add one line under "Log".

## Decisions
- [x] D1 logo violet palette + ethnic type/motifs · [x] D2 dark mode now, low priority ·
  [x] D3 Manage Lists own nav item · [x] D4 small transitions + intro animations
- [x] D5 fonts: Cormorant (wordmark) · Marcellus (titles) · Eczar (accent) · Mukta (UI)
- [x] D6 real logo files only (cut from assets/), never redrawn
- [x] D7 every look value is a theme token from `lib/theme/` so admin theming / festival themes
  can come later (docs/roadmap.md, docs/theming.md)

## Items

- [x] R0 HTML mock published and approved (v2)
- [x] R1.1 Tokens as CSS variables + Tailwind mapping; fonts fixed; brand assets + app icons
- [x] R1.2 Kit: Button, IconButton, Loader (+ dev-only /kit preview page)
- [x] R1.3 Kit: Field, Input, Textarea, Select (+ *Field wrappers), Chip, ChipGroup
- [x] R1.4 Kit: Section, PageHeader, EmptyState, Skeleton + Brand (Logo, BrandMark, Vine, Wordmark)
- [x] R1.5 Kit: ConfirmDialog, Toast (restyle), Tabs, Menu; z-index layer tokens
- [x] R1.6 Dark mode: ThemeProvider, ThemeSwitch, no-flash boot script, lavender tokens
- [x] R1.7 Motion: GSAP (lazy), Intro + useIntroOnce, `.mv-stagger` page entrance, reduced-motion
- [x] R2 Shell: header title, Manage Lists in nav, account menu + theme, sidebar rail, intro
- [x] R3 Manage Lists on the kit
- [x] R4.1 Add Item split into section components (no visual change)
- [x] R4.2 Add Item section nav + collapsible sections
- [x] R4.3 Variant grid: blank cells, fill row/column/all
- [x] R4.4 Images: preview, alt text
- [x] R4.5 Error summary, Draft explained, ConfirmDialog
- [x] R5 Login restyle + shared EmptyState on placeholders
- [x] R6 Regression screenshots + new screens.pdf

## Log

- 2026-10-17 R0 v1 mock written: `docs/redesign/mock.html`, published at
  https://claude.ai/artifact/6tHPXY3GShwTnpyszfJUZa (private). 11 screens, phone/tablet/laptop,
  light/dark, font pairings A/B/C. Awaiting review + D5.
- 2026-10-17 R0 v2: login layout fixed, real logo/mark/vine cut from assets, fonts locked (D5).
  Approved by the owner. Dashboard + admin theming noted in docs/roadmap.md.
- 2026-10-17 R1.1: `lib/theme/` (types, preset, fonts, css) → `--mv-*` vars injected in layout;
  Tailwind mapped to vars (legacy `brand-*` names kept); Inter → Mukta, Cormorant wordmark;
  `public/brand/` assets + PWA icons from the logo; manifest updated. tsc, lint, build pass;
  login verified in the browser (fonts resolve, canvas colour). Visible change on old screens:
  new violet, Mukta text, `rounded-md/lg` now 10/16px. `package-lock.json` re-synced by
  `npm install` (it was out of sync with package.json — `npm ci` refused).
  Uncommitted — waiting for the owner.
- 2026-10-17 Committed on branch `redesign/r1` (setup/docs, R1.1). Security review follow-up:
  theme values validated inside themeToCss; settings.json no longer auto-allows git diff/show;
  `.env.*` ignored.
- 2026-10-17 R1.2–R1.7 done, one commit each. Order changes: Loader moved into R1.2 (Button
  uses it), Brand components into R1.4 (PageHeader/EmptyState use them). Motifs are the real
  logo crops, not SVG redraws (D6). Following the OS dark setting is behind
  `FOLLOW_SYSTEM_THEME` (off until R6). Browser-checked on /kit at 390px and 1366px: no
  horizontal scroll, dialog focus + Esc, menu outside-click, dark survives reload, intro ends by
  itself and is skipped with reduced motion. `/kit` returns 404 in production.
  Not wired yet: ThemeSwitch → user menu (R2), Intro → first open (R2) and login (R5),
  `.mv-stagger` → each screen as it is converted.
- 2026-10-18 Docker dev stack + Drizzle (branch chore/docker-db, fast-forwarded into main locally).
- 2026-10-18 R2 (branch redesign/r2): one NAV list (components/layout/nav.ts) drives sidebar,
  bottom nav and phone header title; Manage Lists is a nav item (gear icon removed); account
  menu on the kit Menu with role label, Theme switch, Sign out; sidebar rail uses 12px labels +
  tooltips + full aria-labels; intro plays on first open per session; branded loading screen.
  Fixed: brand images took their default width over the caller's (w-28 beat w-10). Browser-checked
  at 390×844, 844×390, 768×1024, 1366×768: 5 nav links, active item correct, menu closes on Esc
  (focus back) and outside tap, no horizontal scroll, no failed requests. Pages still show their
  old in-page titles on phones until R3–R5 convert them.
- 2026-10-18 R3: Manage Lists rebuilt on the kit — one LISTS config replaces 12 copied handlers;
  PageHeader with one primary "Add <value>", Tabs with counts, live search with a no-match state,
  rows edit in place (Enter saves, Esc cancels, server errors shown under the field), colour
  rows show swatch + hex with a colour picker in the editor, delete via ConfirmDialog, skeleton
  loading and a retry state. No API change. Fixed: `max-md:` was silently dropped (raw `short:`
  screen) so the page title showed twice on phones. Browser-checked at 390 and 1366 on the
  Docker DB: add, duplicate error, rename, delete, bad hex, no-match, no horizontal scroll.
  Later: Undo after delete needs a restore endpoint (names stay unique after soft delete).
- 2026-10-18 R4: Add Item rebuilt as one item (split + restyle together, since the page was
  rewritten anyway). 474-line page → page orchestrator + form.ts (validation, section status,
  unchanged POST body) + Photos/Details/Classify/Price/Variants sections + SectionNav. New:
  jump bar (ticks / red), error summary with links that focus the field, blank grid cells with
  fill row/column/all, size + colour menus with chips to remove, price-per-variant fold,
  photo preview dialog (alt text, reorder, make cover, remove), inline "new item type" dialog,
  margin pill (red "below cost"), "save without photos?" ConfirmDialog, draft explained in the
  action bar. Kit: Dialog base (ConfirmDialog now uses it), Button "danger-ghost", Input skips
  its default w-full when given a width. Fixed during checks: grid column min-width let the
  jump bar widen the page; sr-only text escaped the chip scroller. Browser-checked at 390 and
  1366 on the Docker DB: errors → summary → fix → sizes/colours → fill → photo + alt → saved;
  rows match in Postgres (variants 3/3/3/5, alt "Front drape"). Not tested: Collapsible
  sections were not needed once the jump bar existed (not built).
- 2026-10-18 R5: Login on the kit — real logo on the lavender backdrop (light in both themes),
  logo blooms in and the card rises (CSS, reduced-motion aware), side by side on laptops and
  short landscape phones; Google / phone OTP stay visual only but now say so in a toast instead
  of console.log / window.alert; dev bypass boxed as "Development only". Inventory, Sales and
  Dashboard use PageHeader + EmptyState; Inventory's floating "+" is gone (Add Item is in the
  nav) and the empty state links to Add Item. Kit: LinkButton, Button "outline". No old
  palette/arbitrary classes remain in app/ or components/. Browser-checked at all 4 sizes.
  Also: server-side alt-text check on POST /api/items (security review of R4).

- 2026-10-18 R6: legacy Tailwind names (brand-*, font-serif, rounded-card/input) removed — nothing
  used them; theme now follows the OS by default (FOLLOW_SYSTEM_THEME on, "System" in the switch).
  Regression: 9 screens × 4 sizes × light/dark = 72 screenshots on the Docker stack — no horizontal
  scroll, no console errors or failed requests, dark canvas rgb(22,17,31) via the OS setting.
  docs/screens.pdf regenerated (cover + 18 pages); the old one is docs/redesign/screens-before.pdf.
  Production build passes. Redesign complete.

## Later (found during the redesign, not built)
- Undo after deleting a list value: needs a restore endpoint (names stay unique after soft delete).
- Re-adding a deleted list name returns 409 (unique name incl. soft-deleted rows).
- ~~Login is held in memory: a reload signs out~~ — closed by real auth (A2: sessions survive reloads).
- ~~Server trusts userId from the request body~~ — closed by real auth (A3: the session user is recorded; `userId` removed from request bodies).
