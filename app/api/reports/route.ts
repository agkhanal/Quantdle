import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { getMessage } from "@/lib/chat";
import { findUser } from "@/lib/profile";
import { cleanDetails, createReport, isDuplicate, parseReason } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** POST { username, reason, details?, messageId? }: report a player (signed-in players only). */
export async function POST(req: Request) {
  const by = sessionUser(req);
  if (!by) return NextResponse.json({ error: "Sign in to report a player." }, { status: 401 });
  if (await rateLimited(req, "reports", 15, 3600)) return NextResponse.json({ error: "Too many reports from this connection. Try again later." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { username?: unknown; reason?: unknown; details?: unknown; messageId?: unknown };
  const user = typeof body.username === "string" ? await findUser(body.username.slice(0, 40)) : null;
  if (!user) return NextResponse.json({ error: "No such player." }, { status: 404 });
  if (user.toLowerCase() === by.toLowerCase()) return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });

  const reason = parseReason(body.reason);
  const details = cleanDetails(body.details);
  if (reason === "Other" && details.length < 5) return NextResponse.json({ error: "Tell us a little about what happened." }, { status: 400 });

  // The message is looked up on the server, so a report can't put words in someone's mouth.
  const id = Number(body.messageId);
  const message = Number.isInteger(id) && id > 0 ? await getMessage(id) : null;
  const quoted = message && message.u.toLowerCase() === user.toLowerCase() ? message : null;

  if (await isDuplicate(by, user, quoted?.id ?? null)) return NextResponse.json({ error: "You already reported that." }, { status: 409 });
  const report = await createReport(by, user, reason, details, quoted);
  return NextResponse.json({ report: { id: report.id } });
}
