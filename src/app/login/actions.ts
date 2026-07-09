"use server";

import { redirect } from "next/navigation";
import { verifyOtp } from "@/lib/otp";
import { setSessionCookie } from "@/lib/auth";

export type LoginState = { error?: "empty" | "invalid" } | undefined;

export async function submitOtp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code) return { error: "empty" };
  if (!verifyOtp(code)) return { error: "invalid" };
  await setSessionCookie("viewer");
  redirect("/");
}
