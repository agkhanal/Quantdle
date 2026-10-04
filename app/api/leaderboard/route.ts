import { NextResponse } from "next/server";
import { LEADERBOARD, profile, sessionUser } from "@/lib/auth";
import { storeKind, zTop } from "@/lib/store";
import type { LeaderboardResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const username = sessionUser(req);
  const [top, me] = await Promise.all([zTop(LEADERBOARD, 50), username ? profile(username) : null]);
  const body: LeaderboardResponse = {
    top: top.map((t, i) => ({ rank: i + 1, username: t.member, solved: t.score })),
    me,
    storage: storeKind,
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}