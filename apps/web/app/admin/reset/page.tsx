import type { Metadata } from "next";
import Link from "next/link";
import { GritLogo } from "@/components/brand/GritLogo";
import { AppShell } from "@/components/ui/AppShell";
import { ResetPanel } from "./ResetPanel";

export const metadata: Metadata = { title: "Reset demo · Grit", robots: { index: false, follow: false } };

export default function AdminResetPage() {
  return (
    <AppShell nav={false}>
      <div className="flex min-h-screen flex-col gap-8 px-5 py-8">
        <Link href="/" aria-label="Grit home" className="self-start"><GritLogo size={32} /></Link>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-demo">Operator tools</p>
          <h1 className="text-[36px] font-extrabold leading-tight tracking-tight">A fresh start<br />for the demo.</h1>
          <p className="text-muted">Wipe app data and sign-in accounts, then create one fresh Demo pact with sample participants.</p>
        </div>
        <ResetPanel />
        <p className="text-sm text-muted">Already-sent Solana transactions stay on Devnet. After a reset, sign in again to use the fresh Demo.</p>
      </div>
    </AppShell>
  );
}
