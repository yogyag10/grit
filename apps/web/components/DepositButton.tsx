"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useState } from "react";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends the exact stake to the MovePact devnet wallet, then asks the server to verify it on-chain. */
export function DepositButton(props: {
  pactId: string;
  lamports: number;
  treasury: string;
  linkedWallet: string;
  label: string;
}) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const current = publicKey?.toBase58() ?? null;

  async function verify(signature: string) {
    setBusy("Verifying on devnet...");
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch(`/api/pacts/${props.pactId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setPendingSig(null);
        router.refresh();
        return;
      }
      if (!json.retryable) throw new Error(json.error ?? "The deposit couldn't be verified.");
      await wait(2500);
    }
    throw new Error("Devnet is slow right now. Your transaction was sent; tap Verify again in a moment.");
  }

  async function deposit() {
    if (!publicKey) return;
    setError(null);
    try {
      setBusy("Approve in Phantom...");
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(props.treasury), lamports: props.lamports }),
      );
      const latest = await connection.getLatestBlockhash("confirmed");
      const signature = await sendTransaction(tx, connection);
      setPendingSig(signature);
      setBusy("Waiting for devnet to confirm...");
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      await verify(signature);
    } catch (err) {
      const text = (err as Error).message ?? "";
      setError(/reject|denied|cancel/i.test(text) ? "The transaction was cancelled." : text || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-600">Connect Phantom (set to devnet) to make your deposit.</p>
        <WalletMultiButton style={{ height: 40, fontSize: 14, borderRadius: 8, backgroundColor: "#4b3fd1" }} />
      </div>
    );
  }
  if (current !== props.linkedWallet) {
    return (
      <p className="text-sm text-amber-800">
        Phantom is on {short(current)}, but your linked wallet is {short(props.linkedWallet)}. Switch accounts in Phantom.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={deposit}
        disabled={!!busy}
        className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {busy ?? props.label}
      </button>
      {pendingSig && !busy && (
        <button
          onClick={() => verify(pendingSig).catch((e) => setError((e as Error).message)).finally(() => setBusy(null))}
          className="text-sm text-emerald-800 underline"
        >
          Verify my sent transaction
        </button>
      )}
      {error && <p className="text-sm text-amber-800">{error}</p>}
    </div>
  );
}
