/**
 * Live Solana Devnet smoke test: fund a test wallet, verify its deposit, then refund it.
 * Uses the app's deposit verifier, settlement math, and live transfer adapter.
 * This does not exercise Supabase, Strava, or n8n. All wallets and SOL are for testing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { Keypair, SendTransactionError, Transaction } from "@solana/web3.js";
import { planSettlement } from "../packages/core/src/settlement";

// apps/web uses CommonJS while the root scripts package uses ESM.
const require = createRequire(import.meta.url);
const { connection, explorerTx, verifyDepositTx } = require("../apps/web/lib/solana.ts") as typeof import("../apps/web/lib/solana");
const { loadTreasury, solanaPayoutChain } = require("../apps/web/lib/payouts-live.ts") as typeof import("../apps/web/lib/payouts-live");

const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const STAKE = 1_000_000; // 0.001 test SOL
const envPath = new URL("../apps/web/.env.local", import.meta.url);
if (existsSync(envPath)) loadEnvFile(fileURLToPath(envPath));

async function main() {
  const rpc = connection();
  if ((await rpc.getGenesisHash()) !== DEVNET_GENESIS) {
    throw new Error("This demo only runs on Solana Devnet. Check NEXT_PUBLIC_SOLANA_RPC_URL.");
  }
  const treasury = loadTreasury();
  const participantPath = new URL("./.devnet-demo-participant.json", import.meta.url);
  let participant: Keypair;
  if (existsSync(participantPath)) {
    participant = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(participantPath, "utf8"))));
  } else {
    participant = Keypair.generate();
    writeFileSync(participantPath, JSON.stringify(Array.from(participant.secretKey)), { flag: "wx", mode: 0o600 });
  }

  const [treasuryBalance, participantBalance, rentReserve] = await Promise.all([
    rpc.getBalance(treasury.publicKey, "confirmed"),
    rpc.getBalance(participant.publicKey, "confirmed"),
    rpc.getMinimumBalanceForRentExemption(0, "confirmed"),
  ]);
  // A funded account must keep its rent-exempt minimum after paying the stake and network fee.
  const topUp = Math.max(0, STAKE + rentReserve + 50_000 - participantBalance);
  console.log("LIVE SOLANA DEVNET TRANSFER TEST — test wallets and test SOL");
  console.log("Scope: direct Solana integration; no Supabase, Strava, or n8n execution.");
  console.log(`Treasury: ${treasury.publicKey.toBase58()}`);
  console.log(`Treasury balance: ${treasuryBalance / 1e9} test SOL`);
  if (treasuryBalance < topUp + 50_000) {
    throw new Error(`Fund the treasury with free Devnet SOL at https://faucet.solana.com/ and run again. Address: ${treasury.publicKey.toBase58()}`);
  }

  const evidenceDir = new URL("../artifacts/solana-devnet/", import.meta.url);
  mkdirSync(evidenceDir, { recursive: true });
  const runId = new Date().toISOString().replaceAll(":", "-");
  const receipt = {
    runId,
    cluster: "devnet",
    genesisHash: DEVNET_GENESIS,
    scope: "Live deposit and refund smoke test with one test wallet; no fitness evidence or backend workflow.",
    treasury: treasury.publicKey.toBase58(),
    participant: participant.publicKey.toBase58(),
    stakeLamports: STAKE,
    depositVerified: false,
    outcome: "",
    status: "running",
    transfers: [] as { label: string; from: string; to: string; lamports: number; signature: string; lastValidBlockHeight: number; explorer: string; status: string }[],
  };
  const save = () => {
    const json = JSON.stringify(receipt, null, 2) + "\n";
    writeFileSync(new URL(`${runId}.json`, evidenceDir), json);
    writeFileSync(new URL("latest.json", evidenceDir), json);
    writeFileSync(new URL("latest.md", evidenceDir), [
      "# Oathmile — live Solana Devnet transfer test", "", receipt.scope, "",
      `Run: ${runId}`, `Status: ${receipt.status}`, `Treasury: ${receipt.treasury}`,
      `Participant: ${receipt.participant}`, `Deposit verified by app code: ${receipt.depositVerified}`,
      `Settlement outcome: ${receipt.outcome || "pending"}`, "",
      ...receipt.transfers.map(t => `- [${t.label}](${t.explorer}): ${t.lamports / 1e9} test SOL — ${t.status}`), "",
      "These are real Devnet transactions. This test does not establish that the full application flow is working.", "",
    ].join("\n"));
  };
  save();

  async function transfer(label: string, signer: Keypair, to: string, lamports: number) {
    const chain = solanaPayoutChain(rpc, signer);
    const signed = await chain.signTransfer(to, lamports);
    const record = { label, from: signer.publicKey.toBase58(), to, lamports,
      signature: signed.signature, lastValidBlockHeight: signed.lastValidBlockHeight,
      explorer: explorerTx(signed.signature), status: "signed" };
    receipt.transfers.push(record);
    save(); // Record the signature before broadcasting so uncertain outcomes can be checked.
    console.log(`${label}: ${record.explorer}`);
    try {
      await chain.broadcast(signed);
    } catch (error) {
      if (error instanceof SendTransactionError) {
        record.status = "rejected by RPC";
        save();
        throw error;
      }
      console.log(`Broadcast outcome uncertain; checking the saved signature: ${(error as Error).message}`);
    }
    const blockhash = Transaction.from(signed.serialized).recentBlockhash!;
    const confirmed = await rpc.confirmTransaction({ signature: signed.signature,
      blockhash, lastValidBlockHeight: signed.lastValidBlockHeight }, "confirmed");
    if (confirmed.value.err) throw new Error(`${label} failed on-chain: ${JSON.stringify(confirmed.value.err)}`);
    record.status = "confirmed";
    save();
    return signed.signature;
  }

  try {
    if (topUp) await transfer("Fund test wallet", treasury, receipt.participant, topUp);
    const signature = await transfer("Commitment deposit", participant, receipt.treasury, STAKE);
    let tx = await rpc.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    for (let i = 0; (!tx || tx.blockTime == null) && i < 8; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      tx = await rpc.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    }
    const deposit = verifyDepositTx(tx, { from: receipt.participant, to: receipt.treasury, lamports: STAKE });
    if (!deposit.ok) throw new Error(`Deposit verification failed: ${deposit.message}. Check the saved signature before rerunning.`);
    receipt.depositVerified = true;
    const plan = planSettlement({ challengeId: `devnet-smoke-${runId}`, stakeLamports: STAKE,
      goalMeters: 1000, fundingCutoff: deposit.confirmedAt,
      participants: [{ id: "test-wallet", wallet: receipt.participant, depositLamports: deposit.lamports,
        depositConfirmedAt: deposit.confirmedAt, acceptedMeters: 0 }] });
    // No activity is supplied: the real settlement math selects refund_none_succeeded.
    receipt.outcome = plan.outcome;
    save();
    for (const allocation of plan.allocations) {
      await transfer("Settlement refund", treasury, allocation.wallet, allocation.lamports);
    }
    receipt.status = "complete";
    save();
    console.log("Deposit verified. Refund confirmed. Pool returned in full; platform fee: 0.");
    console.log("Evidence: artifacts/solana-devnet/latest.md and latest.json");
  } catch (error) {
    receipt.status = "incomplete — check saved transaction signatures before rerunning";
    save();
    throw error;
  }
}

main().catch(error => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
