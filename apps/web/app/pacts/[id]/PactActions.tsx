"use client";

import { Check, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/primitives";

type Message = { tone: "ok" | "warn"; text: string } | null;

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

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

export function SyncButton({ pactId }: { pactId: string }) {
  const { busy, message, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <Button
        loading={busy}
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
        {busy ? "Syncing with Strava..." : "Sync runs"}
      </Button>
      {message && <Note tone={message.tone}>{message.text}</Note>}
    </div>
  );
}

export function JoinButton({ pactId, inviteCode }: { pactId: string; inviteCode: string | null }) {
  const { busy, message, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <Button loading={busy} onClick={() => run(`/api/pacts/${pactId}/join`, { inviteCode }, () => null)}>
        {busy ? "Joining..." : "Join pact"}
      </Button>
      {message && <Note tone={message.tone}>{message.text}</Note>}
    </div>
  );
}

/** Shares or copies the link to this pact. Invite-only pacts include their code. */
export function InviteButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  async function invite() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Cancelled or blocked; nothing to recover.
    }
  }
  return (
    <Button type="button" variant="secondary" onClick={invite}>
      {copied ? <Check className="size-5" aria-hidden="true" /> : <UserPlus className="size-5" aria-hidden="true" />}
      {copied ? "Link copied" : "Invite friends"}
    </Button>
  );
}

/** Members choose whether to show a name and their km toward the goal on the leaderboard. Never routes or individual runs. */
export function StandingsOptIn({ pactId, initialShow, initialName }: { pactId: string; initialShow: boolean; initialName: string }) {
  const { busy, message, run } = useAction();
  const [name, setName] = useState(initialName);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted">
        {initialShow
          ? "You're shown on the leaderboard with your name and your km toward the goal."
          : "Off by default. If you opt in, others see your name and your km toward the goal. Never your routes or individual runs."}
      </p>
      <label htmlFor="display-name" className="text-sm font-semibold">
        Name to show
      </label>
      <input
        id="display-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        placeholder="e.g. Priya S."
        className="h-12 rounded-full border border-line bg-canvas px-5 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
      />
      <Button
        variant={initialShow ? "secondary" : "primary"}
        size="sm"
        loading={busy}
        onClick={() => run(`/api/pacts/${pactId}/standings`, { show: !initialShow, displayName: name }, () => null)}
      >
        {initialShow ? "Hide me from the leaderboard" : "Show me on the leaderboard"}
      </Button>
      {message && <Note tone={message.tone}>{message.text}</Note>}
    </div>
  );
}
