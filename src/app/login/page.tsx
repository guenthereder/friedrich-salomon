import { DownloadGuard } from "@/components/DownloadGuard";
import { getLocale, makeT } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const { prefill } = await searchParams;
  const locale = await getLocale();
  const t = makeT(locale);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <DownloadGuard />
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl tracking-wide">Friedrich Salomon</h1>
        <p className="mb-8 text-center text-sm uppercase tracking-[0.2em] text-ink/60">
          {t("login.title")}
        </p>
        <LoginForm locale={locale} prefill={prefill} />
        <div className="mt-6 text-center">
          <a href="/admin/login" className="text-xs uppercase tracking-widest text-ink/40 hover:text-ink">
            {t("login.admin.link")}
          </a>
        </div>
      </div>
    </main>
  );
}
