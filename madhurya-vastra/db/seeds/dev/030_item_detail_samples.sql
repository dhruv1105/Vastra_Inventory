-- Development-only additions for the item detail page (runs after 020): what the inventory list
-- doesn't need but the detail page shows. Re-runnable: fixed ids + ON CONFLICT DO NOTHING, and
-- updates only fill fields that are still empty.
--   Item 1  Lavender Georgette Saree: 3 photos (gallery), description, occasions, tags, cost
--   Item 2  Maroon Banarasi Silk Saree (one of a kind): colours in the design, cost
--   Item 3  Peach Organza Lehenga: a second colour (2 × 2 grid with a 0), cost + a variant cost override
--   Item 29 Archived Old Season Saree: opens by direct link with the Archived badge (already seeded)

UPDATE items SET description = d.description
FROM (VALUES
  (1, 'Soft georgette with a woven lavender border. Light enough for daytime functions.'),
  (3, 'Organza lehenga with sequinned peach panels; comes with blouse fabric and a net dupatta.')
) AS d(n, description)
WHERE items.id = ('d5eed000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid AND items.description IS NULL;

UPDATE items SET cost_price = c.cost
FROM (VALUES (1, 1600), (2, 6200), (3, 3100)) AS c(n, cost)
WHERE items.id = ('d5eed000-0000-4000-8000-' || lpad(c.n::text, 12, '0'))::uuid AND items.cost_price IS NULL;

INSERT INTO images (id, item_id, s3_key, cdn_url, mime_type, size_bytes, display_order, alt_text)
SELECT ('d5eed000-0000-4000-8003-' || lpad(p.k::text, 12, '0'))::uuid,
       'd5eed000-0000-4000-8000-000000000001'::uuid,
       'dev-samples/item-1-' || p.k, '/dev-samples/' || p.photo || '.webp', 'image/webp', 5000, p.k, p.alt
FROM (VALUES
  (1, 'pink-sharara', 'Border detail'),
  (2, 'teal-chanderi', 'Pallu')
) AS p(k, photo, alt)
ON CONFLICT (id) DO NOTHING;

INSERT INTO variants (id, item_id, size, color_id, quantity, selling_price_override, display_order)
SELECT ('d5eed000-0000-4000-8001-' || lpad('3', 6, '0') || lpad(v.k::text, 6, '0'))::uuid,
       'd5eed000-0000-4000-8000-000000000003'::uuid, v.size, c.id, v.qty, NULL, v.k
FROM (VALUES (3, 'M', 'Mint', 1), (4, 'L', 'Mint', 0)) AS v(k, size, color_name, qty)
JOIN colors c ON c.name = v.color_name AND c.deleted_at IS NULL
ON CONFLICT DO NOTHING;

UPDATE variants SET cost_price_override = 2900
WHERE id = 'd5eed000-0000-4000-8001-000003000001' AND cost_price_override IS NULL;

INSERT INTO item_occasions (item_id, occasion_id)
SELECT 'd5eed000-0000-4000-8000-000000000001'::uuid, o.id FROM occasions o WHERE o.name IN ('Festive', 'Wedding') AND o.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO item_tags (item_id, tag_id)
SELECT 'd5eed000-0000-4000-8000-000000000001'::uuid, t.id FROM tags t WHERE t.name IN ('Georgette', 'New Arrival') AND t.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO item_colors (item_id, color_id)
SELECT 'd5eed000-0000-4000-8000-000000000002'::uuid, c.id FROM colors c WHERE c.name IN ('Maroon', 'Gold') AND c.deleted_at IS NULL
ON CONFLICT DO NOTHING;
