export type SceneKind = "beach" | "forest" | "track";
export type PactStatus = "upcoming" | "live" | "ended" | "cancelled";

const SCENES: SceneKind[] = ["beach", "forest", "track"];
const DAY_MS = 86_400_000;

/** Decorative artwork only: a stable pick per pact. It does not claim where the pact runs. */
export function sceneFor(id: string): SceneKind {
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
