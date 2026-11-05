-- One live variant per item + size + colour (item edit can add sizes and colours).
-- Hand-written (drizzle-kit can't express NULLS NOT DISTINCT on an expression index); db/schema.ts
-- points here. The size is compared the way lib/sizes.ts sizeKey() does: trimmed, inner spaces
-- collapsed, lower case. NULLS NOT DISTINCT makes "no colour" equal to "no colour".

-- 1. Refuse to run while live duplicates exist, and say which ones.
DO $$
DECLARE dupes text;
BEGIN
  SELECT string_agg(format('item %s: size "%s", colour %s (%s live rows)', item_id, size_key, coalesce(color_id::text, 'none'), n), E'\n  ')
  INTO dupes
  FROM (
    SELECT item_id, lower(regexp_replace(btrim(size), '\s+', ' ', 'g')) AS size_key, color_id, count(*) AS n
    FROM variants
    WHERE deleted_at IS NULL
    GROUP BY 1, 2, 3
    HAVING count(*) > 1
  ) d;
  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION E'Migration 0005 stopped: some items have the same size and colour twice.\n  %\nSoft-delete or merge the extra rows (UPDATE variants SET deleted_at = now() WHERE id = ...), then run the migration again.', dupes;
  END IF;
END $$;
--> statement-breakpoint

-- 2. Drop an old full UNIQUE (item_id, size, color_id), as a constraint or a plain unique index,
--    whatever it is called: it would block re-adding a size or colour that was removed (soft-deleted).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'variants'::regclass AND con.contype = 'u'
      AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
           FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey))
          = ARRAY['color_id', 'item_id', 'size']
  LOOP
    EXECUTE format('ALTER TABLE variants DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Dropped old unique constraint %', r.conname;
  END LOOP;

  FOR r IN
    SELECT c.relname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE i.indrelid = 'variants'::regclass AND i.indisunique AND i.indpred IS NULL AND i.indexprs IS NULL
      AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid)
      AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
           FROM pg_attribute a WHERE a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey))
          = ARRAY['color_id', 'item_id', 'size']
  LOOP
    EXECUTE format('DROP INDEX %I', r.relname);
    RAISE NOTICE 'Dropped old unique index %', r.relname;
  END LOOP;
END $$;
--> statement-breakpoint

-- 3. The rule itself, for live rows only.
CREATE UNIQUE INDEX IF NOT EXISTS "variants_live_unique"
  ON "variants" ("item_id", lower(regexp_replace(btrim("size"), '\s+', ' ', 'g')), "color_id") NULLS NOT DISTINCT
  WHERE "deleted_at" IS NULL;
