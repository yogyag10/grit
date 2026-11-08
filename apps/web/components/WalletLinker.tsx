"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export function WalletLinker({ linked }: { linked: string | null }) {
  const router = useRouter();
  const { publicKey, signMessage } = useWallet();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const current = publicKey?.toBase58() ?? null;

  async function link() {
    if (!current || !signMessage) return;
    setBusy(true);
    setMessage(null);
    try {
      const challenge = await fetch(`/api/wallet/link?address=${current}`);
      const { message: text, error } = await challenge.json();
      if (!challenge.ok) throw new Error(error ?? "Couldn't start linking.");

      const signature = await signMessage(new TextEncoder().encode(text));
      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: current, signature: bs58.encode(signature) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't link the wallet.");
      setMessage({ tone: "ok", text: "Wallet linked." });
      router.refresh();
    } catch (err) {
      const text = (err as Error).message;
      setMessage({ tone: "warn", text: /reject|denied|cancel/i.test(text) ? "Signing was cancelled." : text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <WalletMultiButton style={{ height: 40, fontSize: 14, borderRadius: 8, backgroundColor: "#4b3fd1" }} />
      {current && current !== linked && (
        <button
          onClick={link}
          disabled={busy || !signMessage}
          className="self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? "Check Phantom..." : linked ? `Switch to ${short(current)}` : `Link ${short(current)}`}
        </button>
      )}
      {current && !signMessage && <p className="text-sm text-amber-800">This wallet can't sign messages. Use Phantom.</p>}
      {message && <p className={`text-sm ${message.tone === "ok" ? "text-emerald-800" : "text-amber-800"}`}>{message.text}</p>}
    </div>
  );
}
