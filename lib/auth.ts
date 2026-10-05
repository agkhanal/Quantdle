import crypto from "node:crypto";
import { promisify } from "node:util";
import { get, incr, setIfAbsent } from "./store";

/**
 * Username + password accounts. Passwords are hashed with scrypt; the session is a
 * signed cookie (no session table needed).
 */

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

const secret = process.env.QUANTDLE_SECRET || crypto.randomBytes(32).toString("hex");
const sessionKey = crypto.createHash("sha256").update(`session:${secret}`).digest();

export const SESSION_COOKIE = "qd_session";
export const SESSION_DAYS = 30;

const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;

interface UserRecord {
  username: string; // display form, as typed at sign-up
  salt: string;
  hash: string;
  created: number;
}

const userKey = (username: string) => `user:${username.toLowerCase()}`;

export function validateUsername(username: unknown): string | null {
  return typeof username === "string" && USERNAME_RE.test(username)
    ? null
    : "Usernames are 3–20 characters: letters, numbers, _ or -.";
}

export function validateCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return "Usernames are 3–20 characters: letters, numbers, _ or -.";
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 100) {
    return "Passwords need at least 6 characters.";
  }
  return null;
}

export async function createUser(username: string, password: string): Promise<boolean> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)).toString("hex");
  const record: UserRecord = { username, salt, hash, created: Date.now() };
  return setIfAbsent(userKey(username), JSON.stringify(record));
}

/** Returns the display username if the password is right. */
export async function checkLogin(username: string, password: string): Promise<string | null> {
  const raw = await get(userKey(username));
  if (!raw) {
    await scrypt(password, "timing-equalizer", 64); // don't reveal which usernames exist via timing
    return null;
  }
  const rec = JSON.parse(raw) as UserRecord;
  if (!rec.hash) {
    await scrypt(password, "timing-equalizer", 64); // Google-only account: no password set
    return null;
  }
  const hash = await scrypt(password, rec.salt, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(rec.hash, "hex")) ? rec.username : null;
}

// ───────────── sessions ─────────────

function sign(payload: string) {
  return crypto.createHmac("sha256", sessionKey).update(payload).digest("base64url");
}

export function makeSession(username: string): string {
  const payload = `${Buffer.from(username).toString("base64url")}.${Date.now() + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload)}`;
}

/** The signed-in display username for a request, or null. */
/** Accounts that can use the admin tools (adjusting points). Matched case-insensitively against the signed-in username. */
export const ADMIN_USERNAMES = ["quantdle"];
export const isAdmin = (username: string | null | undefined) => !!username && ADMIN_USERNAMES.includes(username.toLowerCase());

export function sessionUser(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [name, exp, sig] = decodeURIComponent(match[1]).split(".");
  if (!name || !exp || !sig) return null;
  const expected = sign(`${name}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return Buffer.from(name, "base64url").toString("utf8");
}

// ───────────── pending Google sign-ins (verified with Google, username not chosen yet) ─────────────

export const PENDING_COOKIE = "qd_pending";
const PENDING_MINUTES = 15;

export function makePending(sub: string, suggested: string): string {
  const payload = `${Buffer.from(sub).toString("base64url")}.${Buffer.from(suggested).toString("base64url")}.${Date.now() + PENDING_MINUTES * 60_000}`;
  return `${payload}.${sign(`pending:${payload}`)}`;
}

export function pendingGoogle(req: Request): { sub: string; suggested: string } | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${PENDING_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [sub, suggested, exp, sig] = decodeURIComponent(match[1]).split(".");
  if (!sub || !suggested || !exp || !sig) return null;
  const expected = sign(`pending:${sub}.${suggested}.${exp}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return { sub: Buffer.from(sub, "base64url").toString("utf8"), suggested: Buffer.from(suggested, "base64url").toString("utf8") };
}

export const pendingCookie = (value: string, maxAgeSeconds: number) => ({
  name: PENDING_COOKIE,
  value,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
});

export const sessionCookie = (value: string, maxAgeSeconds: number) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
});

// ───────────── misc ─────────────

/** Simple fixed-window rate limit. Returns true if the caller is over the limit. */
export async function rateLimited(req: Request, bucket: string, max: number, windowSeconds: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  return (await incr(`rl:${bucket}:${ip}`, windowSeconds)) > max;
}
