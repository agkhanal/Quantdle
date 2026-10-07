import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { claimEgg, getProfile } from "@/lib/profile";
import { EGG_POINTS, isEgg } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/** POST { egg? }: found an easter egg (the logo's L by default). Pays a one-time bonus per egg per account. */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(req, "egg", 20, 600)) return NextResponse.json({ error: "Easy there." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { egg?: unknown };
  const egg = body.egg ?? "logo";
  if (!isEgg(egg)) return NextResponse.json({ error: "No such egg." }, { status: 400 });

  const profile = await claimEgg(username, egg);
  if (!profile) return NextResponse.json({ claimed: false, profile: await getProfile(username) });
  return NextResponse.json({ claimed: true, points: EGG_POINTS[egg], profile });
}
