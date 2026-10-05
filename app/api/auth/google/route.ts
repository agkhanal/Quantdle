import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/auth";
import { OAUTH_COOKIE, googleEnabled, startOAuth } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Kicks off "Sign in with Google": sets a short-lived state cookie and redirects to Google. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleEnabled()) return NextResponse.redirect(`${origin}/?auth_error=google_disabled`);
  if (await rateLimited(req, "google", 30, 600)) return NextResponse.redirect(`${origin}/?auth_error=rate_limited`);

  const { url, cookie } = startOAuth(req);
  const res = NextResponse.redirect(url);
  res.cookies.set({
    name: OAUTH_COOKIE,
    value: cookie,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
