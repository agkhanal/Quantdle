import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { getProfile, playersBoard, schoolsBoard } from "@/lib/profile";
import { storeKind } from "@/lib/store";
import { PERIODS, type LeaderboardResponse, type Period } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET ?type=players|schools&period=daily|weekly|all (all-time by default) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "schools" ? "schools" : "players";
  const p = url.searchParams.get("period") as Period;
  const period: Period = PERIODS.includes(p) ? p : "all";
  const me = sessionUser(req);

  const board =
    type === "players"
      ? await playersBoard(period, me)
      : await schoolsBoard(period, me ? ((await getProfile(me)).school?.id ?? null) : null);

  const body: LeaderboardResponse = { ...board, storage: storeKind };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
