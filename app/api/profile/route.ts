import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { findUser, getProfile, parseLinkedIn, updateProfile } from "@/lib/profile";
import { schoolById } from "@/lib/schools";

export const dynamic = "force-dynamic";

/** GET ?u=name -> that player's public profile. Without ?u, your own. */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("u");
  const username = name ? await findUser(name.slice(0, 40)) : sessionUser(req);
  if (!username) return NextResponse.json({ error: "No such player." }, { status: 404 });
  return NextResponse.json({ profile: await getProfile(username) }, { headers: { "Cache-Control": "no-store" } });
}

/** POST { school?: id | null, linkedin?: url | null }: edit your own profile. */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(req, "profile", 30, 600)) return NextResponse.json({ error: "Too many changes. Try again in a few minutes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { school?: unknown; linkedin?: unknown };
  const edit: { school?: string | null; linkedin?: string | null } = {};

  if (body.school !== undefined) {
    if (body.school === null) edit.school = null;
    else if (typeof body.school === "string" && schoolById(body.school)) edit.school = body.school;
    else return NextResponse.json({ error: "Pick a school from the list." }, { status: 400 });
  }

  if (body.linkedin !== undefined) {
    if (body.linkedin === null || (typeof body.linkedin === "string" && body.linkedin.trim() === "")) edit.linkedin = null;
    else {
      const handle = typeof body.linkedin === "string" ? parseLinkedIn(body.linkedin) : null;
      if (!handle) {
        return NextResponse.json({ error: "That doesn't look like a LinkedIn profile link, e.g. linkedin.com/in/your-name." }, { status: 400 });
      }
      edit.linkedin = handle;
    }
  }

  return NextResponse.json({ profile: await updateProfile(username, edit) });
}
