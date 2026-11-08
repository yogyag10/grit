// Grit wordmark: lowercase "grit" where the dot on the i is an up-pointing arrow.
// Usage: <GritLogo size={34} />  (size = font size in px)
type Props = { size?: number; color?: string; arrowColor?: string; className?: string };

export function GritLogo({ size = 34, color = "#F4F5F2", arrowColor = "#B6EA8C", className }: Props) {
  const arrowW = size * 0.34;
  return (
    <span
      role="img"
      aria-label="Grit"
      className={className}
      style={{ display: "inline-flex", alignItems: "baseline", fontSize: size, fontWeight: 800, letterSpacing: "-0.05em", color, lineHeight: 1 }}
    >
      <span aria-hidden="true">gr</span>
      <span aria-hidden="true" style={{ position: "relative", display: "inline-block" }}>
        {"ı" /* dotless i */}
        <svg
          width={arrowW}
          height={arrowW}
          viewBox="0 0 100 100"
          style={{ position: "absolute", left: "50%", top: -size * 0.2, marginLeft: -arrowW / 2 }}
        >
          <path d="M50 8 L96 90 L50 62 L4 90 Z" fill={arrowColor} stroke={arrowColor} strokeWidth={6} strokeLinejoin="round" />
        </svg>
      </span>
      <span aria-hidden="true">t</span>
    </span>
  );
}
