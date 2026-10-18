import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

// All better-auth endpoints: /api/auth/sign-in/email, /api/auth/sign-in/phone-number,
// /api/auth/get-session, /api/auth/sign-out, /api/auth/admin/* …
export const { GET, POST } = toNextJsHandler(auth);
