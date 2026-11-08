import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/community/ChatRoom";
import { AppShell } from "@/components/ui/AppShell";
import { loadMessages } from "@/lib/community-server";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CampusChatPage() {
  const user = await getUser();
  if (!user) redirect("/");
  const admin = createSupabaseAdmin();
  const [initial, { data: profile }] = await Promise.all([
    loadMessages(admin, { campus: true }, user.id),
    admin.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  return (
    <AppShell nav={false}>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-4">
        <header className="flex items-center gap-3">
          <Link
            href="/community"
            aria-label="Back to community"
            className="flex size-11 items-center justify-center rounded-full bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">UBC campus chat</h1>
            <p className="text-sm text-muted">Verified UBC students only</p>
          </div>
        </header>
        <ChatRoom channel="campus" initial={initial} hasName={!!profile?.display_name} placeholder="Message the UBC community" />
      </div>
    </AppShell>
  );
}
