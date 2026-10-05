import { NextResponse } from "next/server";
import { readActivity } from "@/lib/activity";
import { isAdmin, sessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET [?after=<id>]: the activity log (admins only). Never cached: it's private. */
export async function GET(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const raw = new URL(req.url).searchParams.get("after");
  const after = raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : null;
  return NextResponse.json(await readActivity(after), { headers: { "Cache-Control": "private, no-store" } });
}
