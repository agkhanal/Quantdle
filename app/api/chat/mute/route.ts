import { NextResponse } from "next/server";
import { isAdmin, sessionUser } from "@/lib/auth";
import { muteUser } from "@/lib/chat";
import { findUser } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** POST { username, minutes? }: stop a player from chatting for a while (admins only, default 60 minutes). */
export async function POST(req: Request) {
  if (!isAdmin(sessionUser(req))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { username?: unknown; minutes?: unknown };
  const target = typeof body.username === "string" ? await findUser(body.username.slice(0, 40)) : null;
  if (!target) return NextResponse.json({ error: "No such player." }, { status: 404 });
  if (isAdmin(target)) return NextResponse.json({ error: "Admins can't be muted." }, { status: 400 });
  const minutes = Math.min(Math.max(Number(body.minutes) || 60, 1), 7 * 24 * 60);
  await muteUser(target, minutes);
  return NextResponse.json({ muted: target, minutes });
}
