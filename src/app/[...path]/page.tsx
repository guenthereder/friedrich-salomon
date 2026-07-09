import { notFound } from "next/navigation";
import { DownloadGuard } from "@/components/DownloadGuard";
import { PublicHeader } from "@/components/PublicHeader";
import { ArticleBlock } from "@/components/ArticleBlock";
import { CollectionView } from "@/components/CollectionView";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getLocale, makeT } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { getAncestors, getNodeByPath, getNodePath, getTranslation } from "@/lib/nodes";
import { imageSrcFor } from "@/lib/images";
import Link from "next/link";
import type { Layout, Locale } from "@/lib/constants";

export default async function NodePage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const node = getNodeByPath(path);
  if (!node) notFound();

  const locale = await getLocale();
  const t = makeT(locale);
  const session = await getSession();
  const tr = getTranslation(node.id, locale);
  const ancestors = getAncestors(node.id);

  return (
    <>
      <DownloadGuard />
      <PublicHeader locale={locale} isAdmin={session?.role === "admin"} logoutLabel={t("nav.logout")} />
      <main className="w-full px-4 py-6 md:px-8">
        <nav className="mb-6 text-xs uppercase tracking-widest text-ink/40">
          <Link href="/" className="hover:text-ink">{t("breadcrumb.home")}</Link>
          {ancestors.map((a) => {
            const href = `/${getNodePath(a.id).join("/")}`;
            return (
              <span key={a.id}>
                {" / "}
                <Link href={href} className="hover:text-ink">{getTranslation(a.id, locale).title || a.slug}</Link>
              </span>
            );
          })}
        </nav>

        {node.type === "collection" ? (
          <CollectionView collectionId={node.id} locale={locale} emptyLabel={t("viewer.empty")} />
        ) : (
          <ImageView
            nodeId={node.id}
            title={tr.title}
            body={tr.body_markdown}
            layout={node.layout}
            locale={locale}
          />
        )}
      </main>
    </>
  );
}

async function ImageView({
  nodeId,
  title,
  body,
  layout,
  locale: _locale,
}: {
  nodeId: number;
  title: string;
  body: string;
  layout: Layout;
  locale: Locale;
}) {
  void _locale;
  const src = await imageSrcFor(nodeId);
  if (!src) return <p className="py-12 text-center text-sm text-ink/40">—</p>;

  const hasText = body.trim().length > 0;
  const hasTitle = title.trim().length > 0;

  // image-only or no text: full-bleed centered image, optional lightbox.
  if (layout === "image-only" || !hasText) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="max-w-5xl">
          <ProtectedImage src={src} alt={title} variant="full" priority fit="natural" />
          {hasTitle && <p className="mt-4 text-center font-serif text-lg text-ink/60">{title}</p>}
        </div>
      </div>
    );
  }

  // below: image centered, text below in a readable column.
  if (layout === "below") {
    return (
      <div className="mx-auto max-w-4xl">
        {hasTitle && <h1 className="mb-4 font-serif text-3xl tracking-wide text-ink">{title}</h1>}
        <div className="flex justify-center">
          <ProtectedImage src={src} alt={title} variant="full" priority fit="natural" />
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <ArticleBlock body={body} layout="below" />
        </div>
      </div>
    );
  }

  // split-left / split-right: image and text side by side.
  const imageSide = layout === "split-right" ? "md:order-2" : "md:order-1";
  const textSide = layout === "split-right" ? "md:order-1" : "md:order-2";

  return (
    <div className="mx-auto max-w-6xl">
      {hasTitle && <h1 className="mb-6 font-serif text-3xl tracking-wide text-ink">{title}</h1>}
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className={`md:w-1/2 ${imageSide}`}>
          <ProtectedImage src={src} alt={title} variant="full" priority fit="natural" />
        </div>
        <div className={`md:w-1/2 md:pt-4 ${textSide}`}>
          <ArticleBlock body={body} layout={layout} />
        </div>
      </div>
    </div>
  );
}
