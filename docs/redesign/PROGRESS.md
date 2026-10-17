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
- [ ] R2 Shell: header title/back, Manage Lists reachable, user menu, collapsed sidebar
- [ ] R3 Manage Lists on the kit
- [ ] R4.1 Add Item split into section components (no visual change)
- [ ] R4.2 Add Item section nav + collapsible sections
- [ ] R4.3 Variant grid: blank cells, fill row/column/all
- [ ] R4.4 Images: preview, alt text
- [ ] R4.5 Error summary, Draft explained, ConfirmDialog
- [ ] R5 Login restyle + shared EmptyState on placeholders
- [ ] R6 Regression screenshots + new screens.pdf

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
