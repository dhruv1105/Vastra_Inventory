ALTER TABLE "colors" ADD COLUMN "hex_code_2" char(7);--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_hex_2_check" CHECK ("colors"."hex_code_2" ~ '^#[0-9A-Fa-f]{6}$');