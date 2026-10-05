import { NextResponse } from "next/server";
import { incr } from "@/lib/store";
import { isAdmin, rateLimited, sessionUser } from "@/lib/auth";
import { cleanText, deleteMessage, isMuted, isRepeat, postMessage, readChat } from "@/lib/chat";
import { logActivity } from "@/lib/activity";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * GET [?after=<id>]: the newest messages, or only those after an id. The response is the same for everyone,
 * so it is cached for a couple of seconds at the edge: many people polling cost the database very little.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("after");
  const after = raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : null;
  return NextResponse.json(await readChat(after), {
    headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=2" },
  });
}

/** POST { text }: send a message (signed-in players only). */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });

  if (await rateLimited(req, "chat", 90, 60)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  // About one message every 2 seconds per player.
  if ((await incr(`rl:chatuser:${username.toLowerCase()}:${Math.floor(Date.now() / 10_000)}`, 20)) > 5) {
    return NextResponse.json({ error: "You're sending messages too fast." }, { status: 429 });
  }
  if (await isMuted(username)) return NextResponse.json({ error: "You've been muted for a while." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const text = cleanText(body.text);
  if (!text) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  if (await isRepeat(username, text)) return NextResponse.json({ error: "Don't repeat yourself." }, { status: 429 });

  const { avatar } = await getProfile(username);
  const message = await postMessage(username, avatar, text);
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
