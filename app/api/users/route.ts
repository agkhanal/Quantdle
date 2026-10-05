import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/auth";
import { findUser, getProfile } from "@/lib/profile";
import { searchUsernames } from "@/lib/userSearch";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET ?q=ali -> up to 8 public profiles whose username matches (open to everyone, signed in or not). */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 30);
  if (await rateLimited(req, "usersearch", 120, 600)) {
    return NextResponse.json({ error: "Too many searches. Try again in a few minutes." }, { status: 429 });
  }
  const names = await searchUsernames(q);
  const display = await Promise.all(names.map((n) => findUser(n)));
  const profiles: Profile[] = await Promise.all(display.filter((n): n is string => n !== null).map((n) => getProfile(n)));
  return NextResponse.json({ profiles }, { headers: { "Cache-Control": "no-store" } });
}
