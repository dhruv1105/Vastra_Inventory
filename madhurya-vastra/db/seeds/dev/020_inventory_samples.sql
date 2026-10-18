-- Development-only sample inventory: 30 items covering every state the inventory list shows.
-- Applied by `./scripts/db.sh seed` (passes --dev); container start does NOT run dev seeds.
-- Re-runnable: fixed ids + ON CONFLICT DO NOTHING. Remove them all with:
--   DELETE FROM items WHERE id::text LIKE 'd5eed000-0000-4000-8000-%';
-- (variants and images go with their item via ON DELETE CASCADE.)
-- Photos are placeholders in public/dev-samples/. Ids sort newest first: item 1 is the newest.
-- 28 items are visible (20 on the first page, 8 after "Show more"); 29 is archived and 30 is
-- deleted, and neither may appear.

INSERT INTO items (id, title, item_type_id, wear_type, selling_price, status, is_one_of_a_kind,
                   created_by, updated_by, created_at, updated_at, deleted_at)
SELECT ('d5eed000-0000-4000-8000-' || lpad(s.n::text, 12, '0'))::uuid, s.title, t.id, s.wear, s.price,
       s.status, s.one_off, o.id, o.id,
       now() - make_interval(mins => s.n * 7), now() - make_interval(mins => s.n * 7),
       CASE WHEN s.deleted THEN now() END
FROM (VALUES
  (1, 'Lavender Georgette Saree', 'Saree', 'both', 2499, 'active', false, false),  -- in stock (9)
  (2, 'Maroon Banarasi Silk Saree', 'Saree', 'both', 8999, 'active', true, false),  -- one-of-a-kind, qty 1: no Low stock
  (3, 'Peach Organza Lehenga', 'Lehenga', 'both', 4999, 'active', false, false),  -- from ₹4,499
  (4, 'Teal Chanderi Kurti', 'Kurti', 'top', 1299, 'active', false, false),  -- Low stock (1)
  (5, 'Navy Cotton Suit Set', 'Suit Set', 'both', 1899, 'sold_out', false, false),  -- Sold out, dimmed
  (6, 'Mint Rayon Kurti', 'Kurti', 'top', 999, 'draft', false, false),  -- Draft + No stock added + no photo
  (7, 'Gold Tissue Dupatta', 'Dupatta', 'top', 799, 'active', false, false),  -- No stock added
  (8, 'Pink Mehendi Sharara Set', 'Sharara Set', 'both', 3499, 'active', false, false),  -- Low stock (2) + from ₹2,999
  (9, 'Black Palazzo Set', 'Palazzo Set', 'bottom', 1499, 'active', false, false),  -- 0 in stock: Low stock
  (10, 'Red Bridal Lehenga', 'Lehenga', 'both', 24999, 'sold_out', true, false),  -- one-of-a-kind sold (qty 0)
  (11, 'Beige Linen Kurti', NULL, 'top', 1199, 'active', false, false),  -- no item type
  (12, 'Purple Chiffon Saree', 'Saree', 'both', 1999, 'draft', false, false),  -- Draft with 1 in stock: no Low stock
  (13, 'Mustard Handloom Saree', 'Saree', 'both', 3299, 'draft', true, false),  -- Draft + one-of-a-kind
  (14, 'Hand-embroidered Pure Silk Kanjivaram Saree with Contrast Zari Pallu and Matching Blouse Piece', 'Saree', 'both', 12999, 'active', false, false),  -- long title
  (15, 'White Chikankari Kurti', 'Kurti', 'top', 1599, 'active', false, false),  -- override higher: no from
  (16, 'Yellow Haldi Suit Set', 'Suit Set', 'both', 2199, 'active', false, false),
  (17, 'Orange Bandhani Dupatta', 'Dupatta', 'top', 699, 'active', false, false),
  (18, 'Green Silk Lehenga', 'Lehenga', 'both', 6999, 'active', false, false),  -- from ₹6,499
  (19, 'Silver Tissue Saree', 'Saree', 'both', 5499, 'active', false, false),
  (20, 'Blue Printed Dress', 'Dress', 'both', 1299, 'active', false, false),
  (21, 'Peach Crop Top', 'Top', 'top', 899, 'active', false, false),  -- page 2 starts here
  (22, 'Maroon Pleated Skirt', 'Skirt', 'bottom', 1099, 'active', false, false),  -- Low stock (2)
  (23, 'Lavender Palazzo Set', 'Palazzo Set', 'bottom', 1599, 'active', false, false),
  (24, 'Pink Anarkali Kurti', 'Kurti', 'top', 1799, 'active', false, false),  -- from ₹1,599
  (25, 'Beige Office Kurti', 'Kurti', 'top', 1099, 'active', false, false),
  (26, 'Navy Festive Saree', 'Saree', 'both', 2999, 'active', false, false),
  (27, 'Gold Zari Lehenga', 'Lehenga', 'both', 9999, 'active', true, false),  -- one-of-a-kind
  (28, 'Mint Daily Wear Kurti', 'Kurti', 'top', 799, 'active', false, false),
  (29, 'Archived Old Season Saree', 'Saree', 'both', 999, 'archived', false, false),  -- archived: must NOT show
  (30, 'Deleted Test Kurti', 'Kurti', 'top', 999, 'active', false, true)  -- deleted: must NOT show
) AS s(n, title, type_name, wear, price, status, one_off, deleted)
LEFT JOIN item_types t ON t.name = s.type_name AND t.deleted_at IS NULL
LEFT JOIN LATERAL (SELECT id FROM users WHERE role = 'owner' ORDER BY created_at LIMIT 1) o ON true
ON CONFLICT (id) DO NOTHING;

