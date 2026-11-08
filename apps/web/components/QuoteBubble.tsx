"use client";

import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/quotes";

const CYCLE_MS = 15_000;

/** One quote at a time in an italic bubble, changing every 15 seconds. Pauses while hovered or focused. */
export function QuoteBubble() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const q = QUOTES[index];
  return (
    <figure
      className="flex flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div key={index} className="relative rounded-[22px] rounded-bl-md bg-card p-5 motion-safe:animate-[fadeIn_600ms_ease]">
        <blockquote className="text-lg italic leading-snug text-ink">&ldquo;{q.text}&rdquo;</blockquote>
      </div>
      <figcaption className="pl-2 text-sm text-muted">
        {q.by}, {q.source}
      </figcaption>
    </figure>
  );
}
