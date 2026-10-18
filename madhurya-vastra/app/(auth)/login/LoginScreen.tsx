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
// Google (auth A5) and text-message codes (A6) appear only when configured (see page.tsx).

const DEV = { login: "98765 43210", password: "madhurya-dev" };

/** Only same-site paths, so ?next= can't send people to another website. */
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/inventory");

export type SignInOptions = { google: boolean };

/** Google redirects back with ?error=… when it can't sign someone in. */
const googleError = (code: string | null) =>
  code ? "Google sign-in didn't work: no account here uses that Google email. Ask the owner to add your email on the Staff screen, or sign in with your phone and password." : null;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function LoginForm({ options }: { options: SignInOptions }) {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => googleError(params.get("error")));
  const [busy, setBusy] = useState(false);

  const withGoogle = async () => {
    setError(null);
    setBusy(true);
    const next = safeNext(params.get("next"));
    const result = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: `/login?next=${encodeURIComponent(next)}` });
    if (result.error) {
      setBusy(false);
      setError("Google sign-in isn't available right now. Use your phone and password.");
    }
  };

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

      {options.google && (
        <>
          <Button variant="outline" fullWidth icon={<GoogleIcon />} onClick={withGoogle} disabled={busy}>
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

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

export default function LoginScreen({ options }: { options: SignInOptions }) {
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
          <LoginForm options={options} />
        </Suspense>
      </div>
    </div>
  );
}
