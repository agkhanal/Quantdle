import { NextResponse } from "next/server";
import { readActivity } from "@/lib/activity";
import { isAdmin, sessionUser } from "@/lib/auth";
import { openCount } from "@/lib/bugs";
import { openReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** GET [?after=<id>]: the activity log (admins only). Never cached: it's private. */
export async function GET(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const raw = new URL(req.url).searchParams.get("after");
  const after = raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : null;
  const [log, bugsOpen, reportsOpen] = await Promise.all([readActivity(after), openCount(), openReports()]);
  return NextResponse.json({ ...log, bugsOpen, reportsOpen }, { headers: { "Cache-Control": "private, no-store" } });
}
