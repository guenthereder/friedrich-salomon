"use client";

import { useState, useTransition } from "react";
import { rotateOtpAction, revokeOtpAction } from "@/app/admin/actions";

type Labels = {
  title: string;
  current: string;
  rotate: string;
  revoke: string;
  copyLink: string;
  envNotice: string;
  none: string;
};

export function OtpPanel({
  code,
  expiresAt,
  revoked,
  isEnvOtp,
  labels,
}: {
  code: string | null;
  expiresAt: string | null;
  revoked: boolean;
  isEnvOtp: boolean;
  labels: Labels;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const link = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/login` : "";
  const expired = expiresAt ? new Date(expiresAt.replace(" ", "T") + "Z").getTime() < Date.now() : false;
  const active = code && !revoked && !expired;

  return (
    <div className="rounded border border-ink/10 bg-white/40 p-4">
      <h3 className="mb-3 text-xs uppercase tracking-widest text-ink/60">{labels.title}</h3>

      {isEnvOtp && (
        <p className="mb-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{labels.envNotice}</p>
      )}

      {active ? (
        <>
          <p className="mb-1 break-all font-mono text-lg tracking-widest">{code}</p>
          {expiresAt && expiresAt !== "9999-12-31 23:59:59" && (
            <p className="mb-3 text-xs text-ink/50">
              {labels.current} — {expiresAt.replace("T", " ").replace(/\.\d+Z?$/, "")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending || isEnvOtp}
              onClick={() =>
                start(async () => {
                  await navigator.clipboard.writeText(`${link}?prefill=${code}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
              }
              className="rounded border border-ink/20 px-3 py-1 text-xs uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40"
            >
              {copied ? "✓" : labels.copyLink}
            </button>
            {!isEnvOtp && (
              <button
                disabled={pending}
                onClick={() => start(() => rotateOtpAction())}
                className="rounded border border-ink/20 px-3 py-1 text-xs uppercase tracking-widest hover:bg-ink/5"
              >
                {labels.rotate}
              </button>
            )}
            {!isEnvOtp && (
              <button
                disabled={pending}
                onClick={() => start(() => revokeOtpAction())}
                className="rounded border border-red-300 px-3 py-1 text-xs uppercase tracking-widest text-red-700 hover:bg-red-50"
              >
                {labels.revoke}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/40">{labels.none}</p>
          {!isEnvOtp && (
            <button
              disabled={pending}
              onClick={() => start(() => rotateOtpAction())}
              className="rounded bg-ink px-3 py-1 text-xs uppercase tracking-widest text-parchment hover:bg-ink/90"
            >
              {labels.rotate}
            </button>
          )}
        </>
      )}
    </div>
  );
}
