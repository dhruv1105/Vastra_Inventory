// Sending one-time codes by SMS. One small interface so a provider is a driver, not a branch in
// the auth code. Development prints the code to the server log; production needs a real
// provider (MSG91 driver comes in auth phase A6) and refuses to pretend it sent anything.

export interface SmsSender {
  sendOtp(phoneNumber: string, code: string): Promise<void>;
}

const consoleSender: SmsSender = {
  async sendOtp(phoneNumber, code) {
    // Development only — never reached in production (see smsSender()).
    console.info(`[sms:dev] code for ${phoneNumber}: ${code}`);
  },
};

const notConfigured: SmsSender = {
  async sendOtp() {
    throw new Error("Text-message codes are not set up yet. Sign in with your password.");
  },
};

/** The configured sender: SMS_PROVIDER=console (development) or a real provider (A6). */
export function smsSender(): SmsSender {
  const provider = process.env.SMS_PROVIDER ?? (process.env.NODE_ENV === "development" ? "console" : "");
  if (provider === "console" && process.env.NODE_ENV !== "production") return consoleSender;
  return notConfigured;
}

/** True when phone codes can actually be delivered (login shows the option only then). */
export function smsEnabled(): boolean {
  return smsSender() !== notConfigured;
}
