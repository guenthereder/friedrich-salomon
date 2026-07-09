"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  createNode,
  deleteNode,
  getNodeById,
  setTranslation,
  slugify,
  uniqueSlug,
  updateNode,
} from "@/lib/nodes";
import { saveImage } from "@/lib/images";
import { rotateOtp, revokeOtp, setOtpCode } from "@/lib/otp";
import { DEFAULT_LAYOUT, type Layout, type Locale } from "@/lib/constants";
import { getLocale } from "@/lib/i18n";

export type EditState = { error?: string; ok?: boolean } | undefined;

export async function createCollection(parentId: number | null, title: string): Promise<void> {
  const locale = await getLocale();
  const slug = uniqueSlug(parentId, slugify(title) || "sammlung");
  const node = createNode({ parent_id: parentId, type: "collection", slug });
  setTranslation(node.id, locale, title, "");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function createImageNode(parentId: number | null, file: File, title?: string): Promise<void> {
  const locale = await getLocale();
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  const buffer = Buffer.from(await file.arrayBuffer());
  const base = slugify(title || file.name.replace(/\.[^.]+$/, "")) || "bild";
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "jpg");
  const stamp = Date.now().toString(36);
  const relName = `${base}-${stamp}${ext}`;
  const sourcePath = await saveImage(buffer, relName);
  const slug = uniqueSlug(parentId, base);
  const node = createNode({ parent_id: parentId, type: "image", slug, source_path: sourcePath });
  setTranslation(node.id, locale, title ?? file.name, "");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function updateNodeAction(
  id: number,
  prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const locale = (formData.get("locale") as Locale) ?? (await getLocale());
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body_markdown") ?? "");
  const slug = String(formData.get("slug") ?? "").trim();
  const layout = String(formData.get("layout") ?? DEFAULT_LAYOUT) as Layout;
  const hidden = formData.get("hidden") === "on";
  const coverRaw = String(formData.get("cover_image_id") ?? "");

  const node = getNodeById(id);
  if (!node) return { error: "not found" };

  const finalSlug = slug && slug !== node.slug ? uniqueSlug(node.parent_id, slugify(slug), id) : node.slug;
  const coverImageId = coverRaw === "" ? null : Number(coverRaw) || null;

  updateNode(id, {
    slug: finalSlug,
    layout,
    hidden,
    cover_image_id: coverImageId,
    parent_id: node.parent_id,
  });
  setTranslation(id, locale, title, body);

  revalidatePath("/admin");
  revalidatePath(`/`, "layout");
  revalidatePath(`/admin/${id}`);
  return { ok: true };
}

export async function deleteNodeAction(id: number): Promise<void> {
  deleteNode(id);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function moveNode(id: number, direction: "up" | "down"): Promise<void> {
  const node = getNodeById(id);
  if (!node) return;
  const db = getDb();
  const sib = db
    .prepare(
      direction === "up"
        ? "SELECT id, position FROM node WHERE parent_id IS ? AND position < ? ORDER BY position DESC LIMIT 1"
        : "SELECT id, position FROM node WHERE parent_id IS ? AND position > ? ORDER BY position ASC LIMIT 1",
    )
    .get(node.parent_id ?? null, node.position) as { id: number; position: number } | undefined;
  if (!sib) return;
  db.prepare("UPDATE node SET position = ? WHERE id = ?").run(sib.position, id);
  db.prepare("UPDATE node SET position = ? WHERE id = ?").run(node.position, sib.id);
  revalidatePath("/admin");
}

export async function rotateOtpAction(): Promise<void> {
  rotateOtp();
  revalidatePath("/admin");
}

export async function setOtpAction(code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("empty code");
  setOtpCode(trimmed);
  revalidatePath("/admin");
}

export async function revokeOtpAction(): Promise<void> {
  revokeOtp();
  revalidatePath("/admin");
}
