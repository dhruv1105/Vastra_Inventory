import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";

const ITEM_TYPES = [
  "Saree", "Kurti", "Lehenga", "Dupatta", "Suit Set",
  "Dress", "Top", "Skirt", "Palazzo Set", "Sharara Set",
];

const COLORS = [
  { name: "Red", hex: "#FF0000" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Yellow", hex: "#FFD700" },
  { name: "Green", hex: "#008000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Purple", hex: "#800080" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#000000" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Maroon", hex: "#800000" },
  { name: "Navy", hex: "#000080" },
  { name: "Teal", hex: "#008080" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Peach", hex: "#FFCBA4" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Mint", hex: "#98FF98" },
];

const OCCASIONS = [
  "Casual", "Festive", "Wedding", "Party", "Office Wear",
  "Formal", "Daily Wear", "Traditional", "Sangeet", "Mehendi",
];

const TAGS = [
  "Handloom", "Silk", "Cotton", "Georgette", "Chiffon",
  "Embroidered", "Printed", "Solid", "Designer", "Trending",
  "New Arrival", "Discounted", "Banarasi", "Chanderi",
  "Linen", "Rayon", "Crepe",
];

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  try {
    await query(
      `INSERT INTO users (id, cognito_sub, name, role)
       VALUES ($1, 'seed-user', 'Krishna Sindha', 'owner')
       ON CONFLICT DO NOTHING`,
      [SEED_USER_ID]
    );

    const typesCount = await query(
      `SELECT COUNT(*) FROM item_types WHERE deleted_at IS NULL`
    );
    let typesSeeded = 0;
    if (parseInt(typesCount.rows[0].count, 10) === 0) {
      for (const name of ITEM_TYPES) {
        await query(
          `INSERT INTO item_types (id, name, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          [name, SEED_USER_ID]
        );
      }
      typesSeeded = ITEM_TYPES.length;
    }

    const colorsCount = await query(
      `SELECT COUNT(*) FROM colors WHERE deleted_at IS NULL`
    );
    let colorsSeeded = 0;
    if (parseInt(colorsCount.rows[0].count, 10) === 0) {
      for (const { name, hex } of COLORS) {
        await query(
          `INSERT INTO colors (id, name, hex_code, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          [name, hex, SEED_USER_ID]
        );
      }
      colorsSeeded = COLORS.length;
    }

    const occasionsCount = await query(
      `SELECT COUNT(*) FROM occasions WHERE deleted_at IS NULL`
    );
    let occasionsSeeded = 0;
    if (parseInt(occasionsCount.rows[0].count, 10) === 0) {
      for (const name of OCCASIONS) {
        await query(
          `INSERT INTO occasions (id, name, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          [name, SEED_USER_ID]
        );
      }
      occasionsSeeded = OCCASIONS.length;
    }

    const tagsCount = await query(
      `SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL`
    );
    let tagsSeeded = 0;
    if (parseInt(tagsCount.rows[0].count, 10) === 0) {
      for (const name of TAGS) {
        await query(
          `INSERT INTO tags (id, name, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          [name, SEED_USER_ID]
        );
      }
      tagsSeeded = TAGS.length;
    }

    return NextResponse.json({
      seeded: true,
      counts: {
        types: typesSeeded,
        colors: colorsSeeded,
        occasions: occasionsSeeded,
        tags: tagsSeeded,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
