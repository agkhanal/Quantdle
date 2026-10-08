import { NextResponse } from "next/server";
import { isAdmin, sessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { banUser, isBanned, mutedUntil, unbanUser } from "@/lib/chat";
import { findUser } from "@/lib/profile";

export const dynamic = "force-dynamic";

const target = (raw: unknown) => (typeof raw === "string" ? findUser(raw.slice(0, 40)) : Promise.resolve(null));

/** GET ?username=: whether a player is banned or muted (admins only), so the chat menu can offer the right actions. */
export async function GET(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const username = await target(new URL(req.url).searchParams.get("username"));
  if (!username) return NextResponse.json({ error: "No such player." }, { status: 404 });
  const [banned, muted] = await Promise.all([isBanned(username), mutedUntil(username)]);
  return NextResponse.json({ username, banned, mutedUntil: muted }, { headers: { "Cache-Control": "private, no-store" } });
}

/** POST { username }: ban a player from the chat until it's lifted (admins only). */
export async function POST(req: Request) {
  const admin = sessionUser(req);
  if (!isAdmin(admin)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const username = await target(((await req.json().catch(() => ({}))) as { username?: unknown }).username);
  if (!username) return NextResponse.json({ error: "No such player." }, { status: 404 });
  if (isAdmin(username)) return NextResponse.json({ error: "Admins can't be banned." }, { status: 400 });
  await banUser(username, admin!);
  logActivity("admin", admin!, `banned ${username} from the chat`);
  return NextResponse.json({ banned: username });
}

/** DELETE ?username=: lift a chat ban (admins only). */
export async function DELETE(req: Request) {
  const admin = sessionUser(req);
  if (!isAdmin(admin)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const username = await target(new URL(req.url).searchParams.get("username"));
  if (!username) return NextResponse.json({ error: "No such player." }, { status: 404 });
  await unbanUser(username);
  logActivity("admin", admin!, `unbanned ${username} from the chat`);
  return NextResponse.json({ unbanned: username });
}
