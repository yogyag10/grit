import Link from "next/link";
import type { ReactNode } from "react";
import type { PactStatus, SceneKind } from "@/lib/spots";
import { MapInset, Scene } from "./art";
import { RouteMapButton } from "./RouteMapButton";
import { ShareButton } from "./ShareButton";

const PILL: Record<PactStatus, string> = {
  live: "text-oath",
  upcoming: "text-demo",
  ended: "text-[#d4d7d2]",
  cancelled: "text-missed",
};

/** Signature pattern: a big illustration with a map inset, a status pill and a share button. */
export function PhotoCard({
  href,
  title,
  scene,
  status,
  pill,
  lines,
  footer,
}: {
  href: string;
  title: string;
  scene: SceneKind;
  status: PactStatus;
  pill: string;
  lines: string[];
  footer: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-2.5">
      <div className="relative h-[220px] overflow-hidden rounded-[20px]">
        <Scene kind={scene} className="h-full w-full" />
        <span className={`absolute left-3 top-3.5 rounded-full bg-canvas/80 px-2.5 py-1.5 text-xs font-bold ${PILL[status]}`}>{pill}</span>
        <div className="absolute right-3 top-3">
          <ShareButton path={href} title={title} />
        </div>
        <RouteMapButton spot={scene} className="absolute bottom-3 right-3">
          <MapInset spot={scene} />
        </RouteMapButton>
      </div>
      <Link href={href} className="text-xl font-bold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath">
        {title}
      </Link>
      <div className="-mt-1.5 flex flex-col gap-1 text-sm text-muted">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-card py-2.5 pl-3.5 pr-2.5">{footer}</div>
    </article>
  );
}
