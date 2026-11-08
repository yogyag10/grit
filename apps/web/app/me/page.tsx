import Link from "next/link";
import { redirect } from "next/navigation";
import { km, sol, when } from "@/lib/format";
import { createSupabaseServer, getUser } from "@/lib/supabase/server";

export default async function MyPactsPage() {
  const user = await getUser();
  if (!user) redirect("/signin");

  // RLS: memberships are own-only; pacts are visible to members.
  const supabase = await createSupabaseServer();
  const { data: rows } = await supabase
    .from("memberships")
    .select("joined_at, pacts (id, title, goal_meters, stake_lamports, starts_at, ends_at, is_demo, cancelled_at)")
    .is("left_at", null)
    .order("joined_at", { ascending: false });
  const pacts = (rows ?? []).map((r) => r.pacts).filter((p) => p !== null);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-bold">
          MovePact
        </Link>
        <Link href="/onboarding" className="text-sm text-slate-600 underline">
          Setup
        </Link>
      </header>
      <h1 className="text-2xl font-bold">My pacts</h1>
      {pacts.length === 0 ? (
        <p className="text-slate-600">You haven't joined a pact yet. Open an invite link from your group to join one.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pacts.map((p) => (
            <li key={p.id}>
              <Link href={`/pacts/${p.id}`} className="block rounded-xl border border-slate-200 p-4 hover:border-emerald-600">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{p.title}</p>
                  {p.is_demo && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900">Demo</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {km(p.goal_meters, 0)} · {sol(p.stake_lamports)} · {when(p.starts_at)} to {when(p.ends_at)}
                  {p.cancelled_at ? " · cancelled" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
