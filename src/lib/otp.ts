import { randomBytes } from "node:crypto";
import { getDb } from "./db";
import { OTP_TTL_HOURS } from "./constants";
import { env } from "./env";
import { getSetting, setSetting } from "./settings";

const OTP_KEY = "otp_code";

export type OtpRecord = {
  code: string;
  created_at: string;
  expires_at: string;
  revoked: 0 | 1;
};

export function getActiveOtp(): OtpRecord | null {
  // Env-defined OTP takes precedence (no expiry, not revocable from dashboard).
  if (env.OTP_CODE) {
    return {
      code: env.OTP_CODE.trim().toLowerCase(),
      created_at: "",
      expires_at: "9999-12-31 23:59:59",
      revoked: 0,
    };
  }
  const stored = getSetting(OTP_KEY);
  if (!stored) return null;
  const rec = getDb()
    .prepare("SELECT * FROM otp_code WHERE code = ? ORDER BY id DESC LIMIT 1")
    .get(stored) as OtpRecord | undefined;
  return rec ?? null;
}

export function rotateOtp(ttlHours = OTP_TTL_HOURS): string {
  // A rotated code lives in the DB; the env override no longer applies once
  // an admin explicitly rotates. To re-enable the env code, unset OTP_CODE
  // in .env OR restart with it set and no DB code present.
  const code = randomBytes(5).toString("hex");
  return setOtpCode(code, ttlHours);
}

export function setOtpCode(custom: string, ttlHours = OTP_TTL_HOURS): string {
  const code = custom.trim().toLowerCase();
  const now = new Date();
  const expires = new Date(now.getTime() + ttlHours * 3600_000);
  getDb()
    .prepare(
      "INSERT INTO otp_code (code, expires_at) VALUES (?, ?)",
    )
    .run(code, expires.toISOString().replace("T", " ").replace(/\.\d+Z$/, ""));
  setSetting(OTP_KEY, code);
  return code;
}

export function verifyOtp(code: string): boolean {
  const rec = getActiveOtp();
  if (!rec || rec.revoked) return false;
  if (rec.code !== code.trim().toLowerCase()) return false;
  if (new Date(rec.expires_at.replace(" ", "T") + "Z").getTime() < Date.now()) return false;
  return true;
}

export function isEnvOtp(): boolean {
  return Boolean(env.OTP_CODE);
}

export function revokeOtp(): void {
  // Revoking an env-defined OTP has no effect (it reappears on next read).
  if (env.OTP_CODE) return;
  const rec = getActiveOtp();
  if (!rec) return;
  getDb().prepare("UPDATE otp_code SET revoked = 1 WHERE code = ?").run(rec.code);
  setSetting(OTP_KEY, "");
}
