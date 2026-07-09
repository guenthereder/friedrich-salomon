import "server-only";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { UPLOADS_DIR, THUMBNAIL_SIZE } from "./constants";
import { issueImageToken } from "./image-token";
import { getNodeById } from "./nodes";

export async function ensureDirFor(file: string): Promise<void> {
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true });
}

/**
 * Save an uploaded/imported buffer to the uploads dir and generate a thumbnail.
 * Returns the source_path relative to UPLOADS_DIR (stored in node.source_path).
 */
export async function saveImage(
  buffer: Buffer,
  relName: string,
): Promise<string> {
  const ext = path.extname(relName).toLowerCase();
  const safe = relName.replace(/[^a-z0-9./_-]+/gi, "_");
  const abs = path.resolve(UPLOADS_DIR, safe);
  await ensureDirFor(abs);
  await writeFile(abs, buffer);

  // Thumbnail
  const baseName = safe.replace(/\.[^.]+$/, "");
  const thumbPath = path.resolve(UPLOADS_DIR, `${baseName}.thumb${ext}`);
  await sharp(buffer)
    .rotate()
    .resize({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, fit: "inside", withoutEnlargement: true })
    .toFile(thumbPath);

  return safe;
}

import { writeFile } from "node:fs/promises";

export type ImageSrc = { full: string; thumb: string };

export async function imageSrcFor(nodeId: number): Promise<ImageSrc | null> {
  const node = getNodeById(nodeId);
  if (!node || node.type !== "image" || !node.source_path) return null;
  const [full, thumb] = await Promise.all([
    issueImageToken(nodeId, "full"),
    issueImageToken(nodeId, "thumb"),
  ]);
  return { full: `/api/image/${full}`, thumb: `/api/image/${thumb}` };
}

/**
 * Resolve a cover image source for a collection node.
 * Falls back to the collection's first child image if no cover is set.
 */
export async function coverSrcFor(nodeId: number): Promise<ImageSrc | null> {
  const node = getNodeById(nodeId);
  if (!node) return null;
  if (node.type === "image") return imageSrcFor(nodeId);
  if (node.cover_image_id) return imageSrcFor(node.cover_image_id);
  return null;
}
