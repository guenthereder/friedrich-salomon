import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_COOKIE = "fs_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me-in-production-please-32chars";

const PUBLIC_PATHS = [
  "/login",
  "/admin/login",
];

const STATIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/uploads",
  "/api/image",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(JWT_COOKIE)?.value;
  let role: "viewer" | "admin" | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
      if (payload.role === "viewer" || payload.role === "admin") {
        role = payload.role as "viewer" | "admin";
      }
    } catch {
      role = null;
    }
  }

  // Admin-only routes require an admin session.
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Everything else requires at least a viewer session.
  if (role !== "viewer" && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
