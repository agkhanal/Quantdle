import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { dailyNumber, dailyPuzzle } from "@/lib/bank";
import { LAUNCH_DAY } from "@/lib/day";
import { resultsFor } from "@/lib/profile";
import type { ArchiveDay, ArchiveResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The past dailies, newest first, with the signed-in player's result on each (from their account, so it follows them across devices). */
export async function GET(req: Request) {
  const today = dailyNumber();
  const days: ArchiveDay[] = [];
  for (let n = today - 1; n >= LAUNCH_DAY; n--) {
    const p = dailyPuzzle(n);
    days.push({ day: n, title: p.title, category: p.category, difficulty: p.difficulty });
  }

  const results: Record<number, "won" | "lost"> = {};
  const user = sessionUser(req);
  if (user) {
    const numbers = [today, ...days.map((d) => d.day)];
    const ids = numbers.map((n) => `daily-${n}-${dailyPuzzle(n).id}`);
    const { won, lost } = await resultsFor(user, ids);
    numbers.forEach((n, i) => {
      if (won[i]) results[n] = "won";
      else if (lost[i]) results[n] = "lost";
    });
  }

  const now = dailyPuzzle(today);
  const current: ArchiveDay = { day: today, title: now.title, category: now.category, difficulty: now.difficulty };
  const body: ArchiveResponse = { today, current, launch: LAUNCH_DAY, days, results };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
