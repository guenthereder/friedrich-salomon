function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer, got: ${v}`);
  return n;
}

export const env = {
  ADMIN_USERNAME: required("ADMIN_USERNAME", "admin"),
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH ?? "",
  JWT_SECRET: required("JWT_SECRET", "dev-only-change-me-in-production-please-32chars"),
  OTP_CODE: process.env.OTP_CODE ?? "",
  OTP_TTL_HOURS: int("OTP_TTL_HOURS", 72),
  USB_SOURCE_DIR: required("USB_SOURCE_DIR", "/Users/gue/Development/personal/salomon/usb"),
  DB_PATH: required("DB_PATH", "./data/platform.db"),
  UPLOADS_DIR: required("UPLOADS_DIR", "./public/uploads"),
  THUMBNAIL_SIZE: int("THUMBNAIL_SIZE", 600),
} as const;

export type Env = typeof env;
