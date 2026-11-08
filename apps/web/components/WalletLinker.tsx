"use client";

import bs58 from "bs58";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDemoWallet, readDemoWallet, signDemoMessage } from "@/lib/demo-wallet";

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export function WalletLinker({ linked, userId }: { linked: string | null; userId: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  useEffect(() => {
    try {
      setCurrent(readDemoWallet(userId)?.publicKey.toBase58() ?? null);
    } catch (error) {
      setMessage({ tone: "warn", text: (error as Error).message });
    }
  }, [userId]);

  async function link() {
    setBusy(true);
    setMessage(null);
    try {
      const wallet = getDemoWallet(userId);
      const address = wallet.publicKey.toBase58();
      setCurrent(address);
      const challenge = await fetch(`/api/wallet/link?address=${address}`);
      const { message: text, error } = await challenge.json();
      if (!challenge.ok) throw new Error(error ?? "Couldn't start linking.");

      const signature = await signDemoMessage(wallet, text);
      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: bs58.encode(signature) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't link the wallet.");
      setMessage({ tone: "ok", text: "Demo wallet ready." });
      router.refresh();
    } catch (err) {
      const text = (err as Error).message;
      setMessage({ tone: "warn", text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {current && current === linked ? (
        <p className="text-sm font-medium text-emerald-800">Demo wallet ready · {short(current)}</p>
      ) : (
        <button
          onClick={link}
          disabled={busy}
          className="self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? "Setting up demo wallet..." : "Use demo wallet"}
        </button>
      )}
      {message && <p className={`text-sm ${message.tone === "ok" ? "text-emerald-800" : "text-amber-800"}`}>{message.text}</p>}
    </div>
  );
}
