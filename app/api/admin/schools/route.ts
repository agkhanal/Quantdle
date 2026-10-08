import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { isAdmin, rateLimited, sessionUser } from "@/lib/auth";
import { rebuildSchoolBoards } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST { apply?: boolean } as a signed-in admin. Without `apply` it only reports which school totals are off
 * (a preview); with `apply: true` it corrects them. Each total should equal the sum of its players' points.
 */
export async function POST(req: Request) {
  const admin = sessionUser(req);
  if (!isAdmin(admin)) return NextResponse.json({ error: "Not found." }, { status: 404 }); // don't reveal the route exists
  if (await rateLimited(req, "admin-schools", 20, 600)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { apply?: unknown };
  const apply = body.apply === true;
  const diffs = await rebuildSchoolBoards(apply);
  const changes = diffs.all.length + diffs.daily.length + diffs.weekly.length;
  if (apply && changes > 0) logActivity("admin", admin!, `rebuilt the school leaderboards (${changes} ${changes === 1 ? "total" : "totals"} corrected)`);
  return NextResponse.json({ applied: apply, changes, diffs });
}
