import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./constants";

export { DEFAULT_LOCALE, LOCALES };
export type { Locale };
export { t, makeT } from "./i18n-dict";
export type { Translate } from "./i18n-dict";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get("fs_locale")?.value;
  return (LOCALES as readonly string[]).includes(raw ?? "") ? (raw as Locale) : DEFAULT_LOCALE;
}
