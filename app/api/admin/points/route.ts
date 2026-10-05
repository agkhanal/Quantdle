import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin, rateLimited, sessionUser } from "@/lib/auth";
import { adminAdjustPoints } from "@/lib/profile";

export const dynamic = "force-dynamic";

const MAX_ADJUST = 100_000;

/** Either the signed-in admin account, or (if one is configured) the bearer secret. */
function authorized(req: Request): boolean {
  if (isAdmin(sessionUser(req))) return true;
  const secret = process.env.QUANTDLE_ADMIN_SECRET;
  if (!secret || secret.length < 16) return false; // switched off unless a real secret is configured
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * POST { username, points, reason? } as a signed-in admin account, or with `Authorization: Bearer $QUANTDLE_ADMIN_SECRET`
 * (that route is off unless the secret is set). Adds points (negative to remove) to a player and their school on all boards.
 */
export async function POST(req: Request) {
  if (await rateLimited(req, "admin", 20, 600)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  if (!authorized(req)) return NextResponse.json({ error: "Not found." }, { status: 404 }); // don't reveal the route exists

  const body = (await req.json().catch(() => ({}))) as { username?: unknown; points?: unknown; reason?: unknown };
  const points = Number(body.points);
  if (typeof body.username !== "string" || !Number.isInteger(points) || points === 0 || Math.abs(points) > MAX_ADJUST) {
    return NextResponse.json({ error: `Need a username and a non-zero whole number of points (at most ±${MAX_ADJUST}).` }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : "";

  const profile = await adminAdjustPoints(body.username.slice(0, 40), points, reason);
  if (!profile) return NextResponse.json({ error: "No such player." }, { status: 404 });
  return NextResponse.json({ profile });
}
