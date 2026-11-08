/**
 * Payout execution with idempotency under retries and concurrent runs.
 *
 * 1. Claim a row atomically: pending -> sending (claimed_at is the claim token).
 * 2. Sign the transfer, save signature + last_valid_block_height as `sent` BEFORE broadcasting.
 * 3. Reconcile `sent` rows with getSignatureStatuses:
 *    - confirmed: mark confirmed
 *    - landed with an error: no funds moved, reset to pending
 *    - not found and the finalized block height is past last_valid_block_height: it can never land, reset
 *    - otherwise: wait
 * Every state change is conditional on the row's current status (and signature / claim token), so two
 * runs racing on the same row can never both broadcast.
 */

export type PayoutStatus = "pending" | "sending" | "sent" | "confirmed";

export interface PayoutRow {
  id: number;
  wallet: string;
  lamports: number;
  kind: string;
  status: PayoutStatus;
  signature: string | null;
  last_valid_block_height: number | null;
  claimed_at: string | null;
}

export interface PayoutStore {
  list(pactId: string): Promise<PayoutRow[]>;
  /** pending -> sending. Returns the row if this caller won the claim. */
  claim(id: number, claimedAt: string): Promise<PayoutRow | null>;
  /** sending (with this claim token) -> sent. */
  markSent(id: number, claimedAt: string, signature: string, lastValidBlockHeight: number): Promise<boolean>;
  /** sending (with this claim token) -> pending, when nothing was signed or broadcast. */
  release(id: number, claimedAt: string): Promise<boolean>;
  /** sending with claimed_at older than `olderThan` -> pending (a run crashed before saving a signature). */
  releaseStale(id: number, olderThan: string): Promise<boolean>;
  /** sent (with this signature) -> confirmed. */
  markConfirmed(id: number, signature: string): Promise<boolean>;
  /** sent (with this signature) -> pending, clearing the signature. */
  resetSent(id: number, signature: string): Promise<boolean>;
}

export interface SignedTransfer {
  signature: string;
  lastValidBlockHeight: number;
  serialized: Uint8Array;
}

/** null = the cluster has no record of the signature. */
export type ChainStatus = "confirmed" | "failed" | "processing" | null;

export interface PayoutChain {
  signTransfer(to: string, lamports: number): Promise<SignedTransfer>;
  /** May throw or time out; the outcome is then learned from statuses(). */
  broadcast(tx: SignedTransfer): Promise<void>;
  statuses(signatures: string[]): Promise<ChainStatus[]>;
  finalizedBlockHeight(): Promise<number>;
}

export interface PayoutRunResult {
  confirmed: number;
  inFlight: number;
  pending: number;
  errors: string[];
}

const STALE_SENDING_MS = 2 * 60 * 1000;

export async function reconcileSent(rows: PayoutRow[], store: PayoutStore, chain: PayoutChain): Promise<void> {
  const sent = rows.filter((r) => r.status === "sent" && r.signature && r.last_valid_block_height != null);
  if (sent.length === 0) return;
  const statuses = await chain.statuses(sent.map((r) => r.signature!));
  let height: number | null = null;

  for (let i = 0; i < sent.length; i++) {
    const row = sent[i];
    const status = statuses[i];
    if (status === "confirmed") {
      await store.markConfirmed(row.id, row.signature!);
    } else if (status === "failed") {
      await store.resetSent(row.id, row.signature!);
    } else if (status === null) {
      height ??= await chain.finalizedBlockHeight();
      if (height > row.last_valid_block_height!) await store.resetSent(row.id, row.signature!);
    }
    // "processing": seen by the cluster but not yet confirmed; wait.
  }
}

export async function processPayouts(
  pactId: string,
  store: PayoutStore,
  chain: PayoutChain,
  opts: { now?: () => Date; confirmPolls?: number; pollMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<PayoutRunResult> {
  const now = opts.now ?? (() => new Date());
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const errors: string[] = [];

  // 1. Release claims from runs that crashed before saving a signature (nothing was broadcast for them).
  let rows = await store.list(pactId);
  const staleBefore = new Date(now().getTime() - STALE_SENDING_MS).toISOString();
  for (const r of rows) {
    if (r.status === "sending" && r.claimed_at && r.claimed_at < staleBefore) await store.releaseStale(r.id, staleBefore);
  }

  // 2. Learn the outcome of anything already broadcast before sending anything new.
  try {
    await reconcileSent(await store.list(pactId), store, chain);
  } catch (err) {
    errors.push(`reconcile: ${(err as Error).message}`);
    // Without statuses we can't tell what landed; don't risk a double payment by sending more now.
    return summarize(await store.list(pactId), errors);
  }

  // 3. Send pending payouts.
  rows = await store.list(pactId);
  for (const r of rows.filter((x) => x.status === "pending")) {
    const claimedAt = now().toISOString();
    const claimed = await store.claim(r.id, claimedAt);
    if (!claimed) continue;

    let signed: SignedTransfer;
    try {
      signed = await chain.signTransfer(claimed.wallet, claimed.lamports);
    } catch (err) {
      await store.release(r.id, claimedAt);
      errors.push(`sign payout ${r.id}: ${(err as Error).message}`);
      continue;
    }
    if (!(await store.markSent(r.id, claimedAt, signed.signature, signed.lastValidBlockHeight))) continue;
    try {
      await chain.broadcast(signed);
    } catch (err) {
      // Uncertain: it may or may not have reached the cluster. Reconciliation decides.
      errors.push(`broadcast payout ${r.id}: ${(err as Error).message}`);
    }
  }

  // 4. Give fresh transfers a short window to confirm so one run usually finishes the job.
  const polls = opts.confirmPolls ?? 10;
  for (let i = 0; i < polls; i++) {
    rows = await store.list(pactId);
    if (!rows.some((r) => r.status === "sent")) break;
    await sleep(opts.pollMs ?? 2000);
    try {
      await reconcileSent(await store.list(pactId), store, chain);
    } catch (err) {
      errors.push(`reconcile: ${(err as Error).message}`);
      break;
    }
  }

  return summarize(await store.list(pactId), errors);
}

function summarize(rows: PayoutRow[], errors: string[]): PayoutRunResult {
  return {
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    inFlight: rows.filter((r) => r.status === "sent" || r.status === "sending").length,
    pending: rows.filter((r) => r.status === "pending").length,
    errors,
  };
}
