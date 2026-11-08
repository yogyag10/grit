"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "Something went wrong. Try again.");
      return res.ok;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/auth/otp", { email })) setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/auth/verify", { email, token: code })) {
      router.push("/onboarding");
      router.refresh();
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
  const button =
    "w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60";

  return sent ? (
    <form onSubmit={verify} className="flex flex-col gap-3">
      <p className="text-slate-700">
        We sent a code to <span className="font-medium">{email}</span>. Enter it below, or tap the link in the email.
      </p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Code
        <input
          className={`${input} tracking-widest`}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className={button} disabled={busy}>
        {busy ? "Checking..." : "Sign in"}
      </button>
      <button type="button" className="text-sm text-slate-600 underline" onClick={() => setSent(false)}>
        Use a different email
      </button>
    </form>
  ) : (
    <form onSubmit={sendCode} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        UBC student email
        <input
          className={input}
          type="email"
          autoComplete="email"
          placeholder="you@student.ubc.ca"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className={button} disabled={busy}>
        {busy ? "Sending..." : "Email me a code"}
      </button>
    </form>
  );
}
