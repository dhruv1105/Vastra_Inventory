# Caption templates + sharing: brief and plan

Status: **Draft v2 — all questions answered (A, B agreed 2026-11-05); approved 2026-11-05, building** · Branch: `feat/sharing`
(from `main`) · Roadmap step 3

## Owner's answers (2026-11-05)

| # | Question | Answer | Effect on the plan |
|---|---|---|---|
| 1 | Who edits templates | Owner **and sellers** (for now) | No 403 for sellers on template routes; every write logged with who |
| 2 | Per-item saved caption | **Templates only** for now. Many templates are generic (new arrival / collection / offer), some are item-specific | `items.caption_text` stays unused. Templates need no item fields; generic text-only sharing is possible (see open question A) |
| 3 | Which items can be shared | **Active (in stock) only** | `status = 'active'` only. Sold out, draft, archived: Share disabled with the reason |
| 4 | Shop details | A separate **default "shop details" block** (shop, website, WhatsApp/Instagram/Facebook) added to every message; owner can edit it and keep several versions | New template kind `shop_details`; one default; the sheet adds it and lets staff switch version or leave it off |
| 5 | Price in captions | **Off by default**, with an option to add it. Same for colours, sizes, etc. | Item details become **toggles** in the share sheet, all off by default (see open question B) |
| 6 | Share from inventory list | **Yes** | Share icon on each inventory card opens the same share sheet |

Also decided: **no Meta API integration in this step** (automatic Instagram posting, auto-DMs,
WhatsApp Business API). It needs hosting (public HTTPS photo URLs), a Meta app and account checks.
Researched options and prerequisites are in "Later: Meta integrations" at the end; it gets its own
roadmap step after hosting.

### Questions A and B (agreed 2026-11-05: both proposals accepted)

- **A. Generic messages without an item** (e.g. "New Diwali collection is in!"): share text only
  from the Captions tab (a Share button per template, no photos)? Proposal: **yes**, text only;
  photos of several items in one message is the catalogue feature, later.
- **B. Template text vs. toggles.** Proposal: a template is **free text** with only one optional
  field, `{title}`. Item details (Price, Sizes, Colours, Type, Occasions, Design colours,
  Description) are **toggles** in the share sheet, added as lines after the template text. Each
  template remembers which toggles start ticked (all off at first), so a "price list" template can
  start with price on. One way to add details, not two.

## Brief

- **Who:**
  - **Sellers and the owner**, many times a day on a phone in the shop, send an item to a customer on
    WhatsApp ("do you have this in red?") or post new stock to the shop's Instagram.
  - **Owner and sellers**, now and then on phone or laptop, write the caption wording and shop
    details the shop uses.
- **Problem:** today staff save photos from the gallery, then type the name, price and sizes by
  hand for every customer. It is slow, prices get typed wrong, and every message looks different.
  The item page shows a disabled Share button.
