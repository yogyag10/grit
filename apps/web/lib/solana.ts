import { Connection, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";

/** Server-side Solana helpers. DEVNET ONLY. */

export const DEVNET_RPC = "https://api.devnet.solana.com";

export function rpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEVNET_RPC;
}

export function connection(): Connection {
  return new Connection(rpcUrl(), "confirmed");
}

export function treasuryAddress(): string {
  const value = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  if (!value) throw new Error("Missing env var NEXT_PUBLIC_TREASURY_ADDRESS. See apps/web/.env.example.");
  return value;
}

/** A normal wallet address: valid base58 public key on the ed25519 curve (not a program-derived address). */
export function isWalletAddress(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  try {
    return PublicKey.isOnCurve(new PublicKey(value).toBytes());
  } catch {
    return false;
  }
}

export function isSignatureString(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 64 || value.length > 90) return false;
  try {
    return bs58.decode(value).length === 64;
  } catch {
    return false;
  }
}

export type DepositCheck =
  | { ok: true; lamports: number; confirmedAt: string }
  | { ok: false; code: DepositFailure; message: string; retryable: boolean };

export type DepositFailure = "NOT_FOUND" | "NOT_FINAL" | "FAILED" | "NO_MATCHING_TRANSFER";

/**
 * Decides whether a parsed transaction is a valid commitment deposit. Requires:
 * - the transaction exists at `confirmed` and succeeded
 * - a top-level SystemProgram transfer from the member's linked wallet to the treasury for exactly the stake
 * - a block time, which becomes confirmed_at
 * Signature reuse is enforced by the database (deposits.signature is the primary key).
 */
export function verifyDepositTx(
  tx: ParsedTransactionWithMeta | null,
  expected: { from: string; to: string; lamports: number },
): DepositCheck {
  if (!tx || !tx.meta) {
    return { ok: false, code: "NOT_FOUND", message: "We can't see this transaction yet. Trying again shortly.", retryable: true };
  }
  if (tx.meta.err !== null) {
    return { ok: false, code: "FAILED", message: "This transaction failed on-chain, so no deposit was made.", retryable: false };
  }

  const match = tx.transaction.message.instructions.some((ix) => {
    if (!("parsed" in ix) || ix.program !== "system") return false;
    const parsed = ix.parsed as { type?: string; info?: Record<string, unknown> };
    if (parsed?.type !== "transfer" || !parsed.info) return false;
    const { source, destination, lamports } = parsed.info;
    return source === expected.from && destination === expected.to && Number(lamports) === expected.lamports;
  });
  if (!match) {
    return {
      ok: false,
      code: "NO_MATCHING_TRANSFER",
      message: "This transaction isn't a transfer of the exact deposit from your linked wallet to the Grit wallet.",
      retryable: false,
    };
  }
  if (tx.blockTime == null) {
    return { ok: false, code: "NOT_FINAL", message: "The transaction isn't final yet. Trying again shortly.", retryable: true };
  }
  return { ok: true, lamports: expected.lamports, confirmedAt: new Date(tx.blockTime * 1000).toISOString() };
}

export function fetchParsedTransaction(signature: string): Promise<ParsedTransactionWithMeta | null> {
  return connection().getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
}

export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function explorerAddress(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
