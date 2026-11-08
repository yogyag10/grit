/** Mocked RPC tests. No network calls or live transfers. */
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEVNET_GENESIS } from "../lib/demo-wallet";
import { fundDemoWallet } from "../lib/demo-funding";

const mocks = vi.hoisted(() => ({ getGenesisHash: vi.fn(), getBalance: vi.fn(),
  getMinimumBalanceForRentExemption: vi.fn(), confirmTransaction: vi.fn(),
  loadTreasury: vi.fn(), signTransfer: vi.fn(), broadcast: vi.fn() }));
vi.mock("../lib/solana", () => ({ connection: () => mocks }));
vi.mock("../lib/payouts-live", () => ({ loadTreasury: mocks.loadTreasury,
  solanaPayoutChain: () => ({ signTransfer: mocks.signTransfer, broadcast: mocks.broadcast }) }));

const treasury = Keypair.generate();
const participant = Keypair.generate();
const address = participant.publicKey.toBase58();

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getGenesisHash.mockResolvedValue(DEVNET_GENESIS);
  mocks.getMinimumBalanceForRentExemption.mockResolvedValue(890_880);
  mocks.getBalance.mockImplementation(async key => key.equals(treasury.publicKey) ? 5_000_000_000 : 0);
  mocks.loadTreasury.mockReturnValue(treasury);
  const tx = new Transaction({ feePayer: treasury.publicKey,
    recentBlockhash: SystemProgram.programId.toBase58() }).add(
    SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey: participant.publicKey, lamports: 1 }));
  tx.sign(treasury);
  mocks.signTransfer.mockResolvedValue({ signature: "test-signature", lastValidBlockHeight: 123, serialized: tx.serialize() });
  mocks.broadcast.mockResolvedValue(undefined);
  mocks.confirmTransaction.mockResolvedValue({ value: { err: null } });
});

describe("Devnet wallet funding", () => {
  it("refuses other clusters before reading balances or using treasury keys", async () => {
    mocks.getGenesisHash.mockResolvedValue("mainnet");
    await expect(fundDemoWallet(address, 100_000_000)).rejects.toThrow("only work on Solana Devnet");
    expect(mocks.getBalance).not.toHaveBeenCalled();
    expect(mocks.loadTreasury).not.toHaveBeenCalled();
  });

  it("funds the stake plus the rent reserve and transaction fee buffer", async () => {
    await expect(fundDemoWallet(address, 100_000_000)).resolves.toEqual({ funded: true, signature: "test-signature" });
    expect(mocks.signTransfer).toHaveBeenCalledWith(address, 100_940_880);
    expect(mocks.confirmTransaction).toHaveBeenCalledWith({ signature: "test-signature",
      blockhash: SystemProgram.programId.toBase58(), lastValidBlockHeight: 123 }, "confirmed");
  });

  it("does not top up a wallet that already has enough test SOL", async () => {
    mocks.getBalance.mockResolvedValue(200_000_000);
    await expect(fundDemoWallet(address, 100_000_000)).resolves.toEqual({ funded: true, signature: null });
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });

  it.each([-1, 0, 1.5, 250_000_001])("rejects an unsupported stake of %s", async stake => {
    await expect(fundDemoWallet(address, stake)).rejects.toThrow("up to 0.25");
    expect(mocks.getGenesisHash).not.toHaveBeenCalled();
  });

  it("reports an empty treasury without sending anything", async () => {
    mocks.getBalance.mockResolvedValue(0);
    await expect(fundDemoWallet(address, 100_000_000)).rejects.toThrow("treasury needs more");
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });

  it("does not claim funding succeeded when the on-chain transaction failed", async () => {
    mocks.confirmTransaction.mockResolvedValue({ value: { err: { InstructionError: [0, "test"] } } });
    await expect(fundDemoWallet(address, 100_000_000)).rejects.toThrow("funding transaction failed");
  });
});
