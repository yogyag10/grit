/** Presentation fixtures only. These people have no accounts, deposits, or payout allocations. */
const NAMES = [
  "Alex M.", "Jamie L.", "Sam K.", "Taylor R.", "Jordan P.", "Casey W.",
  "Morgan T.", "Riley C.", "Avery S.", "Quinn B.", "Cameron D.", "Rowan H.",
  "Emerson F.", "Parker N.", "Finley A.", "Reese J.", "Sage V.", "Skyler E.",
  "Dakota G.", "Hayden I.", "Elliot Z.", "Charlie O.", "Blair U.", "Drew Y.",
  "River Q.", "Robin X.", "Jules M.", "Remy L.", "Lane K.", "Frankie R.",
];

/** Hard-coded distances (km) for the demo crowd, written for the 3 km demo goal. Fixtures for the demo video, not real runs. */
const DEMO_KM = [3.4, 3.0, 2.0, 3.5, 3.1, 1.2, 2.6, 3.0, 0.8, 3.2, 1.9, 3.6, 2.4, 3.0, 0.4, 2.9, 3.3, 1.5, 3.0, 2.2, 0.0, 3.8];

export interface DemoPerson {
  id: string;
  name: string;
  /** Distance in metres, capped at the pact goal. */
  meters: number;
}

/** The demo crowd for a demo pact: 22 fixed people with fixed distances. Empty for real pacts. */
export function demoPledges(pact: { id: string; is_demo: boolean; goal_meters?: number }): DemoPerson[] {
  if (!pact.is_demo) return [];
  return DEMO_KM.map((km, i) => ({
    id: `${pact.id}:sample:${i + 1}`,
    name: NAMES[i % NAMES.length],
    meters: Math.min(Math.round(km * 1000), pact.goal_meters ?? Infinity),
  }));
}

/** How many of the demo crowd have reached the goal. */
export function demoCleared(pact: { id: string; is_demo: boolean; goal_meters: number }): number {
  return demoPledges(pact).filter((p) => p.meters >= pact.goal_meters).length;
}
