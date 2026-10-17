"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { LogIn, Phone, Send } from "lucide-react";

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const { signIn } = useAuth();
  const router = useRouter();

  const handleDevLogin = () => {
    // Dev bypass
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
    <div className="min-h-screen flex items-center justify-center bg-brand-background px-4">
      <div className="w-full max-w-md bg-white rounded-[12px] shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🪷</div>
          <h1 className="font-serif text-4xl font-bold text-brand-primary mb-2">
            Madhurya Vastra
          </h1>
          <p className="text-brand-text-muted italic">Grace in Every Thread</p>
        </div>

        <div className="space-y-6">
          <button className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-brand-primary/50 text-brand-text-primary font-medium py-3 px-4 rounded-[8px] transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {step === "phone" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 rounded-[8px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                  />
                </div>
              </div>
              <button
                onClick={() => setStep("otp")}
                className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-medium py-3 px-4 rounded-[8px] transition-colors flex justify-center items-center gap-2"
              >
                Send OTP
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-1">
                  Enter OTP sent to {phoneNumber}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 rounded-[8px] border border-gray-300 text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                />
              </div>
              <button
                onClick={() => {
                  // Real flow would call confirmOTP here
                  alert("OTP verification would happen here");
                }}
                className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-medium py-3 px-4 rounded-[8px] transition-colors"
              >
                Verify
              </button>
              <button
                onClick={() => setStep("phone")}
                className="w-full text-brand-text-muted text-sm hover:text-brand-primary transition-colors"
              >
                Back to Phone Number
              </button>
            </div>
          )}

          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleDevLogin}
                className="w-full bg-brand-accent/20 hover:bg-brand-accent/30 text-brand-primary font-medium py-2 px-4 rounded-[8px] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <LogIn className="w-4 h-4" />
                Dev Bypass Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
