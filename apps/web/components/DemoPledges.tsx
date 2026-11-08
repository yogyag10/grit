import { demoPledges } from "@/lib/demo-pledges";
import { initials } from "@/lib/spots";
import { Badge, Card } from "./ui/primitives";

export function DemoPledges({ pact, actualMembers, expanded = false }: {
  pact: { id: string; is_demo: boolean };
  actualMembers: number;
  expanded?: boolean;
}) {
  const samples = demoPledges(pact);
  if (!samples.length) return null;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{samples.length + actualMembers} pledged</h2>
        <Badge tone="demo">Demo crowd</Badge>
      </div>
      <div className="flex shrink-0 -space-x-2" aria-hidden="true">
        {samples.slice(0, 4).map((person, i) => (
          <span key={person.id} className={`flex size-10 items-center justify-center rounded-full border-2 border-card text-xs font-bold ${i % 2 ? "bg-demo-soft text-demo" : "bg-oath-soft text-oath"}`}>
            {initials(person.name)}
          </span>
        ))}
        <span className="flex size-10 items-center justify-center rounded-full border-2 border-card bg-line text-xs font-semibold">+{samples.length - 4}</span>
      </div>
      <details open={expanded}>
        <summary className="cursor-pointer text-sm font-semibold text-oath">See everyone</summary>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {samples.map(person => (
            <li key={person.id} className="flex items-center gap-2 rounded-xl bg-canvas p-2.5">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-line text-xs font-semibold">{initials(person.name)}</span>
              <p className="min-w-0 truncate text-sm font-semibold">{person.name}</p>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
