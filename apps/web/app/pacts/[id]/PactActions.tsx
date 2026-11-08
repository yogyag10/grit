"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const button =
  "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);

  async function run(path: string, body: object, onOk: (json: Record<string, unknown>) => string | null) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      const err = (json.error as { message?: string } | string | null) ?? null;
      const errText = typeof err === "string" ? err : err?.message;
      if (errText) setMessage({ tone: "warn", text: errText });
      else {
        const ok = onOk(json);
        if (ok) setMessage({ tone: "ok", text: ok });
      }
      router.refresh();
    } catch {
      setMessage({ tone: "warn", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, run };
}

function Note({ message }: { message: { tone: "ok" | "warn"; text: string } | null }) {
  if (!message) return null;
  return <p className={`text-sm ${message.tone === "ok" ? "text-emerald-800" : "text-amber-800"}`}>{message.text}</p>;
}

export function SyncButton({ pactId }: { pactId: string }) {
  const { busy, message, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <button
        className={button}
        disabled={busy}
        onClick={() =>
          run(`/api/pacts/${pactId}/sync`, {}, (json) => {
            if (typeof json.message === "string") return json.message;
            const checked = Number(json.checked ?? 0);
            const remaining = Number(json.remaining ?? 0);
            const base = checked === 0 ? "You're up to date." : `Checked ${checked} new ${checked === 1 ? "activity" : "activities"}.`;
            return remaining > 0 ? `${base} Sync again to check ${remaining} more.` : base;
          })
        }
      >
        {busy ? "Syncing with Strava..." : "Sync my runs"}
      </button>
      <Note message={message} />
    </div>
  );
}

export function JoinButton({ pactId, inviteCode }: { pactId: string; inviteCode: string | null }) {
  const { busy, message, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <button className={button} disabled={busy} onClick={() => run(`/api/pacts/${pactId}/join`, { inviteCode }, () => null)}>
        {busy ? "Joining..." : "Join this pact"}
      </button>
      <Note message={message} />
    </div>
  );
}
