"use client";

import { ArrowUpDown, Check, Compass, Lock, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  startsAt: number;
  feeLamports: number;
  cta: { label: string; href: string; variant: "primary" | "secondary" | "light"; lock: boolean };
}

const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live" },
  { key: "ended", label: "Ended" },
] as const;

const SORTS = [
  { key: "soonest", label: "Recommended" },
  { key: "start-asc", label: "Start: early to late" },
  { key: "start-desc", label: "Start: late to early" },
  { key: "fee-asc", label: "Joining fee: low to high" },
  { key: "fee-desc", label: "Joining fee: high to low" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function sortCards(cards: ExploreCard[], key: SortKey): ExploreCard[] {
  if (key === "soonest") return cards;
  const by: Record<Exclude<SortKey, "soonest">, (a: ExploreCard, b: ExploreCard) => number> = {
    "start-asc": (a, b) => a.startsAt - b.startsAt,
    "start-desc": (a, b) => b.startsAt - a.startsAt,
    "fee-asc": (a, b) => a.feeLamports - b.feeLamports || a.startsAt - b.startsAt,
    "fee-desc": (a, b) => b.feeLamports - a.feeLamports || a.startsAt - b.startsAt,
  };
  return [...cards].sort(by[key]);
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
      >
        <ArrowUpDown className="size-4 text-muted" aria-hidden="true" />
        Sort
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-card py-1.5 shadow-lg" aria-label="Sort pacts">
          {SORTS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={value === s.key}
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
                className="flex h-11 w-full items-center justify-between gap-2 px-4 text-left text-sm font-medium text-ink hover:bg-line focus-visible:bg-line focus-visible:outline-none"
              >
                {s.label}
                {value === s.key && <Check className="size-4 text-oath" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExploreList({ cards }: { cards: ExploreCard[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("soonest");
  const q = query.trim().toLowerCase();
  const shown = sortCards(
    cards.filter((c) => (tab === "all" || c.status === tab) && (!q || c.searchText.includes(q))),
    sort,
  );

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

      <div className="flex items-center justify-between text-[15px] font-semibold">
        <span>Near UBC</span>
        <SortMenu value={sort} onChange={setSort} />
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
