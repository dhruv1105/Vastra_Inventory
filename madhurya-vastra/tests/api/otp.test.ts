import { beforeEach, describe, expect, it, vi } from "vitest";
import { calls, reset, results } from "../helpers";
import { msg91Sender, smsEnabled, smsSender } from "@/lib/auth/sms";
import { sendOtpToStaff } from "@/lib/auth/otp";

describe("SMS sender selection", () => {
  it("development defaults to the console sender", () => {
    expect(smsSender({ NODE_ENV: "development" } as NodeJS.ProcessEnv).name).toBe("console");
  });
  it("production never uses the console sender", () => {
    expect(smsSender({ NODE_ENV: "production", SMS_PROVIDER: "console" } as NodeJS.ProcessEnv).name).toBe("none");
    expect(smsEnabled({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });
  it("msg91 needs both its key and template", () => {
    expect(smsSender({ NODE_ENV: "production", SMS_PROVIDER: "msg91", MSG91_AUTH_KEY: "k" } as NodeJS.ProcessEnv).name).toBe("none");
    expect(smsSender({ NODE_ENV: "production", SMS_PROVIDER: "msg91", MSG91_AUTH_KEY: "k", MSG91_OTP_TEMPLATE_ID: "t" } as NodeJS.ProcessEnv).name).toBe("msg91");
  });
});

describe("MSG91 driver", () => {
  it("posts the code with the template and auth key", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ type: "success" }), { status: 200 }));
    await msg91Sender("key-1", "tmpl-1", fetchImpl as unknown as typeof fetch).sendOtp("+919876543210", "123456");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.host).toBe("control.msg91.com");
    expect(url.searchParams.get("mobile")).toBe("919876543210");
    expect(url.searchParams.get("otp")).toBe("123456");
    expect(url.searchParams.get("template_id")).toBe("tmpl-1");
    expect((init.headers as Record<string, string>).authkey).toBe("key-1");
  });
  it("a provider error becomes a plain message, without the code in it", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ type: "error", message: "bad template" }), { status: 400 }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(msg91Sender("k", "t", fetchImpl as unknown as typeof fetch).sendOtp("+919876543210", "654321")).rejects.toThrow(/couldn't be sent/);
    expect(JSON.stringify(err.mock.calls)).not.toContain("654321");
    err.mockRestore();
  });
});

describe("sendOtpToStaff", () => {
  beforeEach(() => reset(null));

  it("unknown or turned-off numbers get no text", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendOtpToStaff("+919000000000", "111111");
    expect(calls[0][0]).toContain("NOT disabled");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("an active staff phone gets the code (console sender in tests' development env)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SMS_PROVIDER", "console");
    results.push({ match: "FROM users", rows: [{ "?column?": 1 }] });
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendOtpToStaff("+919876543210", "222222");
    expect(log.mock.calls[0][0]).toContain("222222");
    log.mockRestore();
    vi.unstubAllEnvs();
  });
});
