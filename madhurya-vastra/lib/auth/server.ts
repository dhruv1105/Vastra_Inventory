import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, phoneNumber } from "better-auth/plugins";
import { db } from "@/lib/db";
import { accounts, rateLimits, sessions, users, verifications } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password.mjs";
import { normalizePhone } from "./staff.mjs";
import { ac, owner, seller } from "./roles";
import { smsSender } from "./sms";

// Server-side auth (better-auth). Plan and decisions: docs/plans/auth.md.
// - No public sign-up: the owner adds staff (Staff screen) or scripts/create-owner.mjs.
// - Sign-in: phone + password, email + password; Google (A5) and phone OTP (A6) only for
//   existing accounts.

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("BETTER_AUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
}

const DAY = 60 * 60 * 24;

/** Google sign-in is on only when both keys are set (auth A5). Existing accounts only. */
const googleKeys =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : null;

/** Which sign-in methods the login screen offers. Read at request time on the server. */
export function signInOptions() {
  return { google: !!googleKeys };
}

export const auth = betterAuth({
  appName: "Madhurya Vastra",
  // Development falls back to a fixed secret so the stack starts without setup; production fails fast above.
  secret: secret ?? "dev-only-secret-change-me-not-for-production-use",
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications, rateLimit: rateLimits },
  }),
  advanced: {
    cookiePrefix: "mv",
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: { hash: hashPassword, verify: verifyPassword },
    revokeSessionsOnPasswordReset: true,
  },
  socialProviders: googleKeys
    ? {
        google: {
          ...googleKeys,
          // Staff are added by the owner; Google never creates an account.
          disableSignUp: true,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    // First Google sign-in links to the existing account with the same email.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    additionalFields: {
      mustChangePassword: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 30 * DAY,
    updateAge: DAY,
  },
  // Counted in Postgres (works with more than one server). Sign-in: 5 tries a minute per address.
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/*": { window: 60, max: 5 },
      "/phone-number/send-otp": { window: 300, max: 3 },
    },
  },
  plugins: [
    phoneNumber({
      // Sign-up on verification stays off: OTP only signs in phones that already belong to staff.
      sendOTP: ({ phoneNumber: to, code }) => smsSender().sendOtp(to, code),
      phoneNumberValidator: (value) => normalizePhone(value) === value,
      allowedAttempts: 3,
    }),
    admin({
      ac,
      roles: { owner, seller },
      defaultRole: "seller",
      adminRoles: ["owner"],
      bannedUserMessage: "This account is turned off. Ask the owner to turn it back on.",
    }),
    // Lets server actions set auth cookies. Keep last.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
