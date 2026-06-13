import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, hexCode, userId } = body;
    const { id } = params;

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (name && String(name).trim().length > 50) {
      return NextResponse.json({ error: "Name must be 50 characters or less" }, { status: 400 });
    }
    if (hexCode && !HEX_REGEX.test(String(hexCode))) {
      return NextResponse.json(
        { error: "Hex code must be in #RRGGBB format" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE colors
       SET
         name = COALESCE($1, name),
         hex_code = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE hex_code END,
         updated_by = $3,
         updated_at = NOW()
       WHERE id = $4 AND deleted_at IS NULL
       RETURNING id, name, hex_code AS "hexCode", created_at AS "createdAt"`,
      [name ? String(name).trim() : null, hexCode || null, userId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Color not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json({ error: "This color already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId } = body;
    const { id } = params;

    await query(
      `UPDATE colors
       SET deleted_at = NOW(), updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND deleted_at IS NULL`,
      [userId, id]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
