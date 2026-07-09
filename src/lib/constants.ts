import path from "node:path";
import { env } from "./env";

export const UPLOADS_DIR = path.resolve(process.cwd(), env.UPLOADS_DIR);
export const DATA_DIR = path.resolve(process.cwd(), "data");
export const DB_PATH = env.DB_PATH.startsWith("/")
  ? env.DB_PATH
  : path.resolve(process.cwd(), env.DB_PATH);

export const THUMBNAIL_SIZE = env.THUMBNAIL_SIZE;

export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "fs_locale";

export const OTP_TTL_HOURS = env.OTP_TTL_HOURS;

export const JWT_COOKIE = "fs_session";
export const JWT_ALG = "HS256";
export const VIEWER_TTL_SECONDS = OTP_TTL_HOURS * 60 * 60;
export const ADMIN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export const COVER_SUFFIXES = [
  "beschreibung-zettel.jpeg",
  "beschreibung-zettel.jpg",
  "cover.jpg",
  "cover.jpeg",
];

export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export const LAYOUTS = [
  "split-left",
  "split-right",
  "below",
  "image-only",
] as const;
export type Layout = (typeof LAYOUTS)[number];
export const DEFAULT_LAYOUT: Layout = "below";
