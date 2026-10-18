// Sending one-time codes by SMS. One small interface; each provider is a driver selected by
// SMS_PROVIDER, never a branch inside the auth code.
//   console  development only — prints the code to the server log
//   msg91    MSG91 OTP API (India). Needs MSG91_AUTH_KEY and a DLT-approved MSG91_OTP_TEMPLATE_ID.
// Anything else (or missing keys) → not configured: the login screen hides the option and the
// server refuses to pretend a code was sent.

export interface SmsSender {
  readonly name: string;
  sendOtp(phoneNumber: string, code: string): Promise<void>;
}

const consoleSender: SmsSender = {
  name: "console",
  async sendOtp(phoneNumber, code) {
    console.info(`[sms:dev] code for ${phoneNumber}: ${code}`);
  },
};

const notConfigured: SmsSender = {
  name: "none",
  async sendOtp() {
    throw new Error("Text-message codes are not set up yet. Sign in with your password.");
  },
};

/** MSG91 OTP API v5: the code we generate is sent with the account's approved OTP template. */
export function msg91Sender(authKey: string, templateId: string, fetchImpl: typeof fetch = fetch): SmsSender {
  return {
    name: "msg91",
    async sendOtp(phoneNumber, code) {
      const mobile = phoneNumber.replace(/^\+/, "");
      const url = new URL("https://control.msg91.com/api/v5/otp");
      url.searchParams.set("template_id", templateId);
      url.searchParams.set("mobile", mobile);
      url.searchParams.set("otp", code);
      url.searchParams.set("otp_expiry", "5");
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { authkey: authKey, "content-type": "application/json", accept: "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
      if (!res.ok || body.type === "error") {
        // Never log the code or the full number.
        console.error(`[sms:msg91] send failed for …${mobile.slice(-4)}: ${res.status} ${body.message ?? ""}`);
        throw new Error("The text message couldn't be sent. Try again in a minute, or sign in with your password.");
      }
    },
  };
}

/** The configured sender. */
export function smsSender(env: NodeJS.ProcessEnv = process.env): SmsSender {
  const provider = env.SMS_PROVIDER ?? (env.NODE_ENV === "development" ? "console" : "");
  if (provider === "console" && env.NODE_ENV !== "production") return consoleSender;
  if (provider === "msg91" && env.MSG91_AUTH_KEY && env.MSG91_OTP_TEMPLATE_ID) return msg91Sender(env.MSG91_AUTH_KEY, env.MSG91_OTP_TEMPLATE_ID);
  return notConfigured;
}

/** True when codes can actually be delivered (the login screen offers the option only then). */
export function smsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return smsSender(env).name !== "none";
}
