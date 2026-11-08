"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SendTransactionError, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/primitives";
import { DEVNET_GENESIS, readDemoWallet } from "@/lib/demo-wallet";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends the exact stake to the Grit devnet wallet, then asks the server to verify it on-chain. */
export function DepositButton(props: {
  userId: string;
  pactId: string;
  lamports: number;
  treasury: string;
  linkedWallet: string;
  label: string;
}) {
  const router = useRouter();
  const { connection } = useConnection();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const pendingKey = `oathmile:demo-deposit:${props.userId}:${props.pactId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(pendingKey);
      if (saved) setPendingSig(JSON.parse(saved).signature);
    } catch {
      setError("Couldn't load your pending deposit. Keep this browser's saved wallet data.");
    }
  }, [pendingKey]);

  function clearPending() {
    localStorage.removeItem(pendingKey);
    setPendingSig(null);
  }

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
        clearPending();
        router.refresh();
        return;
      }
      if (!json.retryable) {
        if (json.code === "FAILED") clearPending();
        throw new Error(json.error ?? "The deposit couldn't be verified.");
      }
      await wait(2500);
    }
    const saved = localStorage.getItem(pendingKey);
    if (saved) {
      const pending = JSON.parse(saved);
      const { value: [status] } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      if (status?.err || (!status && await connection.getBlockHeight("finalized") > pending.lastValidBlockHeight)) {
        clearPending();
        throw new Error("The transaction failed or expired without a deposit. You can try again.");
      }
    }
    throw new Error("Devnet is slow right now. Your transaction was sent; tap Verify again in a moment.");
  }

  async function deposit() {
    setError(null);
    try {
      const saved = localStorage.getItem(pendingKey);
      if (saved) {
        const pending = JSON.parse(saved);
        if (typeof pending.signature !== "string") throw new Error("Couldn't read your saved deposit. Keep this browser's wallet data.");
        setPendingSig(pending.signature);
        await verify(pending.signature);
        return;
      }
      setBusy("Preparing demo wallet...");
      const wallet = readDemoWallet(props.userId);
      if (!wallet || wallet.publicKey.toBase58() !== props.linkedWallet) {
        throw new Error("Open setup in the browser where you created your demo wallet before depositing.");
      }
      if (await connection.getGenesisHash() !== DEVNET_GENESIS) throw new Error("Demo wallets only work on Solana Devnet.");
      const funding = await fetch(`/api/pacts/${props.pactId}/demo-fund`, { method: "POST" });
      const funded = await funding.json();
      if (!funding.ok) throw new Error(funded.error ?? "Couldn't fund the demo wallet.");
      if (funded.alreadyRecorded) {
        await verify(funded.signature);
        return;
      }
      const latest = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({ feePayer: wallet.publicKey, ...latest }).add(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: new PublicKey(props.treasury), lamports: props.lamports }),
      );
      tx.sign(wallet);
      const signature = bs58.encode(tx.signature!);
      // Save before broadcasting: refreshing or an RPC timeout must not send a second deposit.
      localStorage.setItem(pendingKey, JSON.stringify({ signature, lastValidBlockHeight: latest.lastValidBlockHeight }));
      setPendingSig(signature);
      await connection.sendRawTransaction(tx.serialize(), { preflightCommitment: "confirmed" });
      setBusy("Waiting for devnet to confirm...");
      const result = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      if (result.value.err) {
        clearPending();
        throw new Error("The deposit failed on Devnet. You can try again.");
      }
      await verify(signature);
    } catch (err) {
      if (err instanceof SendTransactionError) clearPending();
      const text = (err as Error).message ?? "";
      setError(text || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Demo wallet · free test SOL, with real Solana devnet transactions.</p>
      <Button onClick={deposit} loading={!!busy} disabled={!!pendingSig && !busy}>
        {busy ?? `${props.label} with demo wallet`}
      </Button>
      {pendingSig && !busy && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => verify(pendingSig).catch((e) => setError((e as Error).message)).finally(() => setBusy(null))}
        >
          Verify my sent transaction
        </Button>
      )}
      {error && <Note tone="warn">{error}</Note>}
    </div>
  );
}
