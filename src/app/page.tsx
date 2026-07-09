import { DownloadGuard } from "@/components/DownloadGuard";
import { PublicHeader } from "@/components/PublicHeader";
import { CollectionView } from "@/components/CollectionView";
import { getLocale, makeT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { getRoot } from "@/lib/nodes";

export default async function PublicHome() {
  const locale = await getLocale();
  const t = makeT(locale);
  const session = await getSession();
  const root = getRoot();

  // If there is a single root collection with a body, show it as the landing.
  // Otherwise (multiple top-level collections), show all of them as tiles.
  const showRoot = root !== null;

  return (
    <>
      <DownloadGuard />
      <PublicHeader locale={locale} isAdmin={session?.role === "admin"} logoutLabel={t("nav.logout")} />
      <main className="w-full px-4 py-6 md:px-8">
        {showRoot ? (
          <CollectionView collectionId={null} locale={locale} emptyLabel={t("viewer.empty")} />
        ) : (
          <p className="py-12 text-center text-sm text-ink/40">{t("viewer.empty")}</p>
        )}
      </main>
    </>
  );
}
