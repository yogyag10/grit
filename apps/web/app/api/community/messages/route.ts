import { NextResponse } from "next/server";
import { cleanMessage, MESSAGES_PER_MINUTE } from "@/lib/community";
import { isGroupMember, loadMessages, parseChannel } from "@/lib/community-server";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";

/** Messages in a chat, oldest first. `after` returns only newer ones, for polling. */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const channel = parseChannel(params.get("channel"));
  if (!channel) return NextResponse.json({ error: "Unknown chat." }, { status: 400 });

  const admin = createSupabaseAdmin();
  if (!channel.campus && !(await isGroupMember(admin, channel.groupId, user.id))) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }
  const afterRaw = Number(params.get("after"));
  const after = Number.isSafeInteger(afterRaw) && afterRaw >= 0 && params.has("after") ? afterRaw : undefined;
  try {
    return NextResponse.json({ messages: await loadMessages(admin, channel, user.id, after) });
  } catch (error) {
    console.error("loading messages failed", (error as Error).message);
    return NextResponse.json({ error: "Couldn't load messages. Try again." }, { status: 500 });
  }
}

/** Posts one message to the campus chat or to a group the member belongs to. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const channel = parseChannel(payload.channel);
  if (!channel) return NextResponse.json({ error: "Unknown chat." }, { status: 400 });
  const body = cleanMessage(payload.body);
  if (!body) return NextResponse.json({ error: "Write a message up to 500 characters." }, { status: 400 });

  const admin = createSupabaseAdmin();
  if (!channel.campus && !(await isGroupMember(admin, channel.groupId, user.id))) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const { data: profile } = await admin.from("profiles").select("display_name").eq("id", user.id).single();
  if (!profile?.display_name) {
    return NextResponse.json({ error: "Pick a name before you chat.", code: "NAME_REQUIRED" }, { status: 409 });
  }

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= MESSAGES_PER_MINUTE) {
    return NextResponse.json({ error: "You're sending messages fast. Wait a moment." }, { status: 429 });
  }

  const { data, error } = await admin
    .from("messages")
    .insert({ group_id: channel.campus ? null : channel.groupId, user_id: user.id, body })
    .select("id, created_at")
    .single();
  if (error || !data) {
    console.error("posting message failed", error?.code);
    return NextResponse.json({ error: "Couldn't send that. Try again." }, { status: 500 });
  }
  return NextResponse.json({
    message: { id: data.id, name: profile.display_name, body, createdAt: data.created_at, mine: true },
  });
}
