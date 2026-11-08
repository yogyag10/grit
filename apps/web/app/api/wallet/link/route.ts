import { randomBytes } from "node:crypto";
import bs58 from "bs58";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { isWalletAddress } from "@/lib/solana";
import { createSupabaseAdmin, getUser } from "@/lib/supabase/server";
import {
  buildLinkMessage,
  challengeExpired,
  LINK_COOKIE,
  LINK_TTL_MS,
  parseChallenge,
  verifyWalletSignature,
} from "@/lib/wallet-link";

/** Step 1: issue a one-time message for the wallet to sign. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const address = request.nextUrl.searchParams.get("address");
  if (!isWalletAddress(address)) return NextResponse.json({ error: "That isn't a valid wallet address." }, { status: 400 });

  const challenge = { address, nonce: randomBytes(16).toString("hex"), issuedAt: new Date().toISOString() };
  const res = NextResponse.json({ message: buildLinkMessage(user.email, challenge) });
  res.cookies.set(LINK_COOKIE, JSON.stringify(challenge), {
    httpOnly: true,
    sameSite: "strict",
    secure: appUrl().startsWith("https://"),
    path: "/api/wallet",
    maxAge: LINK_TTL_MS / 1000,
  });
  return res;
}

/** Step 2: verify the ed25519 signature and store the address. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const store = await cookies();
  const challenge = parseChallenge(store.get(LINK_COOKIE)?.value);
  store.delete({ name: LINK_COOKIE, path: "/api/wallet" });
  if (!challenge || challengeExpired(challenge)) {
    return NextResponse.json({ error: "That request expired. Try linking again." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  let signature: Uint8Array;
  try {
    signature = bs58.decode(String(body.signature ?? ""));
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (body.address !== challenge.address || !verifyWalletSignature(challenge.address, buildLinkMessage(user.email, challenge), signature)) {
    return NextResponse.json({ error: "The wallet signature didn't match. Try again." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("wallet_address").eq("id", user.id).single();
  if (profile?.wallet_address && profile.wallet_address !== challenge.address) {
    // Payouts go to the linked wallet, so don't let it change while deposits are in play.
    const { count } = await admin.from("deposits").select("signature", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "You've already made a deposit with your current wallet, so it can't be changed." },
        { status: 409 },
      );
    }
  }

  const { error } = await admin.from("profiles").update({ wallet_address: challenge.address }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That wallet is already linked to another Oathmile account." }, { status: 409 });
    }
    console.error("wallet link failed", error.code);
    return NextResponse.json({ error: "Couldn't link the wallet. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, address: challenge.address });
}
