import "server-only";
import { getDb } from "./db";
import type { Node } from "./nodes";

export type TreeNode = Node & {
  children: TreeNode[];
};

export function buildTree(): TreeNode[] {
  const db = getDb();
  const all = db
    .prepare("SELECT * FROM node ORDER BY parent_id IS NULL DESC, parent_id ASC, position ASC, id ASC")
    .all() as Node[];
  const byParent = new Map<number | null, Node[]>();
  for (const n of all) {
    const arr = byParent.get(n.parent_id) ?? [];
    arr.push(n);
    byParent.set(n.parent_id, arr);
  }
  // Sort each group by position then id.
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.position - b.position || a.id - b.id);
  }
  function build(parentId: number | null): TreeNode[] {
    const arr = byParent.get(parentId) ?? [];
    return arr.map((n) => ({ ...n, children: build(n.id) }));
  }
  return build(null);
}
