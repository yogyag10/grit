import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SolanaProviders } from "@/components/SolanaProviders";

export const metadata: Metadata = {
  title: "Oathmile",
  description: "Put your money where your movement is. Commit with your UBC community and get your deposit back.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
