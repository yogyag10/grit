import { Keypair } from "@solana/web3.js";
import { existsSync, writeFileSync } from "node:fs";

const OUT = new URL("./.treasury-secret.json", import.meta.url);

if (existsSync(OUT)) {
  console.error("scripts/.treasury-secret.json already exists. Delete it first if you really want a new keypair.");
  process.exit(1);
}

const keypair = Keypair.generate();
writeFileSync(OUT, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });

console.log("Throwaway DEVNET treasury keypair created.");
console.log(`Public address (NEXT_PUBLIC_TREASURY_ADDRESS): ${keypair.publicKey.toBase58()}`);
console.log("Secret key saved to scripts/.treasury-secret.json (gitignored).");
console.log("Paste its contents into TREASURY_SECRET_KEY in apps/web/.env.local and in Vercel. Never commit it.");
