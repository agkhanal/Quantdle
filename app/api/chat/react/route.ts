import { NextResponse } from "next/server";
import { incr } from "@/lib/store";
import { rateLimited, sessionUser } from "@/lib/auth";
import { getMute, muteNotice, toggleReaction } from "@/lib/chat";
import { isReaction } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST { id, kind }: react to a message, or take your reaction back (signed-in players only). */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in to react." }, { status: 401 });
  if (await rateLimited(req, "chatreact", 120, 60)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  if ((await incr(`rl:chatreact:${username.toLowerCase()}:${Math.floor(Date.now() / 10_000)}`, 20)) > 10) {
    return NextResponse.json({ error: "You're reacting too fast." }, { status: 429 });
  }
  const mute = await getMute(username);
  if (mute) return NextResponse.json({ error: muteNotice(mute) }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { id?: unknown; kind?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1 || !isReaction(body.kind)) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const reactions = await toggleReaction(username, id, body.kind);
  if (!reactions) return NextResponse.json({ error: "That message is gone." }, { status: 404 });
  return NextResponse.json({ r: reactions });
}
