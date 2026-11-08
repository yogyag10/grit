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
