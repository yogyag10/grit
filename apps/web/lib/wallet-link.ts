import { createPublicKey, verify } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

/** Wallet ownership proof: the wallet signs a one-time message naming the account, wallet, and a nonce. */

export const LINK_COOKIE = "wallet_link";
export const LINK_TTL_MS = 10 * 60 * 1000;

export interface LinkChallenge {
  address: string;
  nonce: string;
  issuedAt: string;
}

export function buildLinkMessage(email: string, c: LinkChallenge): string {
  return [
    "Oathmile: link this wallet to my account.",
    "",
    `Account: ${email}`,
    `Wallet: ${c.address}`,
    `Nonce: ${c.nonce}`,
    `Issued: ${c.issuedAt}`,
    "",
    "Signing this proves you own the wallet. It does not move any funds.",
  ].join("\n");
}

export function parseChallenge(raw: string | undefined): LinkChallenge | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<LinkChallenge>;
    if (typeof c.address === "string" && typeof c.nonce === "string" && typeof c.issuedAt === "string") {
      return { address: c.address, nonce: c.nonce, issuedAt: c.issuedAt };
    }
  } catch {
    // fall through
  }
  return null;
}

export function challengeExpired(c: LinkChallenge, now = Date.now()): boolean {
  const issued = Date.parse(c.issuedAt);
  return !Number.isFinite(issued) || now - issued > LINK_TTL_MS || issued - now > 60_000;
}

/** Verifies a raw 64-byte ed25519 signature over `message` by the wallet's public key. */
export function verifyWalletSignature(address: string, message: string, signature: Uint8Array): boolean {
  if (signature.length !== 64) return false;
  try {
    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(new PublicKey(address).toBytes()).toString("base64url") },
      format: "jwk",
    });
    return verify(null, Buffer.from(message, "utf8"), key, Buffer.from(signature));
  } catch {
    return false;
  }
}
