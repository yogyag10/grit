"use client";

import { Check, Share } from "lucide-react";
import { useState } from "react";

/** Shares or copies a link to a page on this site. */
export function ShareButton({ path, title, className = "" }: { path: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sharing was cancelled or clipboard access was denied; nothing to recover.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share pact"}
      className={`flex size-11 items-center justify-center rounded-full bg-canvas/80 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath ${className}`}
    >
      {copied ? <Check className="size-5" aria-hidden="true" /> : <Share className="size-5" aria-hidden="true" />}
    </button>
  );
}
