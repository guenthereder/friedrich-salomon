"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { updateNodeAction, deleteNodeAction } from "@/app/admin/actions";
import type { Node, NodeTranslation } from "@/lib/nodes";
import type { Layout, Locale } from "@/lib/constants";
type Labels = {
  title: string;
  body: string;
  layout: string;
  cover: string;
  hidden: string;
  save: string;
  delete: string;
  cancel: string;
  confirmDelete: string;
  layoutOptions: Record<Layout, string>;
};

const LAYOUTS: Layout[] = ["split-left", "split-right", "below", "image-only"];

export function NodeEditor({
  node,
  translation,
  locales,
  currentLocale,
  coverChoices,
  availableLocales,
  labels,
}: {
  node: Node;
  translation: NodeTranslation;
  locales: readonly Locale[];
  currentLocale: Locale;
  coverChoices: Node[];
  availableLocales: Locale[];
  labels: Labels;
}) {
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [title, setTitle] = useState(translation.title);
  const [body, setBody] = useState(translation.body_markdown);
  const [slug, setSlug] = useState(node.slug);
  const [layout, setLayout] = useState<Layout>(node.layout);
  const [hidden, setHidden] = useState(node.hidden === 1);
  const [coverImageId, setCoverImageId] = useState<string>(node.cover_image_id?.toString() ?? "");
  const [pending, start] = useTransition();

  const switchLocale = (l: Locale) => {
    setLocale(l);
    // Reload translations for this locale from the server.
    start(async () => {
      const res = await fetch(`/api/translation/${node.id}/${l}`).then((r) => r.json());
      setTitle(res.title ?? "");
      setBody(res.body_markdown ?? "");
    });
  };

  const [state, formAction] = useActionState(updateNodeAction.bind(null, node.id), undefined);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // Embed current locale & transient values into the form via hidden inputs below.
      }}
      className="space-y-6"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="layout" value={layout} />
      <input type="hidden" name="hidden" value={hidden ? "on" : ""} />
      <input type="hidden" name="cover_image_id" value={coverImageId} />

      {/* Locale tabs */}
      <div className="flex gap-2 border-b border-ink/10 pb-2">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchLocale(l)}
            className={`px-3 py-1 text-xs uppercase tracking-widest ${
              l === locale ? "border-b-2 border-gold text-ink" : "text-ink/40 hover:text-ink"
            }`}
          >
            {l.toUpperCase()}
            {l !== "de" && !availableLocales.includes(l) && <span className="ml-1 text-[9px] opacity-50">∅</span>}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{labels.title}</span>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 text-lg focus:border-gold focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{labels.body}</span>
        <textarea
          name="body_markdown"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 font-mono text-sm focus:border-gold focus:outline-none"
          placeholder="## …"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">Slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 font-mono text-sm focus:border-gold focus:outline-none"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{labels.layout}</span>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as Layout)}
            className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            {LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {labels.layoutOptions[l]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {node.type === "collection" && (
        <div>
          <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{labels.cover}</span>
          <select
            value={coverImageId}
            onChange={(e) => setCoverImageId(e.target.value)}
            className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="">—</option>
            {coverChoices.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} · {c.slug}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
          className="h-4 w-4 accent-gold"
        />
        <span className="text-sm">{labels.hidden}</span>
      </label>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">✓</p>}

      <div className="flex items-center justify-between pt-2">
        <Link href="/admin" className="text-xs uppercase tracking-widest text-ink/50 hover:text-ink">
          {labels.cancel}
        </Link>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (globalThis.confirm(labels.confirmDelete)) {
                start(() => deleteNodeAction(node.id));
              }
            }}
            className="rounded border border-red-300 px-4 py-2 text-xs uppercase tracking-widest text-red-700 hover:bg-red-50"
          >
            {labels.delete}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-ink px-4 py-2 text-xs uppercase tracking-widest text-parchment hover:bg-ink/90 disabled:opacity-50"
          >
            {labels.save}
          </button>
        </div>
      </div>
    </form>
  );
}
