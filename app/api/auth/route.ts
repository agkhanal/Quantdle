import { NextResponse } from "next/server";
import {
  SESSION_DAYS,
  checkLogin,
  createUser,
  makeSession,
  profile,
  rateLimited,
  sessionCookie,
  sessionUser,
  validateCredentials,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Who am I? */
export async function GET(req: Request) {
  const username = sessionUser(req);
  return NextResponse.json({ user: username ? await profile(username) : null });
}

/** { action: "signup" | "login" | "logout", username?, password? } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; username?: string; password?: string };

  if (body.action === "logout") {
    const res = NextResponse.json({ user: null });
    res.cookies.set(sessionCookie("", 0));
    return res;
  }

  if (body.action !== "signup" && body.action !== "login") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  if (await rateLimited(req, "auth", 20, 600)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const problem = validateCredentials(body.username, body.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { username, password } = body as { username: string; password: string };

  let name: string | null;
  if (body.action === "signup") {
    if (!(await createUser(username, password))) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    name = username;
  } else {
    name = await checkLogin(username, password);
    if (!name) return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ user: await profile(name) });
  res.cookies.set(sessionCookie(makeSession(name), SESSION_DAYS * 86_400));
  return res;
}