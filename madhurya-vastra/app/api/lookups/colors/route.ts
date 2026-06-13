import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, hex_code AS "hexCode", created_at AS "createdAt"
       FROM colors
       WHERE deleted_at IS NULL
       ORDER BY name ASC`
    );
    return NextResponse.json({ data: result.rows });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, hexCode, userId } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (String(name).trim().length > 50) {
      return NextResponse.json({ error: "Name must be 50 characters or less" }, { status: 400 });
    }
    if (hexCode && !HEX_REGEX.test(String(hexCode))) {
      return NextResponse.json(
        { error: "Hex code must be in #RRGGBB format" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO colors (id, name, hex_code, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING id, name, hex_code AS "hexCode", created_at AS "createdAt"`,
      [String(name).trim(), hexCode || null, userId]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
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
