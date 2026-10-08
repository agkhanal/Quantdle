import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { countMentions, latestChatId } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * GET [?after=<id>]: how many messages that @mention you came after the last one you saw, and the newest message id
 * (so someone who has never opened the chat starts with nothing unread). Private to the signed-in player, never cached.
 */
export async function GET(req: Request) {
  const username = sessionUser(req);
  const headers = { "Cache-Control": "no-store" };
  if (!username) return NextResponse.json({ count: 0, latest: 0 }, { headers });
  const raw = new URL(req.url).searchParams.get("after");
  const latest = await latestChatId();
  const after = raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : null;
  return NextResponse.json({ count: after === null ? 0 : await countMentions(username, after), latest }, { headers });
}
