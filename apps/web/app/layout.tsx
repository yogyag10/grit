import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaProviders } from "@/components/SolanaProviders";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Grit",
  description: "Make a running pact with UBC friends. Clear the distance, get your deposit back plus a share of the pool. 0% fee.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0f0e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
