import { NextResponse } from "next/server";
import { isAdmin, sessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getMute, listMutes, muteUser, unmuteUser } from "@/lib/chat";
import { findUser } from "@/lib/profile";

export const dynamic = "force-dynamic";

const MAX_MINUTES = 7 * 24 * 60;

/** GET [?username=]: who is muted or banned from chat right now, or just one player (admins only). */
export async function GET(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const one = new URL(req.url).searchParams.get("username");
  if (one !== null) {
    const username = await findUser(one.slice(0, 40));
    if (!username) return NextResponse.json({ error: "No such player." }, { status: 404 });
    const mute = await getMute(username);
    return NextResponse.json({ username, until: mute ? mute.until : false }, { headers: { "Cache-Control": "no-store" } });
  }
  const mutes = await listMutes();
  const names = await Promise.all(mutes.map((m) => findUser(m.username)));
  return NextResponse.json(
    { muted: mutes.map((m, i) => ({ username: names[i] ?? m.username, until: m.until })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST { username, minutes? | ban? | unmute? } (admins only). `minutes` mutes for that long (default 60), `ban: true` stops
 * a player chatting for good, `unmute: true` lets them back in.
 */
export async function POST(req: Request) {
  const admin = sessionUser(req);
  if (!isAdmin(admin)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { username?: unknown; minutes?: unknown; ban?: unknown; unmute?: unknown };
  const target = typeof body.username === "string" ? await findUser(body.username.slice(0, 40)) : null;
  if (!target) return NextResponse.json({ error: "No such player." }, { status: 404 });
  if (isAdmin(target)) return NextResponse.json({ error: "Admins can't be muted." }, { status: 400 });

  if (body.unmute === true) {
    await unmuteUser(target);
    logActivity("admin", admin ?? "admin", `let ${target} back into chat`);
    return NextResponse.json({ unmuted: target });
  }
  if (body.ban === true) {
    await muteUser(target, null);
    logActivity("admin", admin ?? "admin", `banned ${target} from chat`);
    return NextResponse.json({ banned: target });
  }
  const minutes = Math.min(Math.max(Number(body.minutes) || 60, 1), MAX_MINUTES);
  await muteUser(target, minutes);
  logActivity("admin", admin ?? "admin", `muted ${target} in chat for ${minutes} min`);
  return NextResponse.json({ muted: target, minutes });
}

