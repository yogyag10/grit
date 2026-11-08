"use client";

import { Compass, Lock, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { PhotoCard } from "@/components/ui/PhotoCard";
import { EmptyState } from "@/components/ui/primitives";
import type { PactStatus, SceneKind } from "@/lib/spots";

export interface ExploreCard {
  id: string;
  title: string;
  scene: SceneKind;
  status: PactStatus;
  pill: string;
  lines: string[];
  footer: string;
  searchText: string;
  cta: { label: string; href: string; variant: "primary" | "secondary" | "light"; lock: boolean };
}

const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live" },
  { key: "ended", label: "Ended" },
] as const;

export function ExploreList({ cards }: { cards: ExploreCard[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = cards.filter((c) => (tab === "all" || c.status === tab) && (!q || c.searchText.includes(q)));

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <label className="flex h-[52px] items-center gap-2.5 rounded-full bg-card px-[18px] text-muted focus-within:ring-2 focus-within:ring-oath">
        <Search className="size-5" aria-hidden="true" />
        <span className="sr-only">Search pacts</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pacts"
          className="flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter pacts">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath ${
              tab === t.key ? "bg-ink text-oath-ink" : "bg-card text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-[15px] font-semibold">
        <span>Near UBC</span>
        <span className="text-muted">Starting soonest</span>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Compass className="size-8" />}
          text={cards.length === 0 ? "No pacts yet. Open an invite link from your group, or create one." : "No pacts match that."}
        />
      ) : (
        shown.map((c) => (
          <PhotoCard
            key={c.id}
            href={`/pacts/${c.id}`}
            title={c.title}
            scene={c.scene}
            status={c.status}
            pill={c.pill}
            lines={c.lines}
            footer={
              <>
                <span className="flex items-center gap-1.5 text-[13px] text-muted">
                  {c.cta.lock && <Lock className="size-4" aria-hidden="true" />}
                  {c.footer}
                </span>
                <Link href={c.cta.href} className={buttonClass({ variant: c.cta.variant, size: "sm", full: false })}>
                  {c.cta.label}
                </Link>
              </>
            }
          />
        ))
      )}
    </div>
  );
}
