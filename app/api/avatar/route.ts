import { NextResponse } from "next/server";
import { rateLimited, sessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getProfile, removeAvatar, saveAvatar } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** The browser shrinks pictures to a small square JPEG before upload; this is the server-side limit. */
const MAX_BYTES = 80_000;

function sniff(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

/** POST the raw image bytes (JPEG, PNG or WebP, up to 80 KB). */
export async function POST(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(req, "avatar", 10, 3600)) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "That picture is too large." }, { status: 413 });
  }
  if (!sniff(bytes)) return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 415 });

  await saveAvatar(username, Buffer.from(bytes).toString("base64"));
  logActivity("profile", username, "uploaded a profile picture");
  return NextResponse.json({ profile: await getProfile(username) });
}

export async function DELETE(req: Request) {
  const username = sessionUser(req);
  if (!username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await removeAvatar(username);
  logActivity("profile", username, "removed their profile picture");
  return NextResponse.json({ profile: await getProfile(username) });
}
