# Theming — what exists and the ideas kept for later

Source of truth in code: `madhurya-vastra/lib/theme/` (types, presets, CSS-variable output).
Approved look: the R0 mock, `docs/redesign/mock.html`.

## Default theme — "Madhurya" (approved 2026-10-17)

**Colour** (sampled from `assets/Madhurya vastra Logo.png`):

| Token | Light | Dark | Use |
|---|---|---|---|
| primary | `#6D37C0` | `#B48CF0` | Wordmark violet: primary buttons, active nav, links |
| primary-hover | `#5A2BA3` | `#C6A6F5` | Hover / pressed |
| primary-soft | `#9E69E4` | `#8752D4` | Petal-top violet: focus ring, accents |
| tint / tint-strong | `#F3ECFC` / `#E7DAFA` | `#2A2140` / `#352A52` | Selected chip, hover, soft badges |
| canvas | `#FBF9FE` | `#16111F` | Page background |
| surface | `#FFFFFF` | `#211A2D` | Cards, header, sidebar, dialogs |
| border | `#E7DFF3` | `#3A3150` | Hairlines |
| fg / muted | `#241A33` / `#6E6680` | `#EEE8F7` / `#A79FB8` | Text / help text |
| zari / zari-tint | `#B8923A` / `#F6EEDC` | `#D4B062` / `#3A3020` | Gold-thread accent, needs attention |
| success / success-tint | `#2E7D5B` / `#E3F2EA` | `#5FBF95` / `#1D3329` | Saved, margin |
| danger / danger-tint | `#C0392B` / `#FBE7E4` | `#E57368` / `#3D2220` | Errors, delete |

Login backdrop: lavender (like the Instagram tile), stays light in dark mode so the violet logo reads.

**Fonts** (decision D5):

| Role | Font | Where |
|---|---|---|
| brand | Cormorant Garamond | The "Madhurya Vastra" wordmark only |
| display | Marcellus | Page and section titles, tagline (uppercase, 0.2em tracking) |
| accent | Eczar | Short phrases: empty-state titles, welcome line |
| ui | Mukta | Everything else; numbers with tabular figures |

**Brand assets** — always the real files, never redrawn: `public/brand/logo.png` (full lockup),
`mark.png` (lotus + M), `vine.png` (flourish under the tagline). All cut from
`assets/Madhurya vastra Logo.png`.

**Motion**: intro = logo blooms (scale + soft blur, ~1s), rings ripple, sign-in card rises;
skippable; page content staggers in (≤ 300ms total); transitions 150–250ms; none with reduced motion.

## Kept for later (from the mock)

- **Font set B** — Cormorant Garamond for titles too (more editorial, softer).
- **Font set C** — Eczar for titles (strongest Indian calligraphic feel; good for festive themes).
- **Festival theme ideas** — see [roadmap.md](roadmap.md#admin-theming-after-the-redesign-and-real-auth).
- **Brand gradient** `#9E69E4 → #6D37C0` — for festive banners or the storefront hero.

## Rules for any theme (admin-made later included)

- Text/background pairs meet WCAG AA contrast in both light and dark.
- Status colours (success, danger) keep their meaning in every theme.
- The real logo is never recoloured beyond its own violet (a white version is allowed on dark).
- Motion always honours `prefers-reduced-motion`.
