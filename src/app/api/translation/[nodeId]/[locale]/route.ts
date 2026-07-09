import { NextResponse, type NextRequest } from "next/server";
import { getTranslation } from "@/lib/nodes";
import { LOCALES, type Locale } from "@/lib/constants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string; locale: string }> },
) {
  const { nodeId, locale } = await params;
  const id = Number(nodeId);
  const safe = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "de";
  const tr = getTranslation(id, safe);
  return NextResponse.json({ node_id: id, locale: safe, title: tr.title, body_markdown: tr.body_markdown });
}
