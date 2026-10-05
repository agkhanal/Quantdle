import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { createBug, isDuplicate, myBugs, parseReportInput, recentCount } from "@/lib/bugs";

export const dynamic = "force-dynamic";

/** GET: your own reports (and clears the "updated" badge). */
export async function GET(req: Request) {
  const user = sessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ reports: await myBugs(user) }, { headers: { "Cache-Control": "private, no-store" } });
}

/** POST { category, title, body, tech? }: file a bug report (signed-in players only). */
export async function POST(req: Request) {
  const user = sessionUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to report a bug." }, { status: 401 });
  if (await rateLimited(req, "bugs", 20, 3600)) return NextResponse.json({ error: "Too many reports from this connection. Try again later." }, { status: 429 });

  const input = parseReportInput((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (input.body.length < 10) return NextResponse.json({ error: "Please describe what went wrong (at least a sentence)." }, { status: 400 });
  if ((await recentCount(user, 3600_000)) >= 5) return NextResponse.json({ error: "You've sent a lot of reports this hour. Please wait a bit." }, { status: 429 });
  if (await isDuplicate(user, input.body)) return NextResponse.json({ error: "You already sent that report." }, { status: 409 });

  const report = await createBug(user, input);
  return NextResponse.json({ report });
}
