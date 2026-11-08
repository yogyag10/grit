"use client";

import "@solana/wallet-adapter-react-ui/styles.css";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

/** Phantom (and other Wallet Standard wallets) register themselves, so no adapters are listed. */
export function SolanaProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
