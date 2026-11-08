import { Check, ExternalLink, X } from "lucide-react";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  tone = "card",
  ...rest
}: { children: ReactNode; className?: string; tone?: "card" | "oath" | "soft" } & React.HTMLAttributes<HTMLElement>) {
  const bg = tone === "oath" ? "bg-oath text-oath-ink" : tone === "soft" ? "bg-oath-soft" : "bg-card";
  return (
    <section className={`rounded-[18px] p-4 ${bg} ${className}`} {...rest}>
      {children}
    </section>
  );
}

type BadgeTone = "counted" | "missed" | "demo" | "neutral";
const BADGE: Record<BadgeTone, string> = {
  counted: "bg-oath text-oath-ink",
  missed: "bg-missed-soft text-missed",
  demo: "bg-demo-soft text-demo",
  neutral: "bg-line text-ink",
};

/** Always an icon or a word, never colour alone. */
export function Badge({ tone, children, className = "" }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  const size = tone === "demo" ? "px-[9px] py-[5px] text-[11px]" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${size} ${BADGE[tone]} ${className}`}>
      {tone === "counted" && <Check className="size-4" aria-hidden="true" />}
      {tone === "missed" && <X className="size-4" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatTile({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-[18px] bg-card p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-[26px] font-bold leading-tight tabular-nums ${accent ? "text-oath" : ""}`}>{value}</span>
    </div>
  );
}

export function ProgressBar({ percent, label, className = "" }: { percent: number; label: string; className?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={`h-3 overflow-hidden rounded-full bg-line ${className}`}
    >
      <div className="h-full rounded-full bg-oath" style={{ width: `${value}%` }} />
    </div>
  );
}

export function DevnetBanner() {
  return <div className="bg-card py-1.5 text-center text-xs text-muted">Devnet only · no real money</div>;
}

export function ExplorerLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-oath underline underline-offset-2">
      {children}
      <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function Note({ tone, children }: { tone: "ok" | "warn"; children: ReactNode }) {
  return (
    <p role="status" className={`text-sm ${tone === "ok" ? "text-oath" : "text-demo"}`}>
      {children}
    </p>
  );
}

export function EmptyState({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] bg-card px-6 py-10 text-center text-muted">
      <span aria-hidden="true">{icon}</span>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function StepDots({ step, of }: { step: number; of: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={`h-1.5 w-7 rounded-full ${i < step ? "bg-oath" : "bg-line"}`} aria-hidden="true" />
      ))}
      <span className="ml-1">
        Step {step} of {of}
      </span>
    </div>
  );
}
