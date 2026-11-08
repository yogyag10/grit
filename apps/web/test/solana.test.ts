/**
 * Deposit and wallet-link verification. Transactions here are HAND-BUILT FIXTURES shaped like
 * getParsedTransaction output; keys are generated per run. No network.
 */
import { generateKeyPairSync, sign } from "node:crypto";
import { Keypair, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import { isSignatureString, isWalletAddress, verifyDepositTx } from "../lib/solana";
import { buildLinkMessage, challengeExpired, parseChallenge, verifyWalletSignature } from "../lib/wallet-link";

const MEMBER = Keypair.generate().publicKey.toBase58();
const TREASURY = Keypair.generate().publicKey.toBase58();
const OTHER = Keypair.generate().publicKey.toBase58();
const STAKE = 100_000_000;

function transferIx(source: string, destination: string, lamports: number, program = "system", type = "transfer") {
  return {
    program,
    programId: new PublicKey("11111111111111111111111111111111"),
    parsed: { type, info: { source, destination, lamports } },
  };
}

function fixtureTx(opts: { ixs?: unknown[]; err?: unknown; blockTime?: number | null; meta?: null } = {}) {
  return {
    slot: 1,
    blockTime: opts.blockTime === undefined ? 1_794_000_000 : opts.blockTime,
    meta: opts.meta === null ? null : { err: opts.err ?? null, fee: 5000, preBalances: [], postBalances: [] },
    transaction: {
      signatures: ["x"],
      message: { accountKeys: [], instructions: opts.ixs ?? [transferIx(MEMBER, TREASURY, STAKE)], recentBlockhash: "x" },
    },
  } as unknown as ParsedTransactionWithMeta;
}

const expected = { from: MEMBER, to: TREASURY, lamports: STAKE };

describe("verifyDepositTx", () => {
  it("accepts an exact transfer from the linked wallet to the treasury, using blockTime", () => {
    expect(verifyDepositTx(fixtureTx(), expected)).toEqual({
      ok: true,
      lamports: STAKE,
      confirmedAt: new Date(1_794_000_000 * 1000).toISOString(),
    });
  });

  it("asks to retry when the transaction isn't visible yet", () => {
    expect(verifyDepositTx(null, expected)).toMatchObject({ ok: false, code: "NOT_FOUND", retryable: true });
    expect(verifyDepositTx(fixtureTx({ meta: null }), expected)).toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a failed transaction", () => {
    expect(verifyDepositTx(fixtureTx({ err: { InstructionError: [0, "Custom"] } }), expected)).toMatchObject({
      ok: false,
      code: "FAILED",
      retryable: false,
    });
  });

  it.each([
    ["wrong amount", transferIx(MEMBER, TREASURY, STAKE - 1)],
    ["more than the stake", transferIx(MEMBER, TREASURY, STAKE + 1)],
    ["someone else's wallet", transferIx(OTHER, TREASURY, STAKE)],
    ["wrong destination", transferIx(MEMBER, OTHER, STAKE)],
    ["not a system transfer", transferIx(MEMBER, TREASURY, STAKE, "spl-token")],
    ["a different system instruction", transferIx(MEMBER, TREASURY, STAKE, "system", "createAccount")],
  ])("rejects %s", (_label, ix) => {
    expect(verifyDepositTx(fixtureTx({ ixs: [ix] }), expected)).toMatchObject({ ok: false, code: "NO_MATCHING_TRANSFER" });
  });

  it("rejects unparsed instructions", () => {
    const raw = { programId: new PublicKey("11111111111111111111111111111111"), accounts: [], data: "3Bxs4h24hBtQy9rw" };
    expect(verifyDepositTx(fixtureTx({ ixs: [raw] }), expected)).toMatchObject({ code: "NO_MATCHING_TRANSFER" });
  });

  it("finds the transfer among other instructions (e.g. compute budget)", () => {
    const budget = { program: "compute-budget", programId: PublicKey.default, parsed: { type: "setComputeUnitPrice", info: {} } };
    expect(verifyDepositTx(fixtureTx({ ixs: [budget, transferIx(MEMBER, TREASURY, STAKE)] }), expected).ok).toBe(true);
  });

  it("waits for a block time before recording", () => {
    expect(verifyDepositTx(fixtureTx({ blockTime: null }), expected)).toMatchObject({ code: "NOT_FINAL", retryable: true });
  });
});

describe("address and signature formats", () => {
  it("accepts wallet addresses and rejects junk and program-derived addresses", () => {
    expect(isWalletAddress(MEMBER)).toBe(true);
    expect(isWalletAddress("not-an-address")).toBe(false);
    expect(isWalletAddress(123)).toBe(false);
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("x")], new PublicKey("11111111111111111111111111111111"));
    expect(isWalletAddress(pda.toBase58())).toBe(false);
  });

  it("accepts 64-byte base58 signatures only", () => {
    expect(isSignatureString(bs58.encode(new Uint8Array(64).fill(7)))).toBe(true);
    expect(isSignatureString(bs58.encode(new Uint8Array(32).fill(7)))).toBe(false);
    expect(isSignatureString("0OIl".repeat(20))).toBe(false);
  });
});

describe("wallet link", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const x = publicKey.export({ format: "jwk" }).x as string;
  const address = new PublicKey(Buffer.from(x, "base64url")).toBase58();
  const challenge = { address, nonce: "abc123", issuedAt: new Date().toISOString() };
  const message = buildLinkMessage("jane@student.ubc.ca", challenge);
  const signature = new Uint8Array(sign(null, Buffer.from(message), privateKey));

  it("verifies a real ed25519 signature from the wallet", () => {
    expect(verifyWalletSignature(address, message, signature)).toBe(true);
  });

  it("rejects a signature for a different account email", () => {
    expect(verifyWalletSignature(address, buildLinkMessage("mallory@student.ubc.ca", challenge), signature)).toBe(false);
  });

  it("rejects a signature from another wallet", () => {
    expect(verifyWalletSignature(MEMBER, message, signature)).toBe(false);
  });

  it("rejects malformed signatures", () => {
    expect(verifyWalletSignature(address, message, signature.slice(0, 63))).toBe(false);
  });

  it("the message names the account and wallet and says no funds move", () => {
    expect(message).toContain("jane@student.ubc.ca");
    expect(message).toContain(address);
    expect(message).toContain("does not move any funds");
  });

  it("parses challenges and expires them after 10 minutes", () => {
    expect(parseChallenge(JSON.stringify(challenge))).toEqual(challenge);
    expect(parseChallenge("{bad")).toBeNull();
    expect(parseChallenge(undefined)).toBeNull();
    const now = Date.parse(challenge.issuedAt);
    expect(challengeExpired(challenge, now + 9 * 60_000)).toBe(false);
    expect(challengeExpired(challenge, now + 11 * 60_000)).toBe(true);
  });
});
