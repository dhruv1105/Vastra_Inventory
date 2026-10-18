# Madhurya Vastra — product brief

## The shop
One women's ethnic-wear shop: sarees, kurtis, lehengas, dupattas, suit sets, palazzo and
sharara sets. Stock varies by size and colour; many pieces are one-of-a-kind.

## Users

| User | Device | How often | Needs |
|---|---|---|---|
| Owner | Phone, sometimes laptop | Daily | Add stock fast, see what sells, set prices, see margins |
| Seller (staff) | Phone in the shop | Many times a day | Find an item, check size/colour stock, record a sale |
| Customer (phase 2) | Phone, web | Occasional | Browse, filter by occasion/size/colour, order, pay |

## Phase 1 — inventory (now)

Built: login (dev bypass only), Add Item (photos, details, classification, pricing with margin,
size × colour grid with price overrides, draft/active), Manage Lists (types, colours, occasions,
tags), responsive shell (header, collapsible sidebar, bottom nav).

To build: inventory list/grid, item detail/edit, stock adjustments, sales/billing, dashboard,
real authentication.

**Current step: UI redesign of the built screens** — see [redesign/README.md](redesign/README.md).

## Phase 2 — customers

Storefront (web + installable PWA), cart, orders, customer accounts, online payment, order
status. Same Next.js app and API; customer screens in their own route group. Motion
(Lenis/GSAP/React Bits) lives here only.

## Out of scope (for now)
Multiple branches, GST invoicing integration, marketplace sync, loyalty programme.

## Success measures
- Adding a 9-variant item takes under 2 minutes on a phone.
- A seller answers "do we have this in M, maroon?" in under 10 seconds.
- Stock count matches the shelf at month end.
