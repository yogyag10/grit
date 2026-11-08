"use client";

import { ConnectionProvider } from "@solana/wallet-adapter-react";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

/** Demo wallets sign locally; only the Devnet RPC connection is shared. */
export function SolanaProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC} config={{ commitment: "confirmed" }}>
      {children}
    </ConnectionProvider>
  );
}
