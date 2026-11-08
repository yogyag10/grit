"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/primitives";

const input =
  "h-12 w-full rounded-full border border-line bg-canvas px-5 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath";

async function post(path: string, body: object): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, json: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, json: { error: "Network error. Try again." } };
  }
}

/** Join any group, including a private one, by typing its invite code. */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, json } = await post("/api/community/groups/join", { code });
    if (ok) router.push(`/community/g/${json.id}`);
    else {
      setError(String(json.error ?? "That code doesn't match a group."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="invite-code" className="font-semibold">
        Have an invite code?
      </label>
      <div className="flex gap-2">
        <input
          id="invite-code"
          className={`${input} font-mono uppercase tracking-widest`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD2345"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
          required
        />
        <Button full={false} loading={busy} className="shrink-0">
          Join
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-missed">
          {error}
        </p>
      )}
    </form>
  );
}

/** Joins an open group by id, or any group by invite code, then opens it. */
export function JoinGroupButton({ groupId, code, label = "Join" }: { groupId?: string; code?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const { ok, json } = await post("/api/community/groups/join", code ? { code } : { groupId });
    if (ok) router.push(`/community/g/${json.id}`);
    else {
      setError(String(json.error ?? "Couldn't join. Try again."));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" full={false} loading={busy} onClick={join}>
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-missed">
          {error}
        </p>
      )}
    </div>
  );
}

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (!window.confirm("Leave this group? You can rejoin an open group any time, or a private one with its code.")) return;
    setBusy(true);
    setError(null);
    const { ok, json } = await post(`/api/community/groups/${groupId}/leave`, {});
    if (ok) {
      router.push("/community");
      router.refresh();
    } else {
      setError(String(json.error ?? "Couldn't leave. Try again."));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size="sm" loading={busy} onClick={leave}>
        Leave group
      </Button>
      {error && <Note tone="warn">{error}</Note>}
    </div>
  );
}

/** Copies text, or a link on this site, to the clipboard. */
export function CopyButton({ text, path, label }: { text?: string; path?: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(path ? `${window.location.origin}${path}` : (text ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the code is on screen to copy by hand.
    }
  }
  return (
    <Button type="button" variant="secondary" size="sm" full={false} onClick={copy}>
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function NewGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, json } = await post("/api/community/groups", { name, description, visibility });
    if (ok) router.push(`/community/g/${json.id}`);
    else {
      setError(String(json.error ?? "Couldn't create the group. Try again."));
      setBusy(false);
    }
  }

  const option = (value: "public" | "private", title: string, body: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 ${
        visibility === value ? "border-oath bg-oath-soft" : "border-line bg-card"
      } focus-within:ring-2 focus-within:ring-oath`}
    >
      <input
        type="radio"
        name="visibility"
        value={value}
        checked={visibility === value}
        onChange={() => setVisibility(value)}
        className="mt-1 accent-[#b6ea8c]"
      />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="group-name" className="font-semibold">
          Group name
        </label>
        <input
          id="group-name"
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Brock 3rd floor runners"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="group-description" className="font-semibold">
          What is it for? <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="group-description"
          className={input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          placeholder="Sunday long runs, all paces"
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Who can join?</legend>
        {option("private", "Private", "Only people with your invite code. Share the code with friends.")}
        {option("public", "Open", "Shows up under Groups to join for every verified UBC student.")}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-missed">
          {error}
        </p>
      )}
      <Button loading={busy}>Create group</Button>
    </form>
  );
}
