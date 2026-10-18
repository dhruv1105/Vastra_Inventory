ALTER TABLE "items" ADD COLUMN "is_one_of_a_kind" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: items Add Item saved as one-of-a-kind before this flag existed — exactly one live
-- variant, size 'One Size', no colour. Quantity is ignored (a sold piece has quantity 0).
UPDATE "items" i SET "is_one_of_a_kind" = true
WHERE (SELECT count(*) FROM "variants" v WHERE v."item_id" = i."id" AND v."deleted_at" IS NULL) = 1
  AND EXISTS (
    SELECT 1 FROM "variants" v
    WHERE v."item_id" = i."id" AND v."deleted_at" IS NULL
      AND v."size" = 'One Size' AND v."color_id" IS NULL
  );