INSERT INTO variants (id, item_id, size, color_id, quantity, selling_price_override, display_order)
SELECT ('d5eed000-0000-4000-8001-' || lpad(v.n::text, 6, '0') || lpad(v.k::text, 6, '0'))::uuid,
       ('d5eed000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid,
       v.size, c.id, v.qty, v.override, v.k
FROM (VALUES
  (1, 1, 'S', 'Lavender', 3, NULL),
  (1, 2, 'M', 'Lavender', 4, NULL),
  (1, 3, 'L', 'Lavender', 2, NULL),
  (2, 1, 'One Size', NULL, 1, NULL),
  (3, 1, 'M', 'Peach', 2, 4499),
  (3, 2, 'L', 'Peach', 3, NULL),
  (4, 1, 'M', 'Teal', 1, NULL),
  (4, 2, 'L', 'Teal', 0, NULL),
  (5, 1, 'M', 'Navy', 0, NULL),
  (5, 2, 'L', 'Navy', 0, NULL),
  (8, 1, 'S', 'Pink', 1, 2999),
  (8, 2, 'M', 'Pink', 1, NULL),
  (9, 1, 'M', 'Black', 0, NULL),
  (9, 2, 'L', 'Black', 0, NULL),
  (10, 1, 'One Size', NULL, 0, NULL),
  (11, 1, 'M', 'Beige', 3, NULL),
  (11, 2, 'L', 'Beige', 3, NULL),
  (12, 1, 'Free Size', 'Purple', 1, NULL),
  (13, 1, 'One Size', NULL, 1, NULL),
  (14, 1, 'Free Size', 'Maroon', 4, NULL),
  (15, 1, 'S', 'White', 3, NULL),
  (15, 2, 'M', 'White', 3, NULL),
  (15, 3, 'L', 'White', 2, 1799),
  (16, 1, 'M', 'Yellow', 5, NULL),
  (16, 2, 'L', 'Yellow', 4, NULL),
  (17, 1, 'Free Size', 'Orange', 12, NULL),
  (18, 1, 'S', 'Green', 1, NULL),
  (18, 2, 'M', 'Green', 2, NULL),
  (18, 3, 'L', 'Green', 2, 6499),
  (19, 1, 'Free Size', 'Silver', 3, NULL),
  (20, 1, 'S', 'Blue', 4, NULL),
  (20, 2, 'M', 'Blue', 4, NULL),
  (21, 1, 'S', 'Peach', 2, NULL),
  (21, 2, 'M', 'Peach', 2, NULL),
  (21, 3, 'L', 'Peach', 2, NULL),
  (22, 1, 'M', 'Maroon', 2, NULL),
  (23, 1, 'M', 'Lavender', 3, NULL),
  (23, 2, 'L', 'Lavender', 3, NULL),
  (24, 1, 'S', 'Pink', 1, 1599),
  (24, 2, 'M', 'Pink', 2, NULL),
  (24, 3, 'L', 'Pink', 3, NULL),
  (25, 1, 'M', 'Beige', 5, NULL),
  (25, 2, 'L', 'Beige', 5, NULL),
  (26, 1, 'Free Size', 'Navy', 3, NULL),
  (27, 1, 'One Size', NULL, 1, NULL),
  (28, 1, 'S', 'Mint', 6, NULL),
  (28, 2, 'M', 'Mint', 6, NULL),
  (28, 3, 'L', 'Mint', 6, NULL),
  (29, 1, 'Free Size', 'Red', 2, NULL),
  (30, 1, 'M', 'Red', 2, NULL)
) AS v(n, k, size, color_name, qty, override)
LEFT JOIN colors c ON c.name = v.color_name AND c.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO images (id, item_id, s3_key, cdn_url, mime_type, size_bytes, display_order, alt_text)
SELECT ('d5eed000-0000-4000-8002-' || lpad(p.n::text, 12, '0'))::uuid,
       ('d5eed000-0000-4000-8000-' || lpad(p.n::text, 12, '0'))::uuid,
       'dev-samples/item-' || p.n, '/dev-samples/' || p.photo || '.webp', 'image/webp', p.bytes, 0, 'Sample photo'
FROM (VALUES
  (1, 'lavender-georgette', 5450),
  (2, 'maroon-banarasi', 17202),
  (3, 'peach-lehenga', 5804),
  (4, 'teal-chanderi', 3196),
  (5, 'navy-cotton', 7742),
  (7, 'gold-tissue', 2720),
  (8, 'pink-sharara', 7578),
  (11, 'beige-linen', 2572),
  (14, 'maroon-banarasi', 17202),
  (16, 'gold-tissue', 2720),
  (18, 'teal-chanderi', 3196),
  (19, 'gold-tissue', 2720),
  (20, 'navy-cotton', 7742),
  (21, 'peach-lehenga', 5804),
  (23, 'lavender-georgette', 5450),
  (24, 'pink-sharara', 7578),
  (25, 'beige-linen', 2572),
  (26, 'navy-cotton', 7742),
  (27, 'gold-tissue', 2720)
) AS p(n, photo, bytes)
ON CONFLICT (id) DO NOTHING;
