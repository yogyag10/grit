import { Keypair } from "@solana/web3.js";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
type WalletStorage = Pick<Storage, "getItem" | "setItem">;
const storageKey = (userId: string) => `oathmile:demo-wallet:${userId}`;

/** Disposable Devnet keys stay in this browser, separately for each signed-in account. */
export function readDemoWallet(userId: string, storage: WalletStorage = localStorage): Keypair | null {
  const raw = storage.getItem(storageKey(userId));
  if (!raw) return null;
  try {
    const bytes: unknown = JSON.parse(raw);
    if (!Array.isArray(bytes) || bytes.length !== 64 || !bytes.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
      throw new Error("Invalid key");
    }
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch {
    throw new Error("This browser's demo wallet could not be loaded. Use the browser where you created it.");
  }
}

export function getDemoWallet(userId: string, storage: WalletStorage = localStorage): Keypair {
  const existing = readDemoWallet(userId, storage);
  if (existing) return existing;
  const wallet = Keypair.generate();
  storage.setItem(storageKey(userId), JSON.stringify(Array.from(wallet.secretKey)));
  return wallet;
}

/** Sign the existing wallet-link challenge using the browser's Ed25519 implementation. */
export async function signDemoMessage(wallet: Keypair, message: string): Promise<Uint8Array> {
  const pkcs8 = new Uint8Array(48);
  pkcs8.set([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
  pkcs8.set(wallet.secretKey.slice(0, 32), 16);
  const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(message)));
}
