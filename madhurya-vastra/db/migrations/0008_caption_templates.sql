CREATE TABLE "caption_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"body" text NOT NULL,
	"default_details" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "caption_templates_kind_check" CHECK ("caption_templates"."kind" IN ('caption', 'shop_details')),
	CONSTRAINT "caption_templates_body_check" CHECK (char_length("caption_templates"."body") BETWEEN 1 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "caption_templates" ADD CONSTRAINT "caption_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caption_templates" ADD CONSTRAINT "caption_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "caption_templates_live_name_unique" ON "caption_templates" USING btree ("kind",lower("name")) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "caption_templates_live_default_unique" ON "caption_templates" USING btree ("kind") WHERE "caption_templates"."is_default" AND deleted_at IS NULL;