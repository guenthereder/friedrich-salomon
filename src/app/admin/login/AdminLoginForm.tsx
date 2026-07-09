"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitAdmin } from "./actions";
import type { Locale } from "@/lib/i18n-dict";

const DICT: Record<Locale, { u: string; p: string; submit: string; error: string; notProvisioned: string }> = {
  de: { u: "Benutzername", p: "Passwort", submit: "Anmelden", error: "Anmeldedaten ungültig.", notProvisioned: "Kein Admin-Passwort gesetzt. Bitte «npm run seed:admin -- <passwort>» ausführen." },
  en: { u: "Username", p: "Password", submit: "Sign in", error: "Invalid credentials.", notProvisioned: "No admin password set. Run «npm run seed:admin -- <password>»." },
};

export function AdminLoginForm({ locale }: { locale: Locale }) {
  const [state, formAction] = useActionState(submitAdmin, undefined);
  const { pending } = useFormStatus();
  const s = DICT[locale];
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{s.u}</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 focus:border-gold focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{s.p}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 focus:border-gold focus:outline-none"
        />
      </label>
      {state?.error === "notProvisioned" && <p className="text-sm text-red-700">{s.notProvisioned}</p>}
      {state?.error === "invalid" && <p className="text-sm text-red-700">{s.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-ink px-4 py-2 text-sm uppercase tracking-widest text-parchment hover:bg-ink/90 disabled:opacity-50"
      >
        {s.submit}
      </button>
    </form>
  );
}
