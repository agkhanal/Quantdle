import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { claimEgg, getProfile } from "@/lib/profile";
import { EGG_POINTS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/** POST: click the L in the logo. Pays a small one-time bonus per account. */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(req, "egg", 20, 600)) return NextResponse.json({ error: "Easy there." }, { status: 429 });

  const profile = await claimEgg(username);
  if (!profile) return NextResponse.json({ claimed: false, profile: await getProfile(username) });
  return NextResponse.json({ claimed: true, points: EGG_POINTS, profile });
}
