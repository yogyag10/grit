import { PublicKey, Transaction } from "@solana/web3.js";
import { DEVNET_GENESIS } from "./demo-wallet";
import { loadTreasury, solanaPayoutChain } from "./payouts-live";
import { connection } from "./solana";

/** Top up only the linked member's test wallet for a bounded, server-loaded pact stake. */
export async function fundDemoWallet(address: string, stakeLamports: number) {
  if (!Number.isSafeInteger(stakeLamports) || stakeLamports <= 0 || stakeLamports > 250_000_000) {
    throw new Error("Demo deposits support up to 0.25 test SOL.");
  }
  const rpc = connection();
  if (await rpc.getGenesisHash() !== DEVNET_GENESIS) throw new Error("Demo wallets only work on Solana Devnet.");
  const wallet = new PublicKey(address);
  const [balance, reserve] = await Promise.all([
    rpc.getBalance(wallet, "confirmed"),
    rpc.getMinimumBalanceForRentExemption(0, "confirmed"),
  ]);
  const topUp = Math.max(0, stakeLamports + reserve + 50_000 - balance);
  if (!topUp) return { funded: true, signature: null };
  const treasury = loadTreasury();
  if (wallet.equals(treasury.publicKey)) throw new Error("The treasury cannot be used as a participant wallet.");
  if (await rpc.getBalance(treasury.publicKey, "confirmed") < topUp + 50_000) {
    throw new Error("The demo treasury needs more free Devnet SOL. Ask the team to top it up.");
  }
  const chain = solanaPayoutChain(rpc, treasury);
  const tx = await chain.signTransfer(address, topUp);
  await chain.broadcast(tx);
  const result = await rpc.confirmTransaction({ signature: tx.signature,
    blockhash: Transaction.from(tx.serialized).recentBlockhash!,
    lastValidBlockHeight: tx.lastValidBlockHeight }, "confirmed");
  if (result.value.err) throw new Error("The demo wallet funding transaction failed. Try again.");
  return { funded: true, signature: tx.signature };
}
