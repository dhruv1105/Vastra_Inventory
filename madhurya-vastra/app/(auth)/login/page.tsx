import { signInOptions } from "@/lib/auth/server";
import LoginScreen from "./LoginScreen";

// Server part of the login page: decides at request time which sign-in methods are configured
// (Google keys, SMS provider), so they can be switched on with environment variables alone.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginScreen options={signInOptions()} />;
}
