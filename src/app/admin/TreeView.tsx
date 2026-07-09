"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createCollection,
  createImageNode,
  deleteNodeAction,
  moveNode,
} from "@/app/admin/actions";
import type { Locale } from "@/lib/i18n-dict";
import type { TreeNode } from "@/lib/tree";

const DICT: Record<Locale, {
  newCol: string; newImg: string; delete: string; confirmDelete: string;
  moveUp: string; moveDown: string; collection: string; image: string; hidden: string;
}> = {
  de: { newCol: "Neue Sammlung", newImg: "Neues Bild", delete: "Löschen", confirmDelete: "Wirklich löschen?", moveUp: "↑", moveDown: "↓", collection: "Sammlung", image: "Bild", hidden: "verborgen" },
  en: { newCol: "New collection", newImg: "New image", delete: "Delete", confirmDelete: "Really delete?", moveUp: "↑", moveDown: "↓", collection: "Collection", image: "Image", hidden: "hidden" },
};

export function TreeView({
  tree,
  locale,
  emptyLabel,
  thumbs,
}: {
  tree: TreeNode[];
  locale: Locale;
  emptyLabel: string;
  thumbs: Record<number, string>;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set(tree.map((n) => n.id)));
  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (tree.length === 0) {
    return <p className="text-sm text-ink/50">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-1">
      {tree.map((node) => (
        <NodeRow
          key={node.id}
          node={node}
          locale={locale}
          open={open}
          toggle={toggle}
          depth={0}
          thumbs={thumbs}
        />
      ))}
    </ul>
  );
}

function NodeRow({
  node,
  locale,
  open,
  toggle,
  depth,
  thumbs,
}: {
  node: TreeNode;
  locale: Locale;
  open: Set<number>;
  toggle: (id: number) => void;
  depth: number;
  thumbs: Record<number, string>;
}) {
  const s = DICT[locale];
  const [pending, start] = useTransition();
  const isOpen = open.has(node.id);
  const hasChildren = node.children.length > 0;
  const thumb = thumbs[node.id];

  return (
    <li>
      <div
        className="flex items-start gap-2 py-1"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        {hasChildren ? (
          <button onClick={() => toggle(node.id)} className="w-4 shrink-0 pt-1 text-ink/40 hover:text-ink" aria-label="toggle">
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {node.type === "image" && thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-[250px] w-[250px] shrink-0 rounded-sm object-cover"
            draggable={false}
          />
        ) : (
          <span className="flex h-[250px] w-[250px] shrink-0 items-center justify-center rounded-sm bg-ink/5 text-4xl text-ink/30">
            {node.type === "collection" ? "▣" : "▤"}
          </span>
        )}
        <Link
          href={`/admin/${node.id}`}
          className="flex-1 truncate pt-1 text-sm hover:underline"
        >
          <span className="mr-2 text-[10px] uppercase tracking-widest text-ink/40">
            {node.type === "collection" ? s.collection : s.image}
          </span>
          #{node.id} · {node.slug}
          {node.hidden === 1 && <span className="ml-2 text-[10px] text-ink/40">({s.hidden})</span>}
        </Link>
        <div className="flex shrink-0 items-center gap-1 pt-1">
          <button
            disabled={pending}
            onClick={() => start(() => moveNode(node.id, "up"))}
            className="px-1 text-ink/40 hover:text-ink"
            title={s.moveUp}
          >
            ↑
          </button>
          <button
            disabled={pending}
            onClick={() => start(() => moveNode(node.id, "down"))}
            className="px-1 text-ink/40 hover:text-ink"
            title={s.moveDown}
          >
            ↓
          </button>
          <DeleteButton id={node.id} label={s.delete} confirm={s.confirmDelete} />
        </div>
      </div>
      {hasChildren && isOpen && (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              locale={locale}
              open={open}
              toggle={toggle}
              depth={depth + 1}
              thumbs={thumbs}
            />
          ))}
        </ul>
      )}
      {isOpen && (
        <div className="flex gap-2 py-1" style={{ paddingLeft: `${(depth + 1) * 1.25}rem` }}>
          <CreateChild parentId={node.id} locale={locale} />
          <UploadChild parentId={node.id} locale={locale} />
        </div>
      )}
    </li>
  );
}

function DeleteButton({ id, label, confirm }: { id: number; label: string; confirm: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (globalThis.confirm(confirm)) start(() => deleteNodeAction(id));
      }}
      className="px-1 text-ink/40 hover:text-red-700"
      title={label}
    >
      ✕
    </button>
  );
}

function CreateChild({ parentId, locale }: { parentId: number; locale: Locale }) {
  const s = DICT[locale];
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        start(async () => {
          await createCollection(parentId, name.trim());
          setName("");
        });
      }}
      className="flex items-center gap-1"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={s.newCol}
        className="w-40 rounded border border-ink/15 bg-white/50 px-2 py-1 text-xs focus:border-gold focus:outline-none"
      />
      <button disabled={pending} className="text-xs text-ink/60 hover:text-ink">
        +
      </button>
    </form>
  );
}

function UploadChild({ parentId, locale }: { parentId: number; locale: Locale }) {
  const s = DICT[locale];
  const [pending, start] = useTransition();
  return (
    <label className="cursor-pointer text-xs text-ink/60 hover:text-ink">
      {s.newImg}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          start(() => createImageNode(parentId, file));
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function CreateRoot({ locale }: { locale: Locale }) {
  const s = DICT[locale];
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        start(async () => {
          await createCollection(null, name.trim());
          setName("");
        });
      }}
      className="flex items-center gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={s.newCol}
        className="w-48 rounded border border-ink/15 bg-white/50 px-2 py-1 text-xs focus:border-gold focus:outline-none"
      />
      <button
        disabled={pending}
        className="rounded bg-ink px-3 py-1 text-xs uppercase tracking-widest text-parchment hover:bg-ink/90 disabled:opacity-50"
      >
        +
      </button>
    </form>
  );
}
