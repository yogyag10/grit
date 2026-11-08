import { cadOf, solShort } from "@/lib/format";

/** A SOL amount with its CAD value underneath, for stat tiles. */
export function SolValue({ lamports }: { lamports: number }) {
  return (
    <>
      {solShort(lamports)}
      <span className="block text-sm font-normal text-muted">≈ {cadOf(lamports)}</span>
    </>
  );
}
