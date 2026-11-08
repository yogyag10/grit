import { NextResponse, type NextRequest } from "next/server";
import { loadMembership, loadPact } from "@/lib/pacts";
import { buildReceipt, canViewReceipt } from "@/lib/receipt";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Public Pool Receipt data. No names; wallets truncated; no fitness data. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const pact = await loadPact(admin, id);
  if (!pact) return NextResponse.json({ error: "Pact not found." }, { status: 404 });

  const user = await getUser();
  const isMember = user ? !!(await loadMembership(admin, pact.id, user.id)) : false;
  if (!canViewReceipt(pact, isMember, request.nextUrl.searchParams.get("code"))) {
    return NextResponse.json({ error: "Pact not found." }, { status: 404 });
  }
  return NextResponse.json(await buildReceipt(admin, pact));
}
