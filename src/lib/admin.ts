import bcrypt from "bcryptjs";
import { env } from "./env";
import { getSetting, setSetting } from "./settings";

const ADMIN_HASH_KEY = "admin_password_hash";

export function getAdminUsername(): string {
  return env.ADMIN_USERNAME || getSetting("admin_username") || "admin";
}

export function getAdminPasswordHash(): string {
  if (env.ADMIN_PASSWORD_HASH) return env.ADMIN_PASSWORD_HASH;
  return getSetting(ADMIN_HASH_KEY) ?? "";
}

export function setAdminPassword(plain: string): void {
  const hash = bcrypt.hashSync(plain, 12);
  setSetting(ADMIN_HASH_KEY, hash);
}

export function verifyAdminPassword(plain: string): boolean {
  const hash = getAdminPasswordHash();
  if (!hash) return false;
  return bcrypt.compareSync(plain, hash);
}

export function isProvisioned(): boolean {
  return Boolean(env.ADMIN_PASSWORD_HASH || getSetting(ADMIN_HASH_KEY));
}
