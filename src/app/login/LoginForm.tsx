"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitOtp } from "./actions";
import { LOCALES, type Locale } from "@/lib/i18n-dict";

export function LoginForm({ locale, prefill }: { locale: Locale; prefill?: string }) {
  const [state, formAction] = useActionState(submitOtp, undefined);
  const { pending } = useFormStatus();
  const dict: Record<Locale, { label: string; placeholder: string; submit: string; error: string }> = {
    de: { label: "Einmalcode", placeholder: "Zugangscode eingeben", submit: "Zutritt", error: "Ungültiger oder abgelaufener Code." },
    en: { label: "One-time code", placeholder: "Enter access code", submit: "Enter", error: "Invalid or expired code." },
  };
  const s = dict[locale];
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-widest text-ink/60">{s.label}</span>
        <input
          name="code"
          type="text"
          autoComplete="off"
          autoFocus
          required
          defaultValue={prefill ?? ""}
          placeholder={s.placeholder}
          className="w-full rounded border border-ink/20 bg-white/60 px-3 py-2 text-center font-mono tracking-[0.3em] focus:border-gold focus:outline-none"
        />
      </label>
      {state?.error && <p className="text-sm text-red-700">{s.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-ink px-4 py-2 text-sm uppercase tracking-widest text-parchment hover:bg-ink/90 disabled:opacity-50"
      >
        {s.submit}
      </button>
      <div className="flex justify-center gap-3 pt-2">
        {LOCALES.map((l) => (
          <a key={l} href={`/api/locale/${l}`} className="text-xs uppercase tracking-widest text-ink/40 hover:text-ink">
            {l.toUpperCase()}
          </a>
        ))}
      </div>
    </form>
  );
}
