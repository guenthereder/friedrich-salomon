import { notFound } from "next/navigation";
import { getLocale, makeT, LOCALES, type Locale } from "@/lib/i18n";
import { getAncestors, getChildren, getNodeById, getTranslation, listTranslations } from "@/lib/nodes";
import { NodeEditor } from "./NodeEditor";

export default async function NodeEditPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const { nodeId } = await params;
  const id = Number(nodeId);
  const node = getNodeById(id);
  if (!node) notFound();

  const locale = await getLocale();
  const t = makeT(locale);
  const translation = getTranslation(id, locale);
  const translations = listTranslations(id);
  const children = getChildren(id, { includeHidden: true }).filter((c) => c.type === "image");
  const ancestors = getAncestors(id);
  const coverChoices = node.type === "collection" ? children : [];

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-xs uppercase tracking-widest text-ink/50">
        <a href="/admin" className="hover:text-ink">{t("breadcrumb.home")}</a>
        {ancestors.map((a) => (
          <span key={a.id}>
            {" / "}
            <a href={`/admin/${a.id}`} className="hover:text-ink">#{a.id}</a>
          </span>
        ))}
        <span className="text-ink"> / #{node.id}</span>
      </nav>

      <NodeEditor
        node={node}
        translation={translation}
        locales={LOCALES as readonly Locale[]}
        currentLocale={locale}
        coverChoices={coverChoices}
        availableLocales={translations.map((tr) => tr.locale)}
        labels={{
          title: t("admin.title.label"),
          body: t("admin.body.label"),
          layout: t("admin.layout.label"),
          cover: t("admin.cover.label"),
          hidden: t("admin.hidden"),
          save: t("admin.save"),
          delete: t("admin.delete"),
          cancel: t("admin.cancel"),
          confirmDelete: t("admin.delete") + "?",
          layoutOptions: {
            "split-left": t("layout.split-left"),
            "split-right": t("layout.split-right"),
            below: t("layout.below"),
            "image-only": t("layout.image-only"),
          },
        }}
      />
    </div>
  );
}
