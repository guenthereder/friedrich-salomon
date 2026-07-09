import { getDb } from "./db";
import { DEFAULT_LAYOUT, type Layout, type Locale, LOCALES } from "./constants";

export type NodeType = "collection" | "image";

export type Node = {
  id: number;
  parent_id: number | null;
  type: NodeType;
  slug: string;
  position: number;
  cover_image_id: number | null;
  layout: Layout;
  source_path: string | null;
  hidden: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type NodeTranslation = {
  node_id: number;
  locale: Locale;
  title: string;
  body_markdown: string;
  updated_at: string;
};

export type NodeWithTranslation = Node & {
  title: string;
  body_markdown: string;
  locale: Locale;
};

export function getNodeById(id: number): Node | null {
  return (getDb().prepare("SELECT * FROM node WHERE id = ?").get(id) as Node | undefined) ?? null;
}

export function getNodeBySlug(parentId: number | null, slug: string): Node | null {
  return (
    (getDb()
      .prepare("SELECT * FROM node WHERE parent_id IS ? AND slug = ?")
      .get(parentId ?? null, slug) as Node | undefined) ?? null
  );
}

export function getNodeByPath(path: string[]): Node | null {
  const db = getDb();
  let parentId: number | null = null;
  let node: Node | null = null;
  for (const slug of path) {
    node = (db
      .prepare("SELECT * FROM node WHERE parent_id IS ? AND slug = ?")
      .get(parentId, slug) as Node | undefined) ?? null;
    if (!node) return null;
    parentId = node.id;
  }
  return node;
}

export function getChildren(parentId: number | null, opts?: { includeHidden?: boolean }): Node[] {
  const where = opts?.includeHidden ? "" : "AND hidden = 0";
  return getDb()
    .prepare(
      `SELECT * FROM node WHERE parent_id IS ? ${where} ORDER BY position ASC, id ASC`,
    )
    .all(parentId ?? null) as Node[];
}

export function getRoot(): Node | null {
  return (
    (getDb()
      .prepare("SELECT * FROM node WHERE parent_id IS NULL ORDER BY position ASC, id ASC LIMIT 1")
      .get() as Node | undefined) ?? null
  );
}

export function getAncestors(id: number): Node[] {
  const db = getDb();
  const out: Node[] = [];
  let current: Node | null = getNodeById(id);
  while (current && current.parent_id != null) {
    const parent = (db.prepare("SELECT * FROM node WHERE id = ?").get(current.parent_id) as Node | undefined) ?? null;
    if (!parent) break;
    out.unshift(parent);
    current = parent;
  }
  return out;
}

export function getTranslation(
  nodeId: number,
  locale: Locale,
): NodeTranslation {
  const row = getDb()
    .prepare("SELECT * FROM node_translation WHERE node_id = ? AND locale = ?")
    .get(nodeId, locale) as NodeTranslation | undefined;
  if (row) return row;
  // Fallback to default locale, then empty.
  if (locale !== "de") {
    const fallback = getDb()
      .prepare("SELECT * FROM node_translation WHERE node_id = ? AND locale = 'de'")
      .get(nodeId) as NodeTranslation | undefined;
    if (fallback) return { ...fallback, locale };
  }
  return { node_id: nodeId, locale, title: "", body_markdown: "", updated_at: "" };
}

export function listTranslations(nodeId: number): NodeTranslation[] {
  return getDb()
    .prepare("SELECT * FROM node_translation WHERE node_id = ?")
    .all(nodeId) as NodeTranslation[];
}

export type NodeInput = {
  parent_id?: number | null;
  type: NodeType;
  slug: string;
  position?: number;
  cover_image_id?: number | null;
  layout?: Layout;
  source_path?: string | null;
  hidden?: boolean;
};

export function createNode(input: NodeInput): Node {
  const db = getDb();
  const position =
    input.position ??
    (db
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM node WHERE parent_id IS ?")
      .get(input.parent_id ?? null) as { p: number }).p;
  const layout = input.layout ?? DEFAULT_LAYOUT;
  const result = db
    .prepare(
      `INSERT INTO node (parent_id, type, slug, position, cover_image_id, layout, source_path, hidden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.parent_id ?? null,
      input.type,
      input.slug,
      position,
      input.cover_image_id ?? null,
      layout,
      input.source_path ?? null,
      input.hidden ? 1 : 0,
    );
  return getNodeById(Number(result.lastInsertRowid))!;
}

export function updateNode(
  id: number,
  patch: Partial<
    Pick<Node, "slug" | "position" | "cover_image_id" | "layout" | "source_path" | "parent_id"> & { hidden: boolean }
  >,
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    if (k === "hidden") values.push(v ? 1 : 0);
    else if (v === null) values.push(null);
    else if (typeof v === "number") values.push(v);
    else values.push(v as string);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  values.push(id);
  db.prepare(`UPDATE node SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

export function setTranslation(
  nodeId: number,
  locale: Locale,
  title: string,
  bodyMarkdown: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO node_translation (node_id, locale, title, body_markdown, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(node_id, locale) DO UPDATE SET
         title = excluded.title,
         body_markdown = excluded.body_markdown,
         updated_at = excluded.updated_at`,
    )
    .run(nodeId, locale, title, bodyMarkdown);
}

export function deleteNode(id: number): void {
  getDb().prepare("DELETE FROM node WHERE id = ?").run(id);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "node";
}

export function uniqueSlug(parentId: number | null, base: string, exceptId?: number): string {
  const db = getDb();
  let slug = base;
  let i = 2;
  while (true) {
    const existing = db
      .prepare(
        "SELECT id FROM node WHERE parent_id IS ? AND slug = ? AND id IS NOT ?",
      )
      .get(parentId ?? null, slug, exceptId ?? -1) as { id: number } | undefined;
    if (!existing) return slug;
    slug = `${base}-${i++}`;
  }
}

export { LOCALES };

export function getNodePath(id: number): string[] {
  const db = getDb();
  const out: string[] = [];
  let current: Node | null = getNodeById(id);
  while (current) {
    out.unshift(current.slug);
    if (current.parent_id == null) break;
    current = (db.prepare("SELECT * FROM node WHERE id = ?").get(current.parent_id) as Node | undefined) ?? null;
  }
  return out;
}
