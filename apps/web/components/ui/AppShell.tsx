import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

/** Mobile column with room for the floating bottom nav. */
export function AppShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <>
      <main className={`mx-auto w-full max-w-md ${nav ? "pb-28" : ""}`}>{children}</main>
      {nav && <BottomNav />}
    </>
  );
}

export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}
