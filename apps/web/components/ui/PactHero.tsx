import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { SceneKind } from "@/lib/spots";
import { MapInset, Scene } from "./art";
import { RouteMapButton } from "./RouteMapButton";
import { ShareButton } from "./ShareButton";
import { Badge } from "./primitives";

/** Full-bleed illustration with a back button, share button, title and map inset. */
export function PactHero({
  scene,
  title,
  eyebrow,
  eyebrowClass = "text-ink",
  backHref,
  sharePath,
  demo,
  height = 300,
}: {
  scene: SceneKind;
  title: string;
  eyebrow: string;
  eyebrowClass?: string;
  backHref: string;
  sharePath: string;
  demo?: boolean;
  height?: number;
}) {
  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <Scene kind={scene} className="h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/30 via-transparent to-canvas" />
      <Link
        href={backHref}
        aria-label="Back"
        className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-canvas/80 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Link>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {demo && <Badge tone="demo">Demo pact</Badge>}
        <ShareButton path={sharePath} title={title} />
      </div>
      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${eyebrowClass}`}>{eyebrow}</p>
          <h1 className="text-[32px] font-extrabold leading-[1.05] tracking-tight [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">{title}</h1>
        </div>
        <RouteMapButton spot={scene} className="shrink-0">
          <MapInset size={96} />
        </RouteMapButton>
      </div>
    </div>
  );
}
