import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { JWT_ALG, JWT_COOKIE, ADMIN_TTL_SECONDS, VIEWER_TTL_SECONDS } from "./constants";
import { env } from "./env";

export type SessionPayload = {
  role: "viewer" | "admin";
  iat?: number;
  exp?: number;
};

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function issueSession(role: "viewer" | "admin"): Promise<string> {
  const ttl = role === "admin" ? ADMIN_TTL_SECONDS : VIEWER_TTL_SECONDS;
  return new SignJWT({ role })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret);
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "viewer" && payload.role !== "admin") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(JWT_COOKIE)?.value);
}

export async function setSessionCookie(role: "viewer" | "admin"): Promise<void> {
  const token = await issueSession(role);
  const store = await cookies();
  store.set(JWT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: role === "admin" ? ADMIN_TTL_SECONDS : VIEWER_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(JWT_COOKIE);
}
