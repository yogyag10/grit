import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/primitives";
import { getUser } from "@/lib/supabase/server";

/** Placeholder until pact creation is built. Pacts are created by the team for now. */
export default async function NewPactPage() {
  if (!(await getUser())) redirect("/");
  return (
    <AppShell>
      <PageHeader title="Create a pact" />
      <div className="px-4 pt-4">
        <EmptyState
          icon={<Plus className="size-8" />}
          text="Creating your own pact is coming soon. For now, join one from Explore or open an invite link from your group."
          action={
            <ButtonLink href="/explore" size="sm" full={false}>
              Explore pacts
            </ButtonLink>
          }
        />
      </div>
    </AppShell>
  );
}
