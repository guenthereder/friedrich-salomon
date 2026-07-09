import "server-only";
import { SignJWT, jwtVerify } from "jose";
import path from "node:path";
import { env } from "./env";
import { UPLOADS_DIR } from "./constants";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type ImageTokenPayload = {
  nodeId: number;
  variant: "full" | "thumb";
  exp?: number;
};

const TTL_SECONDS = 60 * 60; // 1 hour

export async function issueImageToken(nodeId: number, variant: "full" | "thumb"): Promise<string> {
  return new SignJWT({ nodeId, variant })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyImageToken(token: string): Promise<ImageTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.nodeId !== "number") return null;
    if (payload.variant !== "full" && payload.variant !== "thumb") return null;
    return { nodeId: payload.nodeId, variant: payload.variant };
  } catch {
    return null;
  }
}

export function resolveImagePath(nodeId: number, variant: "full" | "thumb"): string | null {
  // We store image paths in node.source_path relative to UPLOADS_DIR.
  // Thumbnails live next to the original with a .thumb.<ext> suffix.
  void variant; // resolved by caller via node record
  void nodeId;
  void UPLOADS_DIR;
  return path.resolve(UPLOADS_DIR);
}
