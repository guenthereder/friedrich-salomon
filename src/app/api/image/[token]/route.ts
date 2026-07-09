import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { UPLOADS_DIR } from "@/lib/constants";
import { getNodeById } from "@/lib/nodes";
import { verifyImageToken } from "@/lib/image-token";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = await verifyImageToken(token);
  if (!payload) return new NextResponse("Not found", { status: 404 });

  const node = getNodeById(payload.nodeId);
  if (!node || node.type !== "image" || !node.source_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(node.source_path).toLowerCase();
  const baseName = node.source_path.replace(/\.[^.]+$/, "");
  const relPath =
    payload.variant === "thumb" ? `${baseName}.thumb${ext}` : node.source_path;
  const abs = path.resolve(UPLOADS_DIR, relPath);

  // Guard against path traversal.
  if (!abs.startsWith(UPLOADS_DIR)) return new NextResponse("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(abs);
  } catch {
    // Thumbnail missing — fall back to full image.
    try {
      data = await readFile(path.resolve(UPLOADS_DIR, node.source_path));
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
