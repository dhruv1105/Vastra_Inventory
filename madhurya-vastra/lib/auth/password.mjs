// Password hashing shared by the app (better-auth, lib/auth/server.ts) and the setup command
// (scripts/create-owner.mjs). Plain .mjs on Node's built-in scrypt so the command runs in the
// production image without TypeScript or extra packages.
//
// Stored format: scrypt$N$r$p$<salt hex>$<hash hex>

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 16;
const P = 1;
const KEY_LEN = 64;
// N * r * 128 bytes = 32 MiB; the default maxmem (32 MiB) is too tight, allow 64 MiB.
const MAXMEM = 64 * 1024 * 1024;

/** @returns {Promise<Buffer>} */
function scrypt(password, salt, n, r, p, keyLen) {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, keyLen, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, N, R, P, KEY_LEN);
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * @param {{ hash: string, password: string }} data
 * @returns {Promise<boolean>}
 */
export async function verifyPassword({ hash, password }) {
  const parts = String(hash).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, keyHex] = parts;
  const expected = Buffer.from(keyHex, "hex");
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), Number(n), Number(r), Number(p), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}
