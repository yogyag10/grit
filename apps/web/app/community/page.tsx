import { MessagesSquare, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupRow } from "@/components/community/GroupRow";
import { JoinByCode, JoinGroupButton } from "@/components/community/CommunityForms";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { buttonClass } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { loadMessages, memberCounts } from "@/lib/community-server";
import { initials } from "@/lib/spots";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const admin = createSupabaseAdmin();

  let data;
  try {
    const [{ data: mine, error: mineError }, { data: open, error: openError }, preview] = await Promise.all([
      admin.from("group_members").select("group_id, groups (id, name, description, visibility)").eq("user_id", user.id),
      admin
        .from("groups")
        .select("id, name, description, visibility")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(30),
      loadMessages(admin, { campus: true }, user.id),
    ]);
    if (mineError || openError) throw new Error((mineError ?? openError)?.message);
    const myGroups = (mine ?? []).flatMap((m) => (m.groups ? [m.groups] : []));
    const joined = new Set(myGroups.map((g) => g.id));
    const toJoin = (open ?? []).filter((g) => !joined.has(g.id));
    const counts = await memberCounts(admin, [...myGroups, ...toJoin].map((g) => g.id));
    data = { myGroups, toJoin, counts, preview: preview.slice(-3) };
  } catch (error) {
    console.error("loading community failed", (error as Error).message);
    return (
      <AppShell>
        <PageHeader title="Community" />
        <div className="px-4 pt-4">
          <EmptyState icon={<Users className="size-8" />} text="Community isn't available right now. Try again in a moment." />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Community" />
      <div className="flex flex-col gap-5 px-4 pt-4">
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-oath-soft px-3.5 py-2 text-sm font-semibold text-oath">
          <ShieldCheck className="size-4" aria-hidden="true" /> Verified UBC students only
        </p>

        <Card aria-labelledby="campus" className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 id="campus" className="text-xl font-bold">
              UBC campus chat
            </h2>
            <Link href="/community/campus" className="font-semibold text-oath underline underline-offset-2">
              Open
            </Link>
          </div>
          {data.preview.length === 0 ? (
            <p className="text-muted">No messages yet. Start the conversation.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.preview.map((m) =>
                m.mine ? (
                  <li key={m.id} className="ml-auto max-w-[80%] rounded-[20px] bg-oath px-4 py-3 text-oath-ink [overflow-wrap:anywhere]">
                    {m.body}
                  </li>
                ) : (
                  <li key={m.id} className="flex items-end gap-2.5">
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line text-sm font-bold">
                      {initials(m.name)}
                    </span>
                    <div className="max-w-[80%] rounded-[20px] bg-line/70 px-4 py-3 [overflow-wrap:anywhere]">
                      <p className="text-sm font-semibold text-muted">{m.name}</p>
                      <p>{m.body}</p>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
          <Link
            href="/community/campus"
            className="flex h-[52px] items-center justify-between rounded-full border border-line bg-canvas pl-5 pr-1.5 text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
          >
            Message the UBC community
            <span className="flex size-10 items-center justify-center rounded-full bg-oath text-oath-ink" aria-hidden="true">
              <MessagesSquare className="size-5" />
            </span>
          </Link>
        </Card>

        <section aria-labelledby="mine" className="flex flex-col gap-3">
          <h2 id="mine" className="text-xl font-bold">
            Your groups
          </h2>
          {data.myGroups.length === 0 ? (
            <p className="rounded-[18px] bg-card p-4 text-muted">You haven&apos;t joined a group yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.myGroups.map((g) => (
                <GroupRow
                  key={g.id}
                  {...g}
                  members={data.counts.get(g.id) ?? 1}
                  action={
                    <Link href={`/community/g/${g.id}`} className={buttonClass({ variant: "secondary", size: "sm", full: false })}>
                      Open
                    </Link>
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="join" className="flex flex-col gap-3">
          <h2 id="join" className="text-xl font-bold">
            Groups to join
          </h2>
          {data.toJoin.length === 0 ? (
            <p className="rounded-[18px] bg-card p-4 text-muted">No open groups yet. Start one for your floor or club.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.toJoin.map((g) => (
                <GroupRow
                  key={g.id}
                  {...g}
                  members={data.counts.get(g.id) ?? 0}
                  action={<JoinGroupButton groupId={g.id} />}
                />
              ))}
            </ul>
          )}
        </section>

        <Card className="p-5">
          <JoinByCode />
        </Card>

        <Link
          href="/community/new"
          className="flex h-14 items-center justify-center rounded-full border border-dashed border-line font-semibold hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
        >
          Start a group for your floor or club
        </Link>
      </div>
    </AppShell>
  );
}
