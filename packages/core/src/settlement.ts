/**
 * Pure settlement math. No network, no database.
 *
 * Rules (from the MovePact brief):
 * - Only participants with a verified deposit of exactly the stake, confirmed at or before the
 *   funding cutoff, are "funded". Only funded participants can qualify or share the pool.
 * - Qualifiers = funded participants whose frozen accepted meters reach the goal.
 * - Some (not all) qualify: qualifiers split the whole pool. No platform fee.
 * - Everyone qualifies, or nobody does: every funded participant gets their stake back.
 * - Remainder rule: pool % qualifiers extra lamports go 1 each to qualifiers sorted by id.
 * - Any verified deposit that did not make the participant funded (late or wrong amount)
 *   is returned in full as "return_unfunded".
 *
 * Idempotency lives in the caller: persist the plan keyed by challengeId before sending any
 * transfer, persist each signature, and check an uncertain transfer on-chain before retrying.
 */

export interface SettlementParticipant {
  id: string;
  wallet: string;
  /** Sum of verified on-chain deposits attributed to this challenge, in lamports */
  depositLamports: number;
  /** ISO 8601 UTC time the last counted deposit was confirmed, or null if none */
  depositConfirmedAt: string | null;
  /** Frozen accepted meters at the sync cutoff */
  acceptedMeters: number;
}

export interface SettlementInput {
  challengeId: string;
  stakeLamports: number;
  goalMeters: number;
  fundingCutoff: string;
  participants: SettlementParticipant[];
}

export type AllocationKind = "payout" | "refund" | "return_unfunded";

export interface Allocation {
  participantId: string;
  wallet: string;
  lamports: number;
  kind: AllocationKind;
}

export type SettlementOutcome = "split" | "refund_all_succeeded" | "refund_none_succeeded" | "no_funded_participants";

export interface SettlementPlan {
  challengeId: string;
  outcome: SettlementOutcome;
  poolLamports: number;
  fundedIds: string[];
  qualifierIds: string[];
  allocations: Allocation[];
}

export function planSettlement(input: SettlementInput): SettlementPlan {
  const { challengeId, stakeLamports, goalMeters, fundingCutoff } = input;
  assertLamports(stakeLamports, "stakeLamports");
  if (stakeLamports <= 0) throw new Error("stakeLamports must be positive");
  const cutoffMs = Date.parse(fundingCutoff);
  if (!Number.isFinite(cutoffMs)) throw new Error("fundingCutoff is not a valid date");

  const participants = [...input.participants].sort((a, b) => a.id.localeCompare(b.id));
  const seen = new Set<string>();
  for (const p of participants) {
    if (seen.has(p.id)) throw new Error(`duplicate participant ${p.id}`);
    seen.add(p.id);
    assertLamports(p.depositLamports, `depositLamports for ${p.id}`);
  }

  const isFunded = (p: SettlementParticipant) =>
    p.depositLamports === stakeLamports &&
    p.depositConfirmedAt !== null &&
    Date.parse(p.depositConfirmedAt) <= cutoffMs;

  const funded = participants.filter(isFunded);
  const qualifiers = funded.filter((p) => p.acceptedMeters >= goalMeters);
  const poolLamports = funded.length * stakeLamports;
  assertLamports(poolLamports, "poolLamports");

  const allocations: Allocation[] = [];
  let outcome: SettlementOutcome;

  if (funded.length === 0) {
    outcome = "no_funded_participants";
  } else if (qualifiers.length === 0 || qualifiers.length === funded.length) {
    outcome = qualifiers.length === 0 ? "refund_none_succeeded" : "refund_all_succeeded";
    for (const p of funded) {
      allocations.push({ participantId: p.id, wallet: p.wallet, lamports: stakeLamports, kind: "refund" });
    }
  } else {
    outcome = "split";
    const share = Math.floor(poolLamports / qualifiers.length);
    const remainder = poolLamports - share * qualifiers.length;
    qualifiers.forEach((p, i) => {
      allocations.push({
        participantId: p.id,
        wallet: p.wallet,
        lamports: share + (i < remainder ? 1 : 0),
        kind: "payout",
      });
    });
  }

  const fundedTotal = allocations.reduce((sum, a) => sum + a.lamports, 0);
  if (funded.length > 0 && fundedTotal !== poolLamports) {
    throw new Error(`invariant broken: allocated ${fundedTotal} of pool ${poolLamports}`);
  }

  for (const p of participants) {
    if (!isFunded(p) && p.depositLamports > 0) {
      allocations.push({ participantId: p.id, wallet: p.wallet, lamports: p.depositLamports, kind: "return_unfunded" });
    }
  }

  return {
    challengeId,
    outcome,
    poolLamports,
    fundedIds: funded.map((p) => p.id),
    qualifierIds: qualifiers.map((p) => p.id),
    allocations,
  };
}

function assertLamports(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer of lamports, got ${value}`);
  }
}
