"use client";

import { Plus, Search, TrendingUp, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/explore", label: "Explore", Icon: Search },
  { href: "/community", label: "Community", Icon: Users },
  { href: "/pacts/new", label: "Create a pact", Icon: Plus },
  { href: "/activity", label: "Activity", Icon: TrendingUp },
  { href: "/me", label: "Me", Icon: User },
] as const;

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-4 z-10 mx-auto flex h-16 max-w-[calc(28rem-1.5rem)] items-center justify-between rounded-full border border-[#383b38] bg-[#202220]/95 p-1.5"
    >
      {ITEMS.map(({ href, label, Icon }) =>
        href === "/pacts/new" ? (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex size-[52px] items-center justify-center rounded-full bg-oath text-oath-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Icon className="size-6" strokeWidth={2.5} aria-hidden="true" />
          </Link>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={isActive(path, href) ? "page" : undefined}
            className={`flex h-[52px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath ${
              isActive(path, href) ? "bg-line text-ink" : "text-muted"
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
