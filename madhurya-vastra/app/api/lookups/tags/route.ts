import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, created_at AS "createdAt"
       FROM tags
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
    const { name, userId } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (String(name).trim().length > 50) {
      return NextResponse.json({ error: "Name must be 50 characters or less" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO tags (id, name, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING id, name, created_at AS "createdAt"`,
      [String(name).trim(), userId]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json({ error: "This tag already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
