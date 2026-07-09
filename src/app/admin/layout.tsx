import Link from "next/link";
import { DownloadGuard } from "@/components/DownloadGuard";
import { getLocale, makeT, LOCALES } from "@/lib/i18n";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = makeT(locale);
  return (
    <div className="min-h-screen">
      <DownloadGuard />
      <header className="border-b border-ink/10 bg-parchment/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-wide">Friedrich Salomon</span>
            <nav className="flex gap-4 text-xs uppercase tracking-widest">
              <Link href="/admin" className="text-ink/70 hover:text-ink">{t("admin.tree")}</Link>
              <Link href="/" className="text-ink/70 hover:text-ink">{t("nav.gallery")}</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {LOCALES.map((l) => (
                <a key={l} href={`/api/locale/${l}`} className={`text-xs uppercase tracking-widest ${l === locale ? "text-ink" : "text-ink/40 hover:text-ink"}`}>
                  {l.toUpperCase()}
                </a>
              ))}
            </div>
            <LogoutButton label={t("nav.logout")} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
