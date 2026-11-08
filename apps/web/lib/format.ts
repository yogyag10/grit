const LAMPORTS_PER_SOL = 1_000_000_000;

export function km(meters: number, digits = 1): string {
  return `${(meters / 1000).toFixed(digits)} km`;
}

export function sol(lamports: number): string {
  return `${Number((lamports / LAMPORTS_PER_SOL).toFixed(4))} SOL`;
}

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Vancouver",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Shown in Vancouver time, where every member is. */
export function when(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** Money for cards: 0.10 SOL, or 0.166 SOL when the third decimal matters. */
export function solShort(lamports: number): string {
  const value = lamports / LAMPORTS_PER_SOL;
  return `${value.toFixed(Math.abs(value * 100 - Math.round(value * 100)) < 1e-9 ? 2 : 3)} SOL`;
}

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", month: "short", day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", weekday: "short" });

export const shortDate = (iso: string): string => dayFmt.format(new Date(iso));
export const weekday = (iso: string): string => weekdayFmt.format(new Date(iso));
