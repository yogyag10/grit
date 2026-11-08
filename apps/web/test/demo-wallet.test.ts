import { describe, expect, it } from "vitest";
import { getDemoWallet, readDemoWallet, signDemoMessage } from "../lib/demo-wallet";
import { verifyWalletSignature } from "../lib/wallet-link";

function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); } };
}

describe("browser demo wallets", () => {
  it("keeps the same wallet across reloads and a different wallet for each account", () => {
    const saved = storage();
    const a = getDemoWallet("alice", saved);
    expect(readDemoWallet("alice", saved)?.publicKey.toBase58()).toBe(a.publicKey.toBase58());
    expect(getDemoWallet("alice", saved).secretKey).toEqual(a.secretKey);
    expect(getDemoWallet("bob", saved).publicKey.equals(a.publicKey)).toBe(false);
    expect(readDemoWallet("charlie", saved)).toBeNull();
  });

  it("does not silently replace a damaged wallet and lose its payout address", () => {
    const saved = storage();
    saved.setItem("oathmile:demo-wallet:alice", "invalid");
    expect(() => getDemoWallet("alice", saved)).toThrow("could not be loaded");
    expect(saved.getItem("oathmile:demo-wallet:alice")).toBe("invalid");
  });

  it("creates a real Ed25519 proof accepted by the existing server wallet verifier", async () => {
    const wallet = getDemoWallet("alice", storage());
    const message = "Oathmile account and one-time nonce";
    const signature = await signDemoMessage(wallet, message);
    expect(verifyWalletSignature(wallet.publicKey.toBase58(), message, signature)).toBe(true);
    expect(verifyWalletSignature(wallet.publicKey.toBase58(), "another account", signature)).toBe(false);
  });
});
