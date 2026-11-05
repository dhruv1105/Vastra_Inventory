-- Starter caption templates and shop details for sharing (docs/plans/sharing.md).
-- Safe to re-run: each kind is seeded only while the table has never had a row of that kind
-- (deleted ones included), so templates staff deleted or changed do not come back.
-- Shop details hold only what is known for certain; the owner adds phone, address and links.

INSERT INTO caption_templates (kind, name, body, default_details, is_default)
SELECT v.kind, v.name, v.body, v.details::text[], v.is_default
FROM (VALUES
  ('caption', 'New arrival', E'✨ New arrival at Madhurya Vastra ✨\n{title}\nMessage us to order 🙏', '{sizes,colours}', true),
  ('caption', 'Available now', E'{title}\nAvailable now — message us for details 🙏', '{sizes}', false),
  ('caption', 'New collection', E'🌸 Our new collection is here! 🌸\nVisit the shop or message us to see more.', '{}', false)
) AS v(kind, name, body, details, is_default)
WHERE NOT EXISTS (SELECT 1 FROM caption_templates WHERE kind = 'caption');

INSERT INTO caption_templates (kind, name, body, is_default)
SELECT 'shop_details', 'Shop details', E'Madhurya Vastra — Grace in Every Thread\nInstagram: @madhuryavastra', true
WHERE NOT EXISTS (SELECT 1 FROM caption_templates WHERE kind = 'shop_details');
