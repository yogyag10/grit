import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NewGroupForm } from "@/components/community/CommunityForms";
import { AppShell } from "@/components/ui/AppShell";
import { getUser } from "@/lib/supabase/server";

export default async function NewGroupPage() {
  if (!(await getUser())) redirect("/");
  return (
    <AppShell nav={false}>
      <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
        <header className="flex items-center gap-3">
          <Link
            href="/community"
            aria-label="Back to community"
            className="flex size-11 items-center justify-center rounded-full bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Start a group</h1>
        </header>
        <p className="text-muted">
          A group has its own chat. Keep it private and share the invite code with friends, or open it to every verified UBC student.
        </p>
        <NewGroupForm />
      </div>
    </AppShell>
  );
}
