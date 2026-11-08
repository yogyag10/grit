export type SceneKind = "wreck-beach" | "pacific-spirit" | "spanish-banks" | "rose-garden";
export type PactStatus = "upcoming" | "live" | "ended" | "cancelled";

export const SPOTS: Record<SceneKind, { name: string; alt: string; match: RegExp }> = {
  "wreck-beach": { name: "Wreck Beach", alt: "Sunset over the water at Wreck Beach", match: /wreck/i },
  "pacific-spirit": { name: "Pacific Spirit", alt: "Sunrise over the trees in Pacific Spirit Park", match: /pacific|spirit/i },
  "spanish-banks": { name: "Spanish Banks", alt: "Spanish Banks beach with the North Shore behind", match: /spanish/i },
  "rose-garden": { name: "UBC Rose Garden", alt: "UBC Rose Garden with the water and mountains behind", match: /rose/i },
};
const SCENES = Object.keys(SPOTS) as SceneKind[];
const DAY_MS = 86_400_000;

/** The photo for a pact: its title names a spot, otherwise a stable pick by id (it does not claim where the pact runs). */
export function sceneFor(id: string, title?: string): SceneKind {
  const named = title && SCENES.find((k) => SPOTS[k].match.test(title));
  if (named) return named;
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SCENES[hash % SCENES.length];
}

export function pactStatus(
  p: { starts_at: string; ends_at: string; cancelled_at: string | null },
  now = new Date(),
): PactStatus {
  if (p.cancelled_at) return "cancelled";
  if (now.getTime() < Date.parse(p.starts_at)) return "upcoming";
  if (now.getTime() >= Date.parse(p.ends_at)) return "ended";
  return "live";
}

export function daysLeft(endsAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / DAY_MS));
}

export function pactLengthDays(p: { starts_at: string; ends_at: string }): number {
  return Math.max(1, Math.round((Date.parse(p.ends_at) - Date.parse(p.starts_at)) / DAY_MS));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
