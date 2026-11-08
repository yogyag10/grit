import { redirect } from "next/navigation";
import { NewPactForm } from "@/components/NewPactForm";
import { AppShell, PageHeader } from "@/components/ui/AppShell";
import { getUser } from "@/lib/supabase/server";

export default async function NewPactPage() {
  if (!(await getUser())) redirect("/");
  return (
    <AppShell>
      <PageHeader title="Create a pact" />
      <div className="px-4 pt-4">
        <NewPactForm />
      </div>
    </AppShell>
  );
}
