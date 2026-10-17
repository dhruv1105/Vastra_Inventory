import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  try {
    await query(
      `ALTER TABLE items
       ADD COLUMN IF NOT EXISTS wear_type TEXT
       CHECK (wear_type IN ('top', 'bottom', 'both'))`
    );
    await query(`ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check`);
    await query(
      `ALTER TABLE items ADD CONSTRAINT items_status_check
       CHECK (status IN ('active', 'sold_out', 'archived', 'draft'))`
    );
    return NextResponse.json({
      success: true,
      message: "Migration complete: items.wear_type added, 'draft' status allowed",
    });
  } catch {
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
