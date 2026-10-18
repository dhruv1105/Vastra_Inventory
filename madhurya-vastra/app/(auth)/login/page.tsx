"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, Phone, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/context/ToastContext";
import { Logo } from "@/components/ui/Brand";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";

// Sign-in screen. Google and phone OTP are visual only until real authentication replaces the
// Cognito stub (after the redesign); the development button is what signs in today.

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const notYet = () => showToast("This sign-in option arrives with the new login. Use the test owner for now.", "info");

  const handleDevLogin = () => {
    // Dev bypass: the seeded owner (db/seeds/dev/001_dev_owner.sql).
    signIn({
      id: "00000000-0000-0000-0000-000000000001",
      cognitoSub: "dev-sub-001",
      name: "Krishna Sindha",
      phone: "+919876543210",
      email: "krishna@example.com",
      avatarUrl: null,
      role: "owner",
    });
    router.push("/inventory");
  };

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-canvas lg:grid-cols-2 short:grid-cols-2">
      {/* Brand backdrop: lavender like the Instagram tile, light in both themes so the violet logo reads. */}
      <section
        aria-hidden="true"
        className="relative grid place-items-center overflow-hidden bg-lavender px-8 pb-20 pt-10 lg:pb-10 short:px-4 short:py-4"
        style={{ backgroundImage: "radial-gradient(120% 90% at 85% 0%, rgb(var(--mv-lavender-glow)) 0%, transparent 55%)" }}
      >
        <span className="pointer-events-none absolute -left-24 -bottom-40 h-96 w-96 rounded-full border border-primary/15" />
        <span className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-primary/15" />
        <Logo priority className="mv-bloom relative w-64 sm:w-72 lg:w-96 short:w-56" />
      </section>

      <div className="relative z-10 -mt-12 flex justify-center px-4 pb-10 lg:mt-0 lg:items-center short:mt-0 short:py-4">
        <div className="mv-rise-late grid w-full max-w-sm gap-4 self-start rounded-lg bg-surface p-6 shadow-xl lg:self-center lg:shadow-none">
          <h1 className="text-center font-accent text-2xl font-semibold text-fg">Welcome back</h1>

          <Button variant="outline" fullWidth icon={<GoogleIcon />} onClick={notYet}>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-line" />
            or use your phone
            <span className="h-px flex-1 bg-line" />
          </div>

          {step === "phone" ? (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setStep("otp");
              }}
            >
              <TextField
                id="login-phone"
                label="Phone number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                leading={<Phone />}
                placeholder="98765 43210"
                help="We'll text you a 6-digit code."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Button type="submit" fullWidth icon={<Send />}>
                Send code
              </Button>
            </form>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                notYet();
              }}
            >
              <TextField
                id="login-otp"
                label={`Code sent to ${phoneNumber || "your phone"}`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                className="text-center text-lg tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
              <Button type="submit" fullWidth icon={<ShieldCheck />}>
                Verify
              </Button>
              <Button variant="ghost" icon={<ArrowLeft />} onClick={() => setStep("phone")}>
                Change number
              </Button>
            </form>
          )}

          {process.env.NODE_ENV === "development" && (
            <div className="grid gap-2 rounded-md border border-dashed border-zari bg-zari-tint p-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-zari">Development only</span>
              <Button variant="outline" size="sm" icon={<LogIn />} onClick={handleDevLogin}>
                Dev Bypass Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
