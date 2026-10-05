import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { incr, setIfAbsent } from "@/lib/store";
import { progressTtl } from "@/lib/profile";
import { unseal } from "@/lib/token";

export const dynamic = "force-dynamic";

/**
 * POST { token, step } -> { hint }. Hints stay on the server so taking one can be counted:
 * for signed-in players it costs one of the six guesses (once per puzzle), same as on screen.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; step?: number };
  const puzzle = typeof body.token === "string" ? unseal(body.token) : null;
  if (!puzzle) return NextResponse.json({ error: "This puzzle has expired. Start a new one!" }, { status: 410 });
  const step = puzzle.steps[Number(body.step)];
  if (!step) return NextResponse.json({ error: "No such step." }, { status: 400 });
  if (await rateLimited(req, "hint", 60, 600)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  const user = sessionUser(req);
  if (user && (await setIfAbsent(`hint:${user.toLowerCase()}:${puzzle.id}`, "1"))) {
    await incr(`tries:${user.toLowerCase()}:${puzzle.id}`, progressTtl);
    logActivity("hint", user, `took a hint on "${puzzle.title}" (costs a guess)`);
  }
  return NextResponse.json({ hint: step.hint });
}
