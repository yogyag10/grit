"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/primitives";

export function ResetPanel() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [result, setResult] = useState<{ usersDeleted: number } | null>(null);

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !key.trim()) return;
    setBusy(true);
    setError(null);
    setPartial(false);
    setResult(null);
    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST", headers: { Authorization: `Bearer ${key.trim()}` }, cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPartial(!!data.partial);
        throw new Error(response.status === 401 ? "That reset key wasn't accepted." :
          response.status === 404 ? "Reset is disabled. Configure ADMIN_RESET_SECRET on the server." :
          data.error ?? "The reset did not finish. Check the app and retry.");
      }
      if (data.ok !== true) throw new Error("The server did not confirm the reset. Check the app before retrying.");
      setKey("");
      setResult({ usersDeleted: data.usersDeleted ?? 0 });
    } catch (err) {
      setError((err as Error).message || "The reset did not finish. Check the app and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-xl font-bold">Wipe and reset</h2>
        <p className="mt-2 text-sm text-muted">Deletes accounts, pacts, deposits, progress, groups, and chat. This cannot be undone.</p>
      </div>
      <form onSubmit={reset} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Reset key
          <input type="password" value={key} onChange={event => setKey(event.target.value)} disabled={busy}
            autoComplete="off" autoCapitalize="none" spellCheck={false} required
            placeholder="Enter the operator reset key"
            className="h-12 w-full rounded-xl border border-line bg-canvas px-4 text-base font-normal text-ink outline-none focus:border-oath focus:ring-1 focus:ring-oath" />
        </label>
        <Button type="submit" variant="danger" loading={busy} disabled={!key.trim()}>
          {!busy && <RotateCcw className="size-4" aria-hidden="true" />}
          {busy ? "Resetting…" : partial ? "Retry reset" : "Wipe and reset demo"}
        </Button>
      </form>
      {error && <p role="alert" className="text-sm text-missed">{error}</p>}
      {result && (
        <div role="status" className="flex flex-col gap-2 rounded-xl bg-oath-soft p-4 text-oath">
          <p className="flex items-center gap-2 font-semibold"><Check className="size-5" aria-hidden="true" />Reset complete</p>
          <p className="text-sm">App data cleared, {result.usersDeleted} sign-in accounts deleted, and a fresh Demo created.</p>
          <Link href="/" className="self-start text-sm font-semibold underline underline-offset-2">Back to sign in</Link>
        </div>
      )}
    </Card>
  );
}
