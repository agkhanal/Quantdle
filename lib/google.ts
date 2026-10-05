import crypto from "node:crypto";
import { get, set, setIfAbsent } from "./store";

/**
 * "Sign in with Google" (OAuth 2.0 authorization code flow + PKCE).
 * A Google account is linked to an ordinary Quantdle username on first sign-in, so the
 * leaderboard, sessions and everything downstream keep working off usernames.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const OAUTH_COOKIE = "qd_oauth";

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function redirectUri(req: Request): string {
  return process.env.GOOGLE_REDIRECT_URI || `${new URL(req.url).origin}/api/auth/google/callback`;
}

const b64 = (buf: Buffer) => buf.toString("base64url");

/** Fresh state + PKCE pair, and the Google URL to send the browser to. */
export function startOAuth(req: Request) {
  const state = b64(crypto.randomBytes(16));
  const verifier = b64(crypto.randomBytes(32));
  const challenge = b64(crypto.createHash("sha256").update(verifier).digest());
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: `${AUTH_URL}?${params}`, cookie: `${state}.${verifier}` };
}

export interface GoogleIdentity {
  sub: string;
  name?: string;
}

/** Trades the code for tokens and reads the identity from the ID token (fetched directly from Google over TLS). */
export async function finishOAuth(req: Request, code: string, verifier: string): Promise<GoogleIdentity | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  const payload = id_token?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      aud?: string;
      iss?: string;
      name?: string;
    };
    if (!claims.sub || claims.aud !== process.env.GOOGLE_CLIENT_ID) return null;
    if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return null;
    return { sub: claims.sub, name: claims.name };
  } catch {
    return null;
  }
}

/** Suggests a public username from a Google display name (never the email). */
export function suggestUsername(name?: string): string {
  const base = (name ?? "").split(/\s+/)[0].replace(/[^A-Za-z0-9_-]/g, "").slice(0, 14);
  return base.length >= 3 ? base : "player";
}

/** The Quantdle username already linked to this Google account, if any. */
export const linkedUsername = (sub: string) => get(`google:${sub}`);

/**
 * Creates the account for a Google identity under the chosen username.
 * Returns the username, or null if it's taken (or the Google account got linked in the meantime).
 */
export async function claimGoogleUsername(sub: string, username: string): Promise<string | null> {
  if (await linkedUsername(sub)) return null;
  // Password-less record: no salt/hash, so password login can never succeed for it.
  const record = { username, salt: "", hash: "", created: Date.now(), google: true };
  if (!(await setIfAbsent(`user:${username.toLowerCase()}`, JSON.stringify(record)))) return null;
  await set(`google:${sub}`, username);
  return username;
}
