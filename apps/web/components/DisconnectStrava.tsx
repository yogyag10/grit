"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DisconnectStrava() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    if (!window.confirm("Disconnect Strava? Your runs won't sync into your pacts until you connect again.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/strava/disconnect", { method: "POST" });
      if (res.ok) {
        router.refresh();
        return;
      }
      const json = await res.json().catch(() => ({}));
      setError(String(json.error ?? "Couldn't disconnect Strava. Try again."));
    } catch {
      setError("Network error. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" loading={busy} onClick={disconnect}>
        Disconnect Strava
      </Button>
      {error && (
        <p role="alert" className="text-sm text-missed">
          {error}
        </p>
      )}
    </div>
  );
}
