"use client";

import { logout } from "@/app/actions";

export function LogoutButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => logout()}
      className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink"
    >
      {label}
    </button>
  );
}
