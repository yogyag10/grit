import type { SceneKind } from "@/lib/spots";

const LABEL: Record<SceneKind, string> = {
  beach: "Placeholder illustration: beach with driftwood",
  forest: "Placeholder illustration: forest trail",
  track: "Placeholder illustration: running track at sunset",
};

/** Drawn placeholder scenes from the Grit design handoff. Swap for our own photos in public/spots/ later. */
export function Scene({ kind, className = "" }: { kind: SceneKind; className?: string }) {
  return (
    <svg viewBox="0 0 358 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label={LABEL[kind]} className={className}>
      {kind === "beach" && (
        <>
          <rect width="358" height="99" fill="#7FA3C6" />
          <path d="M0 83.6 L60 72.6 L120 81.4 L200 68.2 L280 79.2 L358 70.4 L358 99 L0 99Z" fill="#5C7591" />
          <rect y="99" width="358" height="44" fill="#3F6E8C" />
          <rect y="143" width="358" height="77" fill="#9C8B72" />
          <g stroke="#6B5B47" strokeWidth="5" strokeLinecap="round">
            <path d="M30 165 L110 160.6" />
            <path d="M140 176 L230 171.6" />
            <path d="M60 198 L170 191.4" />
            <path d="M200 202.4 L290 198" />
          </g>
          <path d="M268 220 L268 88 Q318 44 358 66 L358 220Z" fill="#2F4A2A" />
        </>
      )}
      {kind === "forest" && (
        <>
          <rect width="358" height="220" fill="#2E4430" />
          <rect width="358" height="77" fill="#9DB6A2" />
          <g fill="#1F3322">
            <path d="M20 220 L60 33 L100 220Z" />
            <path d="M250 220 L300 11 L350 220Z" />
            <path d="M90 220 L120 66 L150 220Z" />
            <path d="M210 220 L235 55 L260 220Z" />
          </g>
          <path d="M150 220 Q175 143 180 110 Q185 143 225 220Z" fill="#8A7A5C" />
          <g fill="#3E5C3F">
            <circle cx="40" cy="176" r="22" />
            <circle cx="320" cy="187" r="26" />
          </g>
        </>
      )}
      {kind === "track" && (
        <>
          <rect width="358" height="110" fill="#D9A27A" />
          <circle cx="250.6" cy="92.4" r="26" fill="#F2D3A0" />
          <rect y="92.4" width="358" height="26.4" fill="#3B4A3A" />
          <rect y="118.8" width="358" height="101.2" fill="#A9483A" />
          <g stroke="#E9DDD0" strokeWidth="2" fill="none">
            <path d="M0 145.2 Q179 132 358 145.2" />
            <path d="M0 171.6 Q179 154 358 171.6" />
            <path d="M0 202.4 Q179 180.4 358 202.4" />
          </g>
        </>
      )}
    </svg>
  );
}

/** Small static map in the corner of a photo card. Decorative: it does not show the real route. */
export function MapInset({ size = 80, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border-[3px] border-white bg-[#E6E9E0] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label="Map thumbnail">
        <path d="M0 0 H30 Q20 40 0 50Z" fill="#A9CFE0" />
        <g stroke="#FFFFFF" strokeWidth="4" fill="none">
          <path d="M0 70 L80 58" />
          <path d="M50 0 L58 80" />
        </g>
        <g fill="#D7DECF">
          <rect x="56" y="14" width="14" height="10" rx="2" />
          <rect x="20" y="40" width="12" height="12" rx="2" />
        </g>
      </svg>
    </div>
  );
}

/** Large decorative map with a sample route loop, for onboarding. */
export function RouteMap({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <rect width="390" height="300" fill="#E6E9E0" />
      <path d="M0 0 H120 Q80 140 0 190Z" fill="#A9CFE0" />
      <g stroke="#FFFFFF" strokeWidth="12" fill="none">
        <path d="M150 0 Q170 90 275 105 L390 105" />
        <path d="M265 0 L285 300" />
        <path d="M0 245 L390 205" />
      </g>
      <g fill="#D7DECF">
        <rect x="300" y="135" width="70" height="44" rx="6" />
        <rect x="170" y="225" width="60" height="40" rx="6" />
      </g>
      <path
        d="M120 230 C150 190 200 175 215 150 C230 115 250 100 285 108 C330 120 330 175 290 215 C260 245 190 255 125 232Z"
        fill="none"
        stroke="#3E9A32"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="120" cy="230" r="11" fill="#E6E9E0" stroke="#1A1C1A" strokeWidth="5" />
    </svg>
  );
}
