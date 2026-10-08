import { NextResponse } from "next/server";
import { incr } from "@/lib/store";
import { isAdmin, rateLimited, sessionUser } from "@/lib/auth";
import { cleanText, clearChat, deleteMessage, extractMentions, getMute, isRepeat, muteNotice, postMessage, readChat, rememberText } from "@/lib/chat";
import { logActivity } from "@/lib/activity";
import { avatarUrlFor, findUser } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * GET [?after=<id>]: the newest messages, or only those after an id. The response is the same for everyone,
 * so it is cached for a second at the edge: many people polling cost the database very little.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("after");
  const after = raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : null;
  return NextResponse.json(await readChat(after), {
    headers: { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=1" },
  });
}

/** Chat commands (a message starting with "/"), admins only. Returns the response, or null if it isn't a known command. */
async function command(username: string, text: string): Promise<NextResponse | null> {
  const [name] = text.slice(1).split(" ");
  switch (name.toLowerCase()) {
    case "clear": {
      if (!isAdmin(username)) return NextResponse.json({ error: "Only admins can use that command." }, { status: 403 });
      const event = await clearChat();
      logActivity("admin", username, "cleared the chat");
      return NextResponse.json({ message: event, info: "Chat cleared." });
    }
    default:
      return null;
  }
}

/** POST { text }: send a message (signed-in players only). Admins can also send commands like "/clear". */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const text = cleanText(body.text);

  // Everything the checks and the message need is read at once (one round trip, not one after another).
  const [ipLimited, sent, mute, repeat, avatar, found] = await Promise.all([
    rateLimited(req, "chat", 90, 60),
    // About one message every 2 seconds per player.
    incr(`rl:chatuser:${username.toLowerCase()}:${Math.floor(Date.now() / 10_000)}`, 20),
    getMute(username),
    text ? isRepeat(username, text) : false,
    avatarUrlFor(username),
    // Only @names that are real accounts count as mentions (and get notified).
    Promise.all(extractMentions(text).map((n) => findUser(n))),
  ]);
  if (ipLimited) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  if (sent > 5) return NextResponse.json({ error: "You're sending messages too fast." }, { status: 429 });
  if (mute) return NextResponse.json({ error: muteNotice(mute) }, { status: 403 });
  if (!text) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  if (text.startsWith("/")) {
    const done = await command(username, text);
    if (done) return done;
  }
  if (repeat) return NextResponse.json({ error: "Don't repeat yourself." }, { status: 429 });

  const mentions = found.filter((n): n is string => n !== null);
  const [message] = await Promise.all([postMessage(username, avatar, text, mentions), rememberText(username, text)]);
  logActivity("chat", username, `said: ${text.slice(0, 120)}`);
  return NextResponse.json({ message });
}

/** DELETE ?id=<id>: remove a message (admins only). */
export async function DELETE(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  const removed = await deleteMessage(id);
  if (removed) logActivity("admin", sessionUser(req) ?? "admin", `deleted ${removed.u}'s chat message: ${removed.t.slice(0, 80)}`);
  return NextResponse.json({ deleted: removed !== null });
}
