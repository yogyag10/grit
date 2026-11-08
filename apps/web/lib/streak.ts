const DAY_MS = 86_400_000;
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", year: "numeric", month: "2-digit", day: "2-digit" });

/** Start of the Monday-first week containing `date`, in Vancouver time, as a UTC-midnight timestamp (stable key). */
export function weekStart(date: Date): number {
  const [y, m, d] = dayFmt.format(date).split("-").map(Number);
  const day = Date.UTC(y, m - 1, d);
  return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
}

export interface WeekCell {
  start: number;
  runs: number;
  current: boolean;
}

/** The last `count` weeks (oldest first, ending with this week) with the number of counted runs in each. */
export function weeklyRuns(runDates: string[], now = new Date(), count = 5): WeekCell[] {
  const thisWeek = weekStart(now);
  const perWeek = new Map<number, number>();
  for (const iso of runDates) {
    const key = weekStart(new Date(iso));
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }
  return Array.from({ length: count }, (_, i) => {
    const start = thisWeek - (count - 1 - i) * 7 * DAY_MS;
    return { start, runs: perWeek.get(start) ?? 0, current: start === thisWeek };
  });
}

/** Weeks in a row with at least one counted run. This week doesn't break the streak until it ends. */
export function weeklyStreak(runDates: string[], now = new Date()): number {
  const keys = new Set(runDates.map((iso) => weekStart(new Date(iso))));
  let week = weekStart(now);
  if (!keys.has(week)) week -= 7 * DAY_MS;
  let streak = 0;
  while (keys.has(week)) {
    streak += 1;
    week -= 7 * DAY_MS;
  }
  return streak;
}
