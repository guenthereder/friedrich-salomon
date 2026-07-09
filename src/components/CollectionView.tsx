import { ArticleBlock } from "./ArticleBlock";
import { JustifiedGallery } from "./JustifiedGallery";
import { getTranslation } from "@/lib/nodes";
import { buildLayoutItems, computeResponsiveLayout } from "@/lib/layout";
import type { Locale } from "@/lib/constants";

export async function CollectionView({
  collectionId,
  locale,
  emptyLabel,
}: {
  collectionId: number | null;
  locale: Locale;
  emptyLabel: string;
}) {
  const tr = collectionId !== null ? getTranslation(collectionId, locale) : null;
  const items = await buildLayoutItems(collectionId, locale);
  const layout = await computeResponsiveLayout(items);

  return (
    <div>
      {tr?.title && (
        <h1 className="mb-2 font-serif text-3xl tracking-wide text-ink md:text-4xl">{tr.title}</h1>
      )}
      {tr?.body_markdown && (
        <div className="mb-8 max-w-2xl">
          <ArticleBlock body={tr.body_markdown} layout="below" />
        </div>
      )}
      <JustifiedGallery layout={layout} emptyLabel={emptyLabel} />
    </div>
  );
}
