import { getLocale, makeT } from "@/lib/i18n";
import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const locale = await getLocale();
  const t = makeT(locale);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl tracking-wide">Friedrich Salomon</h1>
        <p className="mb-8 text-center text-sm uppercase tracking-[0.2em] text-ink/60">
          {t("admin.login.title")}
        </p>
        <AdminLoginForm locale={locale} />
      </div>
    </main>
  );
}
