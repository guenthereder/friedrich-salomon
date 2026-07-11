import "server-only";
import sharp from "sharp";
import path from "node:path";
import { UPLOADS_DIR } from "./constants";
import { getNodeById } from "./nodes";
import { imageSrcFor, coverSrcFor, type ImageSrc } from "./images";

export type ImageDimensions = {
  width: number;
  height: number;
  aspect: number;
};

const dimCache = new Map<string, ImageDimensions>();

export async function getImageDimensions(sourcePath: string): Promise<ImageDimensions> {
  const cached = dimCache.get(sourcePath);
  if (cached) return cached;

  const abs = path.resolve(UPLOADS_DIR, sourcePath);
  try {
    const meta = await sharp(abs).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const dim = { width: w, height: h, aspect: w / h };
    dimCache.set(sourcePath, dim);
    return dim;
  } catch {
    return { width: 1, height: 1, aspect: 1 };
  }
}

export type LayoutItem = {
  nodeId: number;
  type: "image" | "collection" | "text";
  title: string;
  body: string;
  src: ImageSrc | null;
  href: string;
  dims: ImageDimensions | null;
};

// ─── Placed item ───

export type PlacedItem = {
  nodeId: number;
  type: "image" | "collection" | "text";
  title: string;
  body: string;
  src: ImageSrc | null;
  href: string;
  isText: boolean;
  textTitle?: string;
  textBody?: string;
  // Position + size in the layout (px, relative to container)
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ComputedLayout = {
  items: PlacedItem[];
  containerWidth: number;
  totalHeight: number;
};

// ─── Masonry packing algorithm ───

type QueueItem = {
  dims: ImageDimensions;
  item: LayoutItem;
  isText: boolean;
  textTitle?: string;
  textBody?: string;
};

/** Column count scales with container width, matching the BREAKPOINTS below. */
function columnsForContainerWidth(containerWidth: number): number {
  if (containerWidth < 400) return 1;
  if (containerWidth < 560) return 2;
  if (containerWidth < 860) return 3;
  if (containerWidth < 1200) return 4;
  if (containerWidth < 1700) return 5;
  if (containerWidth < 2200) return 6;
  return 7;
}

/**
 * Masonry packing with occasional column spans.
 *
 * The canvas is split into fixed-width columns. Each item is placed into
 * whichever column (or pair of adjacent columns) is currently shortest,
 * then sized from its *real* aspect ratio at that width — so a portrait
 * image, kept to a single column, renders tall, while a distinctly
 * landscape image spans two columns and renders wide. Because every item
 * is placed by tracking column heights directly, placements can never
 * overlap (unlike a free-rect guillotine packer, which can drift out of
 * sync once items grow taller than the row that "claimed" the space below
 * them).
 */
export function computeBspLayout(items: LayoutItem[], containerWidth: number, gap = 12): ComputedLayout {
  // Build the placement queue — assign aspect ratios to text blocks.
  const queue: QueueItem[] = [];

  for (const item of items) {
    const hasText = item.body.trim().length > 0;
    const isTextOnly = item.type === "text" || (hasText && !item.src);

    if (isTextOnly) {
      // Text-only node: assign a wide aspect ratio.
      queue.push({
        dims: { width: 480, height: 300, aspect: 1.6 },
        item,
        isText: true,
        textTitle: item.title,
        textBody: item.body,
      });
      continue;
    }

    if (!item.src || !item.dims) continue;

    queue.push({
      dims: item.dims,
      item,
      isText: false,
    });

    // If the image has accompanying text, push a text block after it.
    if (hasText) {
      queue.push({
        dims: { width: 480, height: 300, aspect: 1.6 },
        item,
        isText: true,
        textTitle: item.title,
        textBody: item.body,
      });
    }
  }

  if (queue.length === 0) {
    return { items: [], containerWidth, totalHeight: 0 };
  }

  const columns = columnsForContainerWidth(containerWidth);
  const colWidth = (containerWidth - gap * (columns - 1)) / columns;
  const colHeights = new Array(columns).fill(0) as number[];
  const placed: PlacedItem[] = [];

  for (const qi of queue) {
    const aspect = qi.dims.aspect;
    // Distinctly landscape images/text cards span two columns so they read
    // as genuinely wider tiles; portraits and near-square images stay
    // single-column, which — at a fixed column width — renders them taller.
    const span = Math.min(aspect >= 1.35 && columns >= 2 ? 2 : 1, columns);

    // Find the span-wide slot with the lowest starting height (classic
    // masonry balancing), preferring the leftmost tie.
    let bestStart = 0;
    let bestMaxHeight = Infinity;
    for (let start = 0; start <= columns - span; start++) {
      let maxHeight = 0;
      for (let c = start; c < start + span; c++) maxHeight = Math.max(maxHeight, colHeights[c]);
      if (maxHeight < bestMaxHeight) {
        bestMaxHeight = maxHeight;
        bestStart = start;
      }
    }

    const width = colWidth * span + gap * (span - 1);
    const height = Math.round(width / aspect);
    const x = bestStart * (colWidth + gap);
    const y = bestMaxHeight;

    placed.push({
      nodeId: qi.item.nodeId,
      type: qi.item.type,
      title: qi.item.title,
      body: qi.item.body,
      src: qi.item.src,
      href: qi.item.href,
      isText: qi.isText,
      textTitle: qi.textTitle,
      textBody: qi.textBody,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height,
    });

    const newHeight = y + height + gap;
    for (let c = bestStart; c < bestStart + span; c++) colHeights[c] = newHeight;
  }

  const totalHeight = Math.max(0, Math.max(...colHeights) - gap);

  return { items: placed, containerWidth, totalHeight };
}

// ─── Multi-breakpoint computation ───

export const BREAKPOINTS = [320, 480, 768, 1024, 1440, 1920, 2560] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export type ResponsiveLayout = {
  layouts: Record<number, ComputedLayout>;
  breakpoints: readonly number[];
};

export async function computeResponsiveLayout(items: LayoutItem[]): Promise<ResponsiveLayout> {
  const layouts: Record<number, ComputedLayout> = {};

  for (const bp of BREAKPOINTS) {
    layouts[bp] = computeBspLayout(items, bp);
  }

  return { layouts, breakpoints: BREAKPOINTS };
}

// ─── Build layout items from DB ───

export async function buildLayoutItems(
  collectionId: number | null,
  locale: import("./constants").Locale,
): Promise<LayoutItem[]> {
  const { getChildren, getTranslation, getNodePath } = await import("./nodes");
  const children = getChildren(collectionId);

  return Promise.all(
    children.map(async (c) => {
      const tr = getTranslation(c.id, locale);
      const src = c.type === "image" ? await imageSrcFor(c.id) : await coverSrcFor(c.id);
      let dims: ImageDimensions | null = null;
      if (c.type === "image" && c.source_path) {
        dims = await getImageDimensions(c.source_path);
      } else if (c.cover_image_id) {
        const coverNode = getNodeById(c.cover_image_id);
        if (coverNode?.source_path) dims = await getImageDimensions(coverNode.source_path);
      }
      const href = `/${getNodePath(c.id).join("/")}`;
      const type: LayoutItem["type"] =
        c.type === "collection" ? "collection" : (tr.body_markdown.trim() && !src ? "text" : "image");
      return {
        nodeId: c.id,
        type,
        title: tr.title,
        body: tr.body_markdown,
        src,
        href,
        dims,
      } satisfies LayoutItem;
    }),
  );
}
