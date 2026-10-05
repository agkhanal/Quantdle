import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { SESSION_DAYS, makeSession, sessionCookie } from "@/lib/auth";
import { OAUTH_COOKIE, finishOAuth, googleEnabled, usernameForGoogle } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Google redirects back here with ?code&state. Verifies state, links the account, starts a session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${url.origin}/?auth_error=${reason}`);
    res.cookies.set({ name: OAUTH_COOKIE, value: "", path: "/api/auth/google", maxAge: 0 });
    return res;
  };

  if (!googleEnabled()) return fail("google_disabled");
  if (url.searchParams.get("error")) return fail("google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${OAUTH_COOKIE}=([^;]+)`))?.[1];
  const [savedState, verifier] = decodeURIComponent(cookie ?? "").split(".");
  if (!code || !state || !savedState || !verifier) return fail("google_failed");
  if (state.length !== savedState.length || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(savedState))) {
    return fail("google_failed");
  }

  try {
    const identity = await finishOAuth(req, code, verifier);
    if (!identity) return fail("google_failed");
    const username = await usernameForGoogle(identity);

    const res = NextResponse.redirect(`${url.origin}/`);
    res.cookies.set(sessionCookie(makeSession(username), SESSION_DAYS * 86_400));
    res.cookies.set({ name: OAUTH_COOKIE, value: "", path: "/api/auth/google", maxAge: 0 });
    return res;
  } catch {
    return fail("google_failed");
  }
}
