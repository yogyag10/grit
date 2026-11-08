"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

const input =
  "h-[52px] w-full rounded-full border border-line bg-card px-5 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath";

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

  return sent ? (
    <form onSubmit={verify} className="flex flex-col gap-3">
      <p className="text-muted">
        We sent a code to <span className="font-semibold text-ink">{email}</span>. Enter it below, or tap the link in the email.
      </p>
      <label htmlFor="code" className="font-semibold">
        Sign-in code
      </label>
      <input
        id="code"
        className={`${input} tracking-[0.3em]`}
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-missed">
          {error}
        </p>
      )}
      <Button loading={busy}>{busy ? "Checking..." : "Sign in"}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setSent(false)}>
        Use a different email
      </Button>
    </form>
  ) : (
    <form onSubmit={sendCode} className="flex flex-col gap-3">
      <label htmlFor="email" className="font-semibold">
        UBC student email
      </label>
      <input
        id="email"
        className={input}
        type="email"
        autoComplete="email"
        placeholder="you@student.ubc.ca"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-missed">
          {error}
        </p>
      )}
      <Button loading={busy}>{busy ? "Sending..." : "Send me a sign-in code"}</Button>
    </form>
  );
}
