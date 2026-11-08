import { SPOTS, type SceneKind } from "@/lib/spots";

/** A photo of a UBC-area run spot. Credits are in public/spots/CREDITS.md. */
export function Scene({ kind, className = "" }: { kind: SceneKind; className?: string }) {
  const spot = SPOTS[kind];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed local photos, already resized
    <img src={`/spots/${kind}.jpg`} alt={spot.alt} loading="lazy" className={`${className} object-cover`} />
  );
}

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
