import Link from "next/link";
import { LOCALES, type Locale } from "@/lib/i18n";
import { LogoutButton } from "./LogoutButton";

export function PublicHeader({
  locale,
  isAdmin,
  logoutLabel,
}: {
  locale: Locale;
  isAdmin: boolean;
  logoutLabel: string;
}) {
  return (
    <header className="border-b border-ink/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          Friedrich Salomon
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {LOCALES.map((l) => (
              <a
                key={l}
                href={`/api/locale/${l}`}
                className={`text-xs uppercase tracking-widest ${
                  l === locale ? "text-ink" : "text-ink/40 hover:text-ink"
                }`}
              >
                {l.toUpperCase()}
              </a>
            ))}
          </div>
          {isAdmin && (
            <>
              <Link href="/admin" className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink">
                Verwaltung
              </Link>
              <LogoutButton label={logoutLabel} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
