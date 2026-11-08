import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { JoinGroupButton } from "@/components/community/CommunityForms";
import { AppShell } from "@/components/ui/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { normalizeCode } from "@/lib/community";
import { isGroupMember, memberCounts } from "@/lib/community-server";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The page an invite link opens: shows the group and asks before joining. */
export default async function JoinByLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getUser();
  if (!user) redirect("/");
  const { code: raw } = await params;
  const code = normalizeCode(raw);

  const admin = createSupabaseAdmin();
  const { data: group } = code
    ? await admin.from("groups").select("id, name, description, visibility").eq("invite_code", code).maybeSingle()
    : { data: null };

  if (!group || !code) {
    return (
      <AppShell nav={false}>
        <div className="flex flex-col gap-4 px-4 pt-8">
          <EmptyState
            icon={<Users className="size-8" />}
            text="That invite code doesn't match a group. Check it with whoever sent it."
            action={
              <ButtonLink href="/community" size="sm" full={false}>
                Back to community
              </ButtonLink>
            }
          />
        </div>
      </AppShell>
    );
  }
  if (await isGroupMember(admin, group.id, user.id)) redirect(`/community/g/${group.id}`);
  const members = (await memberCounts(admin, [group.id])).get(group.id) ?? 0;

  return (
    <AppShell nav={false}>
      <div className="flex flex-col gap-4 px-4 pt-8">
        <p className="font-semibold text-oath">You&apos;re invited</p>
        <Card className="flex flex-col gap-3 p-5">
          <h1 className="text-2xl font-bold tracking-tight [overflow-wrap:anywhere]">{group.name}</h1>
          {group.description && <p className="text-muted [overflow-wrap:anywhere]">{group.description}</p>}
          <p className="text-sm text-muted">
            {members} {members === 1 ? "member" : "members"} · {group.visibility === "private" ? "Private group" : "Open group"}
          </p>
          <div className="self-end">
            <JoinGroupButton code={code} label="Join group" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
