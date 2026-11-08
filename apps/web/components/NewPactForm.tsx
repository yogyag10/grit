"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GOAL_PRESETS_KM, STAKE_PRESETS_SOL } from "@/lib/pact-create";

const input =
  "h-12 w-full rounded-full border border-line bg-canvas px-5 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath";

/** A browser-local value for <input type="datetime-local">. */
function localInput(ms: number): string {
  return new Date(ms - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function Chips<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className="cursor-pointer">
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className="flex h-11 items-center rounded-full bg-card px-5 text-base font-semibold text-ink peer-checked:bg-oath peer-checked:text-oath-ink peer-focus-visible:ring-2 peer-focus-visible:ring-oath peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NewPactForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goalKm, setGoalKm] = useState<number>(10);
  const [stakeSol, setStakeSol] = useState<number>(0.1);
  const [visibility, setVisibility] = useState<"invite" | "public">("invite");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Defaults depend on the current time, so they're set after mount to keep server and browser markup identical.
  useEffect(() => {
    const start = Math.ceil((Date.now() + 3600_000) / 900_000) * 900_000;
    setStartsAt(localInput(start));
    setEndsAt(localInput(start + 7 * 86_400_000));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          goalKm,
          stakeSol,
          visibility,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && typeof json.path === "string") {
        router.push(json.path);
        return;
      }
      setError(String(json.error ?? "Couldn't create the pact. Try again."));
    } catch {
      setError("Network error. Try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="pact-title" className="font-semibold">
          Pact name
        </label>
        <input
          id="pact-title"
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={50}
          placeholder="e.g. Brock 3rd floor 10K"
          required
        />
      </div>

      <Chips legend="Goal distance, total" name="goal" value={goalKm} onChange={setGoalKm} options={GOAL_PRESETS_KM.map((km) => ({ value: km, label: `${km} km` }))} />
      <Chips
        legend="Commitment deposit"
        name="stake"
        value={stakeSol}
        onChange={setStakeSol}
        options={STAKE_PRESETS_SOL.map((sol) => ({ value: sol, label: `${sol.toFixed(2)} SOL` }))}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="pact-start" className="font-semibold">
            Starts
          </label>
          <input id="pact-start" type="datetime-local" className={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="pact-end" className="font-semibold">
            Ends
          </label>
          <input id="pact-end" type="datetime-local" className={input} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
        </div>
      </div>

      <Chips
        legend="Who can join?"
        name="visibility"
        value={visibility}
        onChange={setVisibility}
        options={[
          { value: "invite", label: "Invite only" },
          { value: "public", label: "Public" },
        ]}
      />
      <p className="-mt-3 text-sm text-muted">
        {visibility === "invite"
          ? "Only people with your invite link can see and join it. Good for a floor, club or friends."
          : "Shows up on Explore for every verified UBC student."}
      </p>

      <p className="rounded-2xl bg-card p-4 text-sm text-muted">
        Everyone who joins puts in {stakeSol.toFixed(2)} SOL (devnet) before the start time, and joining closes when the pact starts. Anyone who clears {goalKm} km
        gets their deposit back plus an equal share of the deposits from people who don&apos;t. There is no fee. If nobody clears it, or everybody does, everyone is
        refunded. You join automatically and make your own deposit on the next page.
      </p>

      {error && (
        <p role="alert" className="text-sm text-missed">
          {error}
        </p>
      )}
      <Button loading={busy}>Create pact</Button>
    </form>
  );
}
