#!/usr/bin/env node
// Create the first owner account (there is no public sign-up), or reset an owner's password.
//
//   node scripts/create-owner.mjs --name "Krishna Sindha" --phone 98765 43210 [--email a@b.in]
//   node scripts/create-owner.mjs --phone 9876543210 --reset-password
//   node scripts/create-owner.mjs --dev        development test owner (safe to re-run)
//
// The password comes from OWNER_PASSWORD; without it a temporary password is generated, printed
// once, and must be changed at the first sign-in. Docker: ./scripts/create-owner.sh …

import { randomBytes } from "node:crypto";
import pg from "pg";
import { hashPassword } from "../lib/auth/password.mjs";
import { normalizePhone, placeholderEmail } from "../lib/auth/staff.mjs";

const DEV_OWNER = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Krishna Sindha",
  phone: "+919876543210",
  email: "owner@example.com",
  password: process.env.DEV_OWNER_PASSWORD || "madhurya-dev",
};

function args() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      // Allow unquoted phone numbers with spaces: --phone 98765 43210
      const parts = [next];
      while (argv[i + 2] && !argv[i + 2].startsWith("--") && key === "phone") parts.push(argv[++i + 1]);
      out[key] = parts.join(" ");
      i++;
    }
  }
  return out;
}

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const opts = args();
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");
if (opts.dev && process.env.NODE_ENV === "production") fail("--dev is for development only.");

const temporaryPassword = () => randomBytes(9).toString("base64url");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function setPassword(userId, password, mustChange) {
  const hash = await hashPassword(password);
  const updated = await client.query(
    `UPDATE accounts SET password = $2, updated_at = now() WHERE user_id = $1 AND provider_id = 'credential'`,
    [userId, hash],
  );
  if (updated.rowCount === 0) {
    await client.query(
      `INSERT INTO accounts (user_id, account_id, provider_id, password) VALUES ($1, $2, 'credential', $3)`,
      [userId, String(userId), hash],
    );
  }
  await client.query(`UPDATE users SET must_change_password = $2, updated_at = now() WHERE id = $1`, [userId, mustChange]);
}

try {
  await client.query("BEGIN");

  if (opts.dev) {
    const d = DEV_OWNER;
    await client.query(
      `INSERT INTO users (id, name, email, phone, phone_verified, role)
       VALUES ($1, $2, $3, $4, true, 'owner')
       ON CONFLICT (id) DO UPDATE SET role = 'owner', disabled = false,
         email = EXCLUDED.email, phone = EXCLUDED.phone, phone_verified = true`,
      [d.id, d.name, d.email, d.phone],
    );
    await setPassword(d.id, d.password, false);
    await client.query("COMMIT");
    console.log(`Dev owner ready: ${d.phone} or ${d.email}, password "${d.password}".`);
  } else {
    const phone = opts.phone ? normalizePhone(String(opts.phone)) : null;
    if (opts.phone && !phone) fail(`"${opts.phone}" is not a phone number. Use 10 digits (India) or +<country code>.`);
    const email = typeof opts.email === "string" ? opts.email.trim().toLowerCase() : null;
    if (!phone && !email) fail("Give --phone (and optionally --email).");

    const found = await client.query(`SELECT id, name, role FROM users WHERE ($1::text IS NOT NULL AND phone = $1) OR ($2::text IS NOT NULL AND email = $2)`, [phone, email]);
    const given = process.env.OWNER_PASSWORD;
    if (given && given.length < 8) fail("OWNER_PASSWORD must be at least 8 characters.");
    const password = given || temporaryPassword();
    const mustChange = !given;

    if (found.rowCount > 0) {
      if (!opts["reset-password"]) fail(`${found.rows[0].name || "That person"} already has an account. Add --reset-password to set a new password.`);
      const u = found.rows[0];
      if (u.role !== "owner") fail("That account is not an owner. Change roles from the Staff screen.");
      await setPassword(u.id, password, mustChange);
      await client.query("UPDATE sessions SET expires_at = now() WHERE user_id = $1", [u.id]);
      await client.query("COMMIT");
      console.log(`Password reset for ${u.name}. Signed out everywhere.`);
    } else {
      if (!opts.name || opts.name === true) fail('Give --name "Full Name".');
      const created = await client.query(
        `INSERT INTO users (name, email, phone, role) VALUES ($1, $2, $3, 'owner') RETURNING id`,
        [String(opts.name).trim(), email ?? placeholderEmail(phone), phone],
      );
      await setPassword(created.rows[0].id, password, mustChange);
      await client.query("COMMIT");
      console.log(`Owner created: ${opts.name}${phone ? `, ${phone}` : ""}${email ? `, ${email}` : ""}.`);
    }
    if (mustChange) console.log(`Temporary password (shown once, change it at first sign-in): ${password}`);
  }
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  fail(err.message);
} finally {
  await client.end().catch(() => {});
}