- **How we know it worked:**
  - Sharing an item with photos and a ready caption takes **under 15 seconds and 3 taps** on a
    phone (Share → check caption → pick WhatsApp or Instagram in the phone's share menu).
  - Prices and sizes in a caption always match the item page (no hand-typed numbers).
  - Every message carries the shop's details in the shop's own wording.
- **Not in this feature:** sharing several items in one message (a catalogue), automatic Instagram
  posting / auto-DMs / WhatsApp Business API (see "Later"), customer contacts, a public web link
  for an item (storefront, phase 2), tracking who opened what.

### What the phone can and can't do (sets the design)

- A web app can hand photos + text to the phone's own **share menu** (Web Share API). The person
  then picks WhatsApp, Instagram, a WhatsApp contact or group, etc. This works on Android Chrome and
  iPhone Safari, and needs **HTTPS** (or `localhost`). Over a plain `http://192.168…` address, as when
  testing on a phone over Wi-Fi, the share menu is not available and the fallback below is used.
- **WhatsApp** takes the photos and usually the text with them.
- **Instagram ignores text passed this way**, so the caption is **copied first**; the person pastes it.
- Photos are converted to **JPEG** before sharing: WhatsApp and Instagram treat WebP badly
  (WhatsApp may show it as a sticker), and the dev sample photos are WebP.
- **Laptop / no share menu:** "Copy caption", "Download photos" and "Open WhatsApp" (WhatsApp Web
  with the text filled in; photos are attached there by hand).

## Acceptance criteria

| # | Criterion |
|---|---|
| **Templates** | |
| T1 | Owner and sellers manage templates on Manage Lists, in a new **Captions** tab with two groups: **Captions** and **Shop details**. Add, edit, delete (ConfirmDialog), mark one per group as **default**. Every change is logged with who made it. |
| T2 | A template is a name (≤ 50) and text (≤ 1,000). Caption text may contain `{title}` (tap-to-insert chip); shop-details text has no fields. Any other `{…}` (e.g. `{titel}`) is refused by the server with a sentence naming it. A caption template stores which detail toggles start ticked (B). |
| T3 | The editor shows a live preview with a sample item and the default shop details. |
| T4 | A fresh install has starter templates: captions "New arrival", "Available now", "New collection" (generic) and one "Shop details" block with placeholders the owner fills in. One default each. Seeds are re-runnable. |
| T5 | At most one default per group; deleting a default leaves none, and the sheet then uses the first. With no caption templates the sheet starts from the item title; with no shop details nothing is added. |
| **Caption** | |
| C1 | Price toggle: "₹2,499", or "from ₹2,199" when a size is cheaper. Never cost. Off by default. |
| C2 | Sizes and Colours toggles list only what is **in stock** now, in the usual size order ("S, M, L"); a one-of-a-kind piece shows "One of a kind". |
| C3 | A detail with no value adds no line (no "Occasions:" with nothing after it). |
| C4 | Text and values are kept exactly as typed (Hindi/Gujarati, emoji, line breaks). |
| C5 | Order: template text → ticked details → shop details. |
| **Share** | |
| S1 | **Share** on the item page and a share icon on each inventory card open the share sheet for **active** items. For sold-out, draft and archived items it is disabled with the reason ("Sold out — only items in stock can be shared"). |
| S2 | The sheet: caption template picker (default first), detail toggles, shop-details picker (default first, or "None"), the caption (editable before sending, with a character count; WhatsApp cuts photo captions after 1,024), and the photos as tick-boxes (all ticked; cover first; up to 8). |
| S3 | **Share** opens the phone's share menu with the ticked photos (as JPEG) and the caption; the caption is also copied, with "Caption copied — paste it in Instagram". |
| S4 | Without a share menu (laptop, plain http): Copy caption, Download photos, Open WhatsApp (text). Each says what it did. |
| S5 | An item with no photo shares the caption only. |
| S6 | Each share is logged: `item.shared` in `activity_log` (template name, photo count; never the caption text). |
| S7 | A generic caption can be shared as text only from the Captions tab, with shop details added; logged as `caption.shared`. |
| **Both** | |
| B1 | Works for owner and seller at 390×844, 844×390, 768×1024 and 1366×768, light and dark; ≥ 44 px targets; `apiFetch` everywhere. |
| B2 | Route tests: both roles allowed, signed-out denied, validation (length, unknown field, default per group), log entries, share refused for non-active items. Unit tests: the caption builder (each toggle, empty values, one-of-a-kind, price from, no stock, order, shop details on/off). |

## Plan

### DB (migration 0008, generated by Drizzle)
- `caption_templates`: `id`, `kind` (`caption` | `shop_details`), `name` varchar(50) unique per kind
  among live rows, `body` text (≤ 1,000, checked), `default_details` text[] (toggle keys, captions
  only), `is_default` boolean, audit columns, `deleted_at`. Partial unique index: one live default
  per kind.
- Seed `db/seeds/020_caption_templates.sql` (re-runnable), e.g.

  ```
  ✨ New arrival at Madhurya Vastra ✨
  {title}
  Message us to order 🙏
  ```
  and a shop-details block:
  ```
  Madhurya Vastra — Grace in Every Thread
  📍 <address> · 📞 <WhatsApp number>
  Instagram: @madhuryavastra
  ```
- `items.caption_text` stays unused (answer 2).

### API (`api-route` skill)
- `GET /api/caption-templates`, `POST`, `PATCH /api/caption-templates/[id]` (rename, text, toggles,
  make default — clears the old default of the same kind in one transaction), `DELETE` (soft). All
  for any signed-in staff (answer 1). Every write logs to `activity_log`. Checks in `lib/caption.ts`.
- `POST /api/items/[id]/share` → 404 missing, 409 with a sentence if not active; logs `item.shared`
  `{ template, photos }`. `POST /api/caption-templates/[id]/share` for S7 (logs `caption.shared`).

### Screens and components
- `lib/caption.ts`: `DETAIL_FIELDS`, `buildCaption({ template, item, details, shop })` (pure; used
  by the sheet and the editor preview), `unknownFields(body, kind)`.
- Manage Lists → **Captions** tab: `components/lookups/CaptionTemplates.tsx` (two groups, default
  marked, editor in a Dialog: name, text, `{title}` chip, starting toggles, live preview).
  Reuses Tabs, Dialog, ConfirmDialog, TextField/TextAreaField, Chip, EmptyState.
- `components/items/ShareSheet.tsx` (Dialog), opened from the item page and the inventory card:
  template Select, detail toggles, shop-details Select, TextAreaField with counter, photo tick-grid,
  Share / Copy caption / Download photos / Open WhatsApp. `lib/share.ts`: `canShareFiles()`,
  `toJpegFiles(urls)` (canvas), `copyText()`, `whatsappUrl(text)`.
- Inventory card: share icon button (`aria-label="Share <title>"`), active items only.

### Steps (one commit each)

Progress: step 1 done (`lib/caption.ts`). Step 2 done (migration 0008, seed 020, routes, 30 route + 3 Postgres tests). Next: step 3.

1. **Caption builder** — `lib/caption.ts` + unit tests (no UI yet).
2. **Templates DB + API** — migration 0008, seed, routes, route + Postgres tests.
3. **Captions tab** on Manage Lists — both groups, editor, preview; screenshots.
4. **Share sheet** — item page, Web Share with JPEG files, fallbacks, `item.shared` log.
5. **Share from the inventory list** — card icon; S7 generic text share from the Captions tab.
6. **Verify and docs** — both roles, four sizes, light and dark; CLAUDE.md, roadmap, brief;
   acceptance table. Real phone sharing is checked by you (see "Not verifiable here").

### What users will notice
- Share on the item page works; inventory cards get a share icon; Manage Lists gets a Captions tab
  (captions + shop details).
- Nothing else changes.

### Not verifiable here
- The real WhatsApp / Instagram apps: this environment has no phone. I'll test the share call with a
  stand-in browser and the fallbacks for real; the final check is yours on a phone, over `localhost`
  on a laptop's Chrome, or after hosting (HTTPS).

## Later: Meta integrations (own roadmap step, after hosting)

Researched 2026-11-05 from Meta's developer docs and guides; re-check before building.

| Feature | What it does for the shop | Needs | Cost |
|---|---|---|---|
| **Instagram post from the app** (Content Publishing API) | One tap: item photos (carousel) + caption posted to @madhuryavastra, no paste | Instagram **Professional** account (Business/Creator); Meta app with Instagram Login (no Facebook Page needed); photos at a **public HTTPS URL** (after S3 + hosting); JPEG only; 100 posts / 24 h; no shopping tags | Free |
| **Comment → auto DM** (Messaging API, private replies) | Customer comments "price" on a post → app DMs the item's price/sizes | Same + `instagram_business_manage_messages`; one private reply per comment within 7 days; follow-ups only after the customer replies (24 h window) | Free |
| **WhatsApp Business catalogue** | Items appear in the shop's WhatsApp catalogue for customers to browse | WhatsApp Business app + Meta Commerce catalogue (sync items to it) | Free |
| **WhatsApp Cloud API** (broadcasts, order updates) | "New arrivals" message to opted-in customers; order messages in phase 2 | Business verification; Meta-approved message templates; customer opt-in list (phase 2) | Marketing ≈ ₹0.86/message (India, 2026); replies within 24 h free |

Not possible by any allowed route: posting WhatsApp Status or Channel updates, sending a first DM
to someone who never messaged, browser automation of Instagram (against its terms).
