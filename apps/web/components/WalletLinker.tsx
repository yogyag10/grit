"use client";

import bs58 from "bs58";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/primitives";
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
    <div className="mt-2 flex flex-col gap-3">
      {current && current === linked ? (
        <p className="font-semibold text-oath">Demo wallet ready · {short(current)}</p>
      ) : (
        <Button variant="secondary" onClick={link} loading={busy}>
          {busy ? "Setting up demo wallet..." : "Use demo wallet"}
        </Button>
      )}
      {message && <Note tone={message.tone}>{message.text}</Note>}
    </div>
  );
}
