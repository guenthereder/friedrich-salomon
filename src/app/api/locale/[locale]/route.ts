import { NextResponse, type NextRequest } from "next/server";
import { LOCALES } from "@/lib/constants";

export async function GET(req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safe = (LOCALES as readonly string[]).includes(locale) ? locale : "de";
  const referer = req.headers.get("referer") ?? "/";
  const res = NextResponse.redirect(new URL(referer, req.url));
  res.cookies.set("fs_locale", safe, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
