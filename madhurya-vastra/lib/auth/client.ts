"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields, phoneNumberClient } from "better-auth/client/plugins";
import type { auth } from "./server";
import { ac, owner, seller } from "./roles";

/** Browser side of better-auth: sign in / out, the current session, owner's staff actions. */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), phoneNumberClient(), adminClient({ ac, roles: { owner, seller } })],
});
