import { readdir, stat, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { migrate } from "../src/lib/migrations";
import { createNode, setTranslation, slugify, uniqueSlug, getChildren, type Node } from "../src/lib/nodes";
import { COVER_SUFFIXES, IMAGE_EXTENSIONS, UPLOADS_DIR } from "../src/lib/constants";
import { getDb } from "../src/lib/db";
import { setSetting } from "../src/lib/settings";
import { rotateOtp } from "../src/lib/otp";
import { env } from "../src/lib/env";

const SRC = env.USB_SOURCE_DIR;

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

function isImage(name: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(name).toLowerCase());
}

function isDuplicate(name: string): boolean {
  // Skip " a." variant files (e.g. "1.jpg a.jpg" is a duplicate of "1.jpg").
  return / a\.[^.]+$/.test(name);
}

function isCover(name: string): boolean {
  const lower = name.toLowerCase();
  return COVER_SUFFIXES.some((s) => lower === s || lower.endsWith("/" + s));
}

async function importDir(absDir: string, parentId: number | null, depth = 0): Promise<Node | null> {
  const entries = await readdir(absDir, { withFileTypes: true });
  const dirName = path.basename(absDir);
  const slug = uniqueSlug(parentId, slugify(dirName) || "sammlung");
  const collection = createNode({ parent_id: parentId, type: "collection", slug });
  setTranslation(collection.id, "de", dirName, "");

  let coverImageId: number | null = null;

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(absDir, entry.name);

    if (entry.isDirectory()) {
      await importDir(abs, collection.id, depth + 1);
    } else if (entry.isFile() && isImage(entry.name)) {
      // Skip cover/description images as standalone image nodes — they're used as covers.
      if (isCover(entry.name)) continue;
      // Skip " a." duplicate variants.
      if (isDuplicate(entry.name)) continue;

      const imageNode = await importImage(abs, entry.name, collection.id);
      if (imageNode && coverImageId === null) {
        coverImageId = imageNode.id;
      }
    }
  }

  // Prefer the dedicated Beschreibung-Zettel as the cover if one exists in this dir.
  for (const s of COVER_SUFFIXES) {
    const coverPath = path.join(absDir, s);
    if (await exists(coverPath)) {
      const coverNode = await importImage(coverPath, s, collection.id, /*asCover*/ true);
      if (coverNode) {
        coverImageId = coverNode.id;
        // Re-parent: keep it but it's the cover. Mark it hidden so it doesn't double in the grid.
        getDb().prepare("UPDATE node SET hidden = 1 WHERE id = ?").run(coverNode.id);
      }
      break;
    }
  }

  if (coverImageId !== null) {
    getDb().prepare("UPDATE node SET cover_image_id = ? WHERE id = ?").run(coverImageId, collection.id);
  }

  // If the collection has a Beschreibung text file (.txt) use it as body.
  const txtPath = path.join(absDir, "beschreibung.txt");
  if (await exists(txtPath)) {
    const { readFile } = await import("node:fs/promises");
    const body = (await readFile(txtPath, "utf8")).trim();
    if (body) setTranslation(collection.id, "de", dirName, body);
  }

  return collection;
}

async function importImage(
  abs: string,
  name: string,
  parentId: number | null,
  asCover = false,
): Promise<Node | null> {
  const ext = path.extname(name).toLowerCase();
  const base = slugify(name.replace(/\.[^.]+$/, "")) || "bild";
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const relName = `${base}-${stamp}${ext}`;
  const dest = path.resolve(UPLOADS_DIR, relName);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(abs, dest);

  // Thumbnail
  const thumbPath = dest.replace(/\.[^.]+$/, ".thumb" + ext);
  try {
    await sharp(dest)
      .rotate()
      .resize({ width: 600, height: 600, fit: "inside", withoutEnlargement: true })
      .toFile(thumbPath);
  } catch (e) {
    console.warn(`thumbnail failed for ${name}:`, (e as Error).message);
  }

  const slug = uniqueSlug(parentId, base);
  const node = createNode({ parent_id: parentId, type: "image", slug, source_path: relName });
  setTranslation(node.id, "de", asCover ? name.replace(/\.[^.]+$/, "") : name.replace(/\.[^.]+$/, ""), "");
  return node;
}

async function main() {
  migrate();

  if (!(await exists(SRC))) {
    console.error(`Source dir does not exist: ${SRC}`);
    process.exit(1);
  }

  console.log(`Importing from ${SRC} → ${UPLOADS_DIR}`);

  const entries = await readdir(SRC, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(SRC, entry.name);
    if (entry.isDirectory()) {
      const col = await importDir(abs, null);
      if (col) console.log(`✓ ${entry.name} → collection #${col.id}`);
    } else if (entry.isFile() && isImage(entry.name) && !isCover(entry.name)) {
      const img = await importImage(abs, entry.name, null);
      if (img) console.log(`✓ ${entry.name} → image #${img.id}`);
    }
  }

  // Seed an initial OTP if none exists.
  const code = rotateOtp();
  console.log(`\nInitial viewer OTP: ${code}`);
  console.log(`Login link: http://localhost:3000/login?prefill=${code}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
