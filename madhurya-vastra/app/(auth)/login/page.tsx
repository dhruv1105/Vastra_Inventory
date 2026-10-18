"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Wand2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { normalizePhone } from "@/lib/auth/staff.mjs";
import { Logo } from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";

// Sign-in for staff (owner, sellers). Accounts are added by the owner; there is no sign-up.
// Google (auth A5) and text-message codes (A6) appear here once they are configured.

const DEV = { login: "98765 43210", password: "madhurya-dev" };

/** Only same-site paths, so ?next= can't send people to another website. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/inventory");

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = login.trim();
    if (!value || !password) return setError("Enter your phone number or email, and your password.");

    const isEmail = value.includes("@");
    const phone = isEmail ? null : normalizePhone(value);
    if (!isEmail && !phone) return setError("That doesn't look like a phone number. Use the 10 digits, e.g. 98765 43210.");

    setBusy(true);
    const result = isEmail
      ? await authClient.signIn.email({ email: value.toLowerCase(), password })
      : await authClient.signIn.phoneNumber({ phoneNumber: phone!, password });
    if (result.error) {
      setBusy(false);
      const code = result.error.code ?? "";
      if (result.error.status === 429) return setError("Too many tries. Wait a minute, then try again.");
      if (code === "BANNED_USER") return setError(result.error.message ?? "This account is turned off. Ask the owner to turn it back on.");
      // Same message for unknown account and wrong password, so it can't be used to find accounts.
      return setError("That phone/email and password don't match. Check them, or ask the owner to reset your password.");
    }
    router.replace(safeNext(params.get("next")));
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate className="mv-rise-late grid w-full max-w-sm gap-4 self-start rounded-lg bg-surface p-6 shadow-xl lg:self-center lg:shadow-none">
      <h1 className="text-center font-accent text-2xl font-semibold text-fg">Welcome back</h1>

      <TextField
        id="login-id"
        label="Phone number or email"
        autoComplete="username"
        inputMode="email"
        placeholder="98765 43210"
        value={login}
        onChange={(e) => {
          setLogin(e.target.value);
          setError(null);
        }}
      />
      <TextField
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
      />

      {error && (
        <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth icon={<LogIn />} loading={busy}>
        Sign in
      </Button>

      <p className="text-center text-sm text-muted">Forgot your password? Ask the owner to reset it.</p>

      {process.env.NODE_ENV === "development" && (
        <div className="grid gap-2 rounded-md border border-dashed border-zari bg-zari-tint p-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-zari">Development only</span>
          <p className="text-sm text-fg">
            Test owner: <span className="font-semibold tabular-nums">{DEV.login}</span> / <span className="font-semibold">{DEV.password}</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            icon={<Wand2 />}
            onClick={() => {
              setLogin(DEV.login);
              setPassword(DEV.password);
              setError(null);
            }}
          >
            Fill in the test owner
          </Button>
        </div>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-canvas lg:grid-cols-2 short:grid-cols-2">
      {/* Brand backdrop: lavender like the Instagram tile, light in both themes so the violet logo reads. */}
      <section
        aria-hidden="true"
        className="relative grid place-items-center overflow-hidden bg-lavender px-8 pb-20 pt-10 lg:pb-10 short:px-4 short:py-4"
        style={{ backgroundImage: "radial-gradient(120% 90% at 85% 0%, rgb(var(--mv-lavender-glow)) 0%, transparent 55%)" }}
      >
        <span className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full border border-primary/15" />
        <span className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-primary/15" />
        <Logo priority className="mv-bloom relative w-64 sm:w-72 lg:w-96 short:w-56" />
      </section>

      <div className="relative z-10 -mt-12 flex justify-center px-4 pb-10 lg:mt-0 lg:items-center short:mt-0 short:py-4">
        {/* useSearchParams needs a Suspense boundary for static rendering. */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
