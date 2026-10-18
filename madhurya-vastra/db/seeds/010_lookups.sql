-- Starter lists for Manage Lists (moved from the retired /api/seed route).
-- Safe to re-run: existing names, including soft-deleted ones, are left untouched, so a list
-- value the owner deleted does not come back.

INSERT INTO item_types (name) VALUES
  ('Saree'), ('Kurti'), ('Lehenga'), ('Dupatta'), ('Suit Set'),
  ('Dress'), ('Top'), ('Skirt'), ('Palazzo Set'), ('Sharara Set')
ON CONFLICT (name) DO NOTHING;

INSERT INTO colors (name, hex_code) VALUES
  ('Red', '#FF0000'), ('Pink', '#FFC0CB'), ('Orange', '#FFA500'), ('Yellow', '#FFD700'),
  ('Green', '#008000'), ('Blue', '#0000FF'), ('Purple', '#800080'), ('White', '#FFFFFF'),
  ('Black', '#000000'), ('Beige', '#F5F5DC'), ('Maroon', '#800000'), ('Navy', '#000080'),
  ('Teal', '#008080'), ('Gold', '#FFD700'), ('Silver', '#C0C0C0'), ('Peach', '#FFCBA4'),
  ('Lavender', '#E6E6FA'), ('Mint', '#98FF98')
ON CONFLICT (name) DO NOTHING;

INSERT INTO occasions (name) VALUES
  ('Casual'), ('Festive'), ('Wedding'), ('Party'), ('Office Wear'),
  ('Formal'), ('Daily Wear'), ('Traditional'), ('Sangeet'), ('Mehendi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tags (name) VALUES
  ('Handloom'), ('Silk'), ('Cotton'), ('Georgette'), ('Chiffon'),
  ('Embroidered'), ('Printed'), ('Solid'), ('Designer'), ('Trending'),
  ('New Arrival'), ('Discounted'), ('Banarasi'), ('Chanderi'),
  ('Linen'), ('Rayon'), ('Crepe')
ON CONFLICT (name) DO NOTHING;
