/** Presentation fixtures only. These people have no accounts, deposits, or payout allocations. */
const NAMES = [
  "Alex M.", "Jamie L.", "Sam K.", "Taylor R.", "Jordan P.", "Casey W.",
  "Morgan T.", "Riley C.", "Avery S.", "Quinn B.", "Cameron D.", "Rowan H.",
  "Emerson F.", "Parker N.", "Finley A.", "Reese J.", "Sage V.", "Skyler E.",
  "Dakota G.", "Hayden I.", "Elliot Z.", "Charlie O.", "Blair U.", "Drew Y.",
  "River Q.", "Robin X.", "Jules M.", "Remy L.", "Lane K.", "Frankie R.",
];

export function demoPledges(pact: { id: string; is_demo: boolean }) {
  if (!pact.is_demo) return [];
  let hash = 0;
  for (const ch of pact.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const count = 20 + hash % 11;
  return Array.from({ length: count }, (_, i) => ({
    id: `${pact.id}:sample:${i + 1}`,
    name: NAMES[(i + hash % NAMES.length) % NAMES.length],
  }));
}
