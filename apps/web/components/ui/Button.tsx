import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light" | "strava" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none";
const variants: Record<Variant, string> = {
  primary: "bg-oath text-oath-ink hover:brightness-95",
  secondary: "border border-line bg-card text-ink hover:bg-line",
  ghost: "text-muted hover:text-ink",
  light: "bg-ink text-oath-ink hover:brightness-95",
  strava: "bg-[#fc4c02] text-white hover:brightness-95",
  danger: "border border-missed/40 bg-missed-soft text-missed hover:brightness-110",
};
const sizes: Record<Size, string> = { md: "h-12 px-6 text-base", sm: "h-10 px-4 text-sm" };

export function buttonClass({
  variant = "primary",
  size = "md",
  full = true,
}: { variant?: Variant; size?: Size; full?: boolean } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${full ? "w-full" : ""}`;
}

type Shared = { variant?: Variant; size?: Size; full?: boolean; children: ReactNode };

export function Button({
  variant,
  size,
  full,
  loading,
  children,
  className = "",
  disabled,
  ...rest
}: Shared & { loading?: boolean } & ComponentProps<"button">) {
  return (
    <button className={`${buttonClass({ variant, size, full })} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  full,
  href,
  external,
  children,
  className = "",
}: Shared & { href: string; external?: boolean; className?: string }) {
  const cls = `${buttonClass({ variant, size, full })} ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
