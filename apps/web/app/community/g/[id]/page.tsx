import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChatRoom } from "@/components/community/ChatRoom";
import { CopyButton, JoinGroupButton, LeaveGroupButton } from "@/components/community/CommunityForms";
import { AppShell } from "@/components/ui/AppShell";
import { Card } from "@/components/ui/primitives";
import { isGroupMember, loadGroup, loadMessages, memberCounts } from "@/lib/community-server";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect("/");
  const { id } = await params;

  const admin = createSupabaseAdmin();
  const group = await loadGroup(admin, id);
  if (!group) notFound();
  const member = await isGroupMember(admin, group.id, user.id);
  // Private groups don't exist for people without the code.
  if (!member && group.visibility !== "public") notFound();

  const counts = await memberCounts(admin, [group.id]);
  const members = counts.get(group.id) ?? 0;
  const meta = `${members} ${members === 1 ? "member" : "members"} · ${group.visibility === "private" ? "Private group" : "Open group"}`;

  const header = (
    <header className="flex items-start gap-3">
      <Link
        href="/community"
        aria-label="Back to community"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">{group.name}</h1>
        {group.description && <p className="text-muted [overflow-wrap:anywhere]">{group.description}</p>}
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {group.visibility === "private" && <Lock className="size-3.5" aria-hidden="true" />}
          {meta}
        </p>
      </div>
    </header>
  );

  if (!member) {
    return (
      <AppShell nav={false}>
        <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
          {header}
          <Card className="flex items-center justify-between gap-3 p-5">
            <p className="text-muted">Join to see the chat and post.</p>
            <JoinGroupButton groupId={group.id} label="Join group" />
          </Card>
        </div>
      </AppShell>
    );
  }

  const [initial, { data: profile }] = await Promise.all([
    loadMessages(admin, { campus: false, groupId: group.id }, user.id),
    admin.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  return (
    <AppShell nav={false}>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
        {header}

        {group.visibility === "private" && group.invite_code && (
          <Card aria-labelledby="invite" className="flex flex-col gap-3 p-5">
            <h2 id="invite" className="text-lg font-bold">
              Invite friends
            </h2>
            <p className="font-mono text-3xl font-extrabold tracking-[0.2em] text-oath">{group.invite_code}</p>
            <p className="text-sm text-muted">Anyone with this code can join this group and read its chat. Only share it with people you trust.</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={group.invite_code} label="Copy code" />
              <CopyButton path={`/community/join/${group.invite_code}`} label="Copy invite link" />
            </div>
          </Card>
        )}
        {group.visibility === "public" && (
          <div>
            <CopyButton path={`/community/g/${group.id}`} label="Copy group link" />
          </div>
        )}

        <ChatRoom channel={group.id} initial={initial} hasName={!!profile?.display_name} placeholder={`Message ${group.name}`} />

        <LeaveGroupButton groupId={group.id} />
      </div>
    </AppShell>
  );
}
