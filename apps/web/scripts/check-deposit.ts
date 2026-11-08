/**
 * Debug tool: runs the server's deposit check against a real devnet transaction.
 *   pnpm --filter @movepact/web check-deposit <signature> <fromWallet> <toTreasury> <lamports>
 */
import { Connection } from "@solana/web3.js";
import { DEVNET_RPC, verifyDepositTx } from "../lib/solana";

const [signature, from, to, lamports] = process.argv.slice(2);
if (!signature || !from || !to || !lamports) {
  console.error("usage: check-deposit <signature> <fromWallet> <toTreasury> <lamports>");
  process.exit(1);
}

async function main() {
  const conn = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEVNET_RPC, "confirmed");
  const tx = await conn.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  console.log(JSON.stringify(verifyDepositTx(tx, { from, to, lamports: Number(lamports) }), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
