import type { SupabaseClient } from "@supabase/supabase-js";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "./env";
import type { ChainStatus, PayoutChain, PayoutRow, PayoutStatus, PayoutStore } from "./payouts";
import { treasuryAddress } from "./solana";
import type { Database } from "./supabase/database.types";

/** Live implementations of the payout store (Supabase) and chain (Solana devnet). Server only. */

type Admin = SupabaseClient<Database>;
const COLS = "id, wallet, lamports, kind, status, signature, last_valid_block_height, claimed_at";

function toRow(r: Database["public"]["Tables"]["payouts"]["Row"]): PayoutRow {
  return { ...r, lamports: Number(r.lamports), status: r.status as PayoutStatus };
}

export function supabasePayoutStore(admin: Admin): PayoutStore {
  // Each method is a single conditional UPDATE, so it is atomic in Postgres.
  const changed = async (q: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) => {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  };
  return {
    async list(pactId) {
      const { data, error } = await admin.from("payouts").select("*").eq("pact_id", pactId).order("id");
      if (error) throw new Error(error.message);
      return (data ?? []).map(toRow);
    },
    async claim(id, claimedAt) {
      const { data, error } = await admin
        .from("payouts")
        .update({ status: "sending", claimed_at: claimedAt })
        .eq("id", id)
        .eq("status", "pending")
        .select("*");
      if (error) throw new Error(error.message);
      return data?.[0] ? toRow(data[0]) : null;
    },
    markSent: (id, claimedAt, signature, lastValidBlockHeight) =>
      changed(
        admin
          .from("payouts")
          .update({ status: "sent", signature, last_valid_block_height: lastValidBlockHeight })
          .eq("id", id)
          .eq("status", "sending")
          .eq("claimed_at", claimedAt)
          .select(COLS),
      ),
    release: (id, claimedAt) =>
      changed(
        admin
          .from("payouts")
          .update({ status: "pending", claimed_at: null })
          .eq("id", id)
          .eq("status", "sending")
          .eq("claimed_at", claimedAt)
          .select(COLS),
      ),
    releaseStale: (id, olderThan) =>
      changed(
        admin
          .from("payouts")
          .update({ status: "pending", claimed_at: null })
          .eq("id", id)
          .eq("status", "sending")
          .lt("claimed_at", olderThan)
          .select(COLS),
      ),
    markConfirmed: (id, signature) =>
      changed(
        admin.from("payouts").update({ status: "confirmed" }).eq("id", id).eq("status", "sent").eq("signature", signature).select(COLS),
      ),
    resetSent: (id, signature) =>
      changed(
        admin
          .from("payouts")
          .update({ status: "pending", signature: null, last_valid_block_height: null, claimed_at: null })
          .eq("id", id)
          .eq("status", "sent")
          .eq("signature", signature)
          .select(COLS),
      ),
  };
}

export function loadTreasury(): Keypair {
  const raw = env("TREASURY_SECRET_KEY");
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  if (keypair.publicKey.toBase58() !== treasuryAddress()) {
    throw new Error("TREASURY_SECRET_KEY does not match NEXT_PUBLIC_TREASURY_ADDRESS");
  }
  return keypair;
}

export function solanaPayoutChain(conn: Connection, treasury: Keypair): PayoutChain {
  return {
    async signTransfer(to, lamports) {
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
      const tx = new Transaction({ feePayer: treasury.publicKey, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey: new PublicKey(to), lamports }),
      );
      tx.sign(treasury);
      return { signature: bs58.encode(tx.signature!), lastValidBlockHeight, serialized: tx.serialize() };
    },
    async broadcast(tx) {
      await conn.sendRawTransaction(tx.serialized, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 5 });
    },
    async statuses(signatures) {
      const { value } = await conn.getSignatureStatuses(signatures, { searchTransactionHistory: true });
      return value.map((s): ChainStatus => {
        if (!s) return null;
        if (s.err) return "failed";
        return s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized" ? "confirmed" : "processing";
      });
    },
    finalizedBlockHeight: () => conn.getBlockHeight("finalized"),
  };
}
