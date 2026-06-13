import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, userId } = body;
    const { id } = params;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (String(name).trim().length > 50) {
      return NextResponse.json({ error: "Name must be 50 characters or less" }, { status: 400 });
    }

    const result = await query(
      `UPDATE item_types
       SET name = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING id, name, created_at AS "createdAt"`,
      [String(name).trim(), userId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Item type not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json({ error: "This type already exists" }, { status: 409 });
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
      `UPDATE item_types
       SET deleted_at = NOW(), updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND deleted_at IS NULL`,
      [userId, id]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
