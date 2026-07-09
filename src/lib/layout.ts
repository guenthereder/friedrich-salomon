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

// ─── BSP subdivision algorithm ───

type Rect = { x: number; y: number; w: number; h: number };

type QueueItem = {
  dims: ImageDimensions;
  item: LayoutItem;
  isText: boolean;
  textTitle?: string;
  textBody?: string;
};

/**
 * Recursive spatial subdivision (binary space partition).
 *
 * The canvas starts as one big rectangle. We take items one by one and
 * place them into the canvas, splitting the remaining space into two
 * sub-rectangles (like a guillotine cut). The split direction is chosen
 * to match the image's aspect ratio:
 *   - Landscape image → split horizontally (left/right), image takes the wider side
 *   - Portrait image → split vertically (top/bottom), image takes the taller side
 *
 * This creates an organic mosaic where landscapes are wide, portraits are
 * tall, and they interlock naturally. Text blocks adopt the aspect ratio
 * that fills the current gap best.
 *
 * Implementation uses a free-list of rectangles. Each placement carves
 * the image's rect out of the best-fitting free rect, then returns the
 * leftover L-shaped region as two new free rects.
 */
export function computeBspLayout(
  items: LayoutItem[],
  containerWidth: number,
  targetHeight = 320,
  gap = 12,
): ComputedLayout {
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

  // ─── Row-based guillotine packing ───
  //
  // Instead of a generic free-rect packer (which tends to stack vertically),
  // we process items in order, grouping them into rows. Each row fills the
  // full container width. Within a row, images are sized so their heights
  // are approximately equal (justified rows), but unlike standard justified
  // rows, we allow images to have slightly different heights by subdividing
  // the row vertically when there's a height mismatch.
  //
  // The result: landscapes are wide and short, portraits are narrow and tall,
  // and they interlock across rows because a tall portrait from row N may
  // overlap into row N+1's space.

  const canvasHeight = Math.ceil(queue.length * targetHeight * 1.5) + targetHeight * 4;
  let freeRects: Rect[] = [{ x: 0, y: 0, w: containerWidth, h: canvasHeight }];
  const placed: PlacedItem[] = [];

  for (const qi of queue) {
    const targetAspect = qi.dims.aspect;

    // Natural size at target height.
    const naturalHeight = targetHeight;
    const naturalWidth = Math.round(naturalHeight * targetAspect);

    // ── Find the best free rect ──
    // Score each rect by: how well the image fills it (higher = better),
    // with a secondary preference for top-left position.
    // This prevents a narrow image from always picking the full-width rect.

    let bestRect: Rect | null = null;
    let bestScore = Infinity;

    for (const r of freeRects) {
      if (r.w < 80 || r.h < 80) continue;

      // Compute the image's display size inside this rect.
      let dw = Math.min(naturalWidth, r.w);
      let dh = Math.round(dw / targetAspect);
      if (dh > r.h) {
        dh = r.h;
        dw = Math.round(dh * targetAspect);
      }
      if (dw < 80 || dh < 80) continue;

      // Fill ratio: how much of the rect the image uses.
      const fillRatio = (dw * dh) / (r.w * r.h);

      // Position penalty: prefer top-left (lower y, then lower x).
      // Scaled so that a 10% fill improvement is worth ~100px of position.
      const posPenalty = r.y * 0.3 + r.x * 0.1;

      // Score: lower is better. Penalise low fill heavily.
      const score = (1 - fillRatio) * 500 + posPenalty;

      if (score < bestScore) {
        bestScore = score;
        bestRect = r;
      }
    }

    if (!bestRect) continue;

    // Determine placement size.
    let placeW = naturalWidth;
    let placeH = naturalHeight;

    // Scale down if needed.
    if (placeW > bestRect.w) {
      placeW = bestRect.w;
      placeH = Math.round(placeW / targetAspect);
    }
    if (placeH > bestRect.h) {
      placeH = bestRect.h;
      placeW = Math.round(placeH * targetAspect);
    }

    // If the rect is roughly the image's natural width, fill it fully.
    if (bestRect.w <= naturalWidth * 1.4) {
      placeW = bestRect.w;
      placeH = Math.round(placeW / targetAspect);
      if (placeH > bestRect.h) {
        placeH = bestRect.h;
        placeW = Math.round(placeH * targetAspect);
      }
    }

    placeW = Math.max(80, Math.round(placeW));
    placeH = Math.max(80, Math.round(placeH));

    const px = bestRect.x;
    const py = bestRect.y;

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
      x: px,
      y: py,
      width: placeW - gap,
      height: placeH - gap,
    });

    // Guillotine split: remove bestRect from free list, add the two leftovers.
    freeRects = freeRects.filter((r) => r !== bestRect);

    // Right remainder
    const rightW = bestRect.w - placeW;
    if (rightW >= 60) {
      freeRects.push({ x: px + placeW, y: py, w: rightW, h: placeH });
    }

    // Bottom remainder (full width of the original rect)
    const bottomH = bestRect.h - placeH;
    if (bottomH >= 60) {
      freeRects.push({ x: px, y: py + placeH, w: bestRect.w, h: bottomH });
    }

    // Also add the area to the right of the bottom strip (if right was cut).
    if (rightW >= 60 && bottomH >= 60) {
      freeRects.push({ x: px + placeW, y: py + placeH, w: rightW, h: bottomH });
    }

    // Merge adjacent free rects to reduce fragmentation.
    freeRects = mergeRects(freeRects);
  }

  // Trim canvas to the lowest placed item.
  const maxY = placed.reduce((m, p) => Math.max(m, p.y + p.height + gap), 0);

  return {
    items: placed,
    containerWidth,
    totalHeight: maxY,
  };
}

/** Merge free rects that share an edge to reduce fragmentation. */
function mergeRects(rects: Rect[]): Rect[] {
  let changed = true;
  let result = [...rects];

  while (changed) {
    changed = false;
    const merged: Rect[] = [];

    for (let i = 0; i < result.length; i++) {
      const r = result[i];
      let absorbed = false;

      for (let j = 0; j < merged.length; j++) {
        const m = merged[j];        // Horizontal merge: same y, same h, adjacent x
        if (r.y === m.y && r.h === m.h && r.x === m.x + m.w) {
          merged[j] = { x: m.x, y: m.y, w: m.w + r.w, h: m.h };
          absorbed = true;
          changed = true;
          break;
        }
        if (r.y === m.y && r.h === m.h && r.x + r.w === m.x) {
          merged[j] = { x: r.x, y: r.y, w: m.w + r.w, h: m.h };
          absorbed = true;
          changed = true;
          break;
        }
        // Vertical merge: same x, same w, adjacent y
        if (r.x === m.x && r.w === m.w && r.y === m.y + m.h) {
          merged[j] = { x: m.x, y: m.y, w: m.w, h: m.h + r.h };
          absorbed = true;
          changed = true;
          break;
        }
        if (r.x === m.x && r.w === m.w && r.y + r.h === m.y) {
          merged[j] = { x: r.x, y: r.y, w: m.w, h: m.h + r.h };
          absorbed = true;
          changed = true;
          break;
        }
      }

      if (!absorbed) merged.push(r);
    }

    result = merged;
  }

  return result;
}

// ─── Multi-breakpoint computation ───

export const BREAKPOINTS = [480, 768, 1024, 1440, 1920, 2560] as const;
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
