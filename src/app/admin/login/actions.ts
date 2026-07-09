"use server";

import { redirect } from "next/navigation";
import { verifyAdminPassword, getAdminUsername, isProvisioned } from "@/lib/admin";
import { setSessionCookie } from "@/lib/auth";

export type AdminLoginState = { error?: "invalid" | "notProvisioned" } | undefined;

export async function submitAdmin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  if (!isProvisioned()) return { error: "notProvisioned" };
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (username !== getAdminUsername() || !verifyAdminPassword(password)) {
    return { error: "invalid" };
  }
  await setSessionCookie("admin");
  redirect("/admin");
}
