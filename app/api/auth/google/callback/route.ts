import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { SESSION_DAYS, makePending, makeSession, pendingCookie, sessionCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { OAUTH_COOKIE, finishOAuth, googleEnabled, linkedUsername, suggestUsername } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Google redirects back here with ?code&state. Verifies state, starts a session (or a pending username choice for new users). */
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
    const username = await linkedUsername(identity.sub);

    const res = NextResponse.redirect(`${url.origin}/`);
    if (username) {
      logActivity("account", username, "signed in with Google");
      res.cookies.set(sessionCookie(makeSession(username), SESSION_DAYS * 86_400));
    } else {
      // First time with Google: let them pick a username before the account exists.
      res.cookies.set(pendingCookie(makePending(identity.sub, suggestUsername(identity.name)), 15 * 60));
    }
    res.cookies.set({ name: OAUTH_COOKIE, value: "", path: "/api/auth/google", maxAge: 0 });
    return res;
  } catch {
    return fail("google_failed");
  }
}
