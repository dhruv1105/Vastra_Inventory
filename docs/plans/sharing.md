# Caption templates + sharing: brief and plan

Status: **Draft — waiting for approval** · Branch: `feat/sharing` (from `main`) · Roadmap step 3

## Brief

- **Who:**
  - **Sellers and the owner**, many times a day on a phone in the shop, send an item to a customer on
    WhatsApp ("do you have this in red?") or post new stock to the shop's Instagram.
  - **The owner**, now and then on phone or laptop, writes the caption wording the shop uses.
- **Problem:** today staff save photos from the gallery, then type the name, price and sizes by
  hand for every customer. It is slow, prices get typed wrong, and every message looks different.
  The item page shows a disabled Share button.
- **How we know it worked:**
  - Sharing an item with photos and a ready caption takes **under 15 seconds and 3 taps** on a
    phone (Share → check caption → pick WhatsApp or Instagram in the phone's share menu).
  - Prices and sizes in a caption always match the item page (no hand-typed numbers).
  - Every caption looks like the shop's own wording.
- **Not in this feature:** sharing several items in one message (a catalogue), scheduled or
  automatic Instagram posting (needs Meta's business API and account approval), customer
  contacts, a shareable public web link for an item (comes with the storefront, phase 2),
  tracking who opened what.

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
| T1 | The owner manages caption templates on Manage Lists, in a new **Captions** tab: add, edit, delete (ConfirmDialog), and mark one as the **default**. Sellers see them read-only. Server: 403 for sellers. |
| T2 | A template is a name (≤ 50) and text (≤ 1,000). It can contain fields from a fixed list, shown as tap-to-insert chips: `{title}`, `{price}`, `{sizes}`, `{colours}`, `{type}`, `{occasions}`, `{tags}`, `{design_colours}`, `{description}`. An unknown field (e.g. `{prise}`) is refused by the server with a sentence naming it. |
| T3 | The editor shows a live preview with a sample item. |
| T4 | A fresh install has two starter templates ("New arrival", "Available now"), one of them the default. Seeds are re-runnable. |
| T5 | Exactly one default at most; deleting the default leaves none, and the share sheet then uses the first template. With no templates at all, the share sheet uses a built-in plain caption (title, price, sizes). |
| **Caption** | |
| C1 | `{price}` is "₹2,499", or "from ₹2,199" when a size is cheaper. Never cost. |
| C2 | `{sizes}` and `{colours}` list only what is **in stock** now, in the usual size order ("S, M, L"); a one-of-a-kind piece shows "One of a kind". |
| C3 | A line whose fields are all empty disappears (no "Occasions: " with nothing after it). |
| C4 | Text and field values are kept exactly as typed (Hindi/Gujarati, emoji, line breaks). |
| **Share** | |
| S1 | The item page's **Share** button opens a share sheet for **active** items (and sold-out ones? see question 3). For drafts and archived items it stays disabled with the reason. |
| S2 | The sheet: template picker (default first), the caption (editable before sending, with a character count; WhatsApp cuts photo captions after 1,024), and the photos as tick-boxes (all ticked; cover first; up to 8). |
| S3 | **Share** opens the phone's share menu with the ticked photos (as JPEG) and the caption; the caption is also copied, with "Caption copied — paste it in Instagram". |
| S4 | Without a share menu (laptop, plain http): Copy caption, Download photos, Open WhatsApp (text). Each says what it did. |
| S5 | An item with no photo shares the caption only. |
| S6 | Each share is logged: `item.shared` in `activity_log` (template name, photo count; never the caption text, which could hold anything). |
| **Both** | |
| B1 | Works for owner and seller at 390×844, 844×390, 768×1024 and 1366×768, light and dark; ≥ 44 px targets; `apiFetch` everywhere. |
| B2 | Route tests: roles, validation (length, unknown field, default), log entry. Unit tests: the caption renderer (every field, empty lines, one-of-a-kind, price from, no stock). |

## Plan

### DB (migration 0008, generated by Drizzle)
- `caption_templates`: `id`, `name` varchar(50) unique among live rows, `body` text (≤ 1,000, checked),
  `is_default` boolean, audit columns, `deleted_at`. Partial unique index: one live default.
- Seed `db/seeds/020_caption_templates.sql` (re-runnable): the two starter templates, e.g.

  ```
  ✨ New arrival at Madhurya Vastra ✨
  {title}
  {type} · {price}
  Sizes: {sizes}
  Colours: {colours}
  {description}
  Message us to order 🙏
  ```
- `items.caption_text` (already there, unused) — see question 2.

### API (`api-route` skill)
- `GET /api/caption-templates` (staff), `POST` (owner), `PATCH /api/caption-templates/[id]` (owner;
  rename, text, make default — clears the old default in the same transaction), `DELETE` (owner,
  soft). Every write logs to `activity_log`. Shared field list + checks in `lib/caption.ts`.
- `POST /api/items/[id]/share` → logs `item.shared` `{ template, photos }`; 404 for missing items;
  any signed-in staff.

### Screens and components
- `lib/caption.ts`: `CAPTION_FIELDS`, `renderCaption(template, item)` (pure; used by the sheet and
  the editor preview), `unknownFields(body)`.
- Manage Lists → **Captions** tab: `components/lookups/CaptionTemplates.tsx` (list with the default
  marked, editor in a Dialog: name, text, field chips that insert at the cursor, live preview).
  Reuses Tabs, Dialog, ConfirmDialog, TextField/TextAreaField, Chip, EmptyState.
- Item page → `components/items/detail/ShareSheet.tsx` (Dialog): template Select, TextAreaField with
  counter, photo tick-grid, Share / Copy caption / Download photos / Open WhatsApp.
  `lib/share.ts`: `canShareFiles()`, `toJpegFiles(urls)` (canvas), `copyText()`, `whatsappUrl(text)`.
- The Share button on the item page becomes active (S1).

### Steps (one commit each)
1. **Caption renderer** — `lib/caption.ts` + unit tests (no UI yet).
2. **Templates DB + API** — migration 0008, seed, routes, route + Postgres tests.
3. **Captions tab** on Manage Lists — owner edits, seller reads; screenshots.
4. **Share sheet** — item page, Web Share with JPEG files, fallbacks, `item.shared` log.
5. **Verify and docs** — both roles, four sizes, light and dark; CLAUDE.md, roadmap, brief;
   acceptance table. Real phone sharing is checked by you (see "Not verifiable here").

### What users will notice
- Share on the item page works; Manage Lists gets a Captions tab.
- Nothing else changes.

### Not verifiable here
- The real WhatsApp / Instagram apps: this environment has no phone. I'll test the share call with a
  stand-in browser and the fallbacks for real; the final check is yours on a phone, over `localhost`
  on a laptop's Chrome, or after hosting (HTTPS).

## Questions for the owner

1. **Who edits templates:** owner only (sellers pick and can still tweak the text before sending)?
2. **Per-item caption:** `items.caption_text` exists. Should staff be able to **save** a tweaked
   caption for one item ("use this text for this saree from now on"), or is the template always the
   starting point? Proposal: not in this step — templates only; keeps it simple.
3. **Which items can be shared:** active only, or sold-out too (e.g. "can be re-ordered")? Proposal:
   active and sold out; drafts and archived not.
4. **Shop details in captions:** phone number, address, Instagram handle — written straight into the
   template text by the owner (proposal), or a separate "Shop details" setting with a `{shop_phone}`
   field?
5. **Price in captions:** always shown, or a template may leave `{price}` out (proposal: the owner
   decides per template — it's just a field)?
6. **Share from the inventory list** (a share icon on each card) as well as the item page? Proposal:
   item page only for now; easy to add later.
