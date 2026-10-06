import { NextResponse } from "next/server";
import { aiEnabled, generatePuzzle as generateWithAI } from "@/lib/ai";
import { dailyNumber, dailyPuzzle } from "@/lib/bank";
import { generatePuzzle } from "@/lib/generators";
import { seal } from "@/lib/token";
import { DIFFICULTIES, isTopic, toPublic, type Difficulty, type Puzzle, type PuzzleResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // only matters if AI puzzles are turned on

/** Set QUANTDLE_AI_PUZZLES=1 (plus ANTHROPIC_API_KEY) to have Claude write practice puzzles instead. */
const useAI = () => aiEnabled() && process.env.QUANTDLE_AI_PUZZLES === "1";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "practice" ? "practice" : "daily";

  if (mode === "daily") {
    const n = dailyNumber();
    // A per-day id, so the leaderboard credits each day's puzzle once even though the bank repeats.
    // It names the bank puzzle too, so progress saved against a different puzzle isn't restored onto this one.
    const bank = dailyPuzzle(n);
    const puzzle: Puzzle = { ...bank, id: `daily-${n}-${bank.id}` };
    return json({ token: seal(puzzle), puzzle: toPublic(puzzle), source: "bank", dailyNumber: n });
  }

  const d = url.searchParams.get("difficulty") as Difficulty;
  const difficulty: Difficulty = DIFFICULTIES.includes(d) ? d : "medium";
  const t = url.searchParams.get("topic");
  const topic = isTopic(t) ? t : undefined; // anything else (or nothing) means a mix of every topic

  if (useAI()) {
    try {
      const puzzle = await generateWithAI(difficulty, topic);
      if (puzzle) return json({ token: seal(puzzle), puzzle: toPublic(puzzle), source: "ai" });
    } catch (err) {
      console.error("[quantdle] AI generation failed, using a generated puzzle:", err);
    }
  }

  const puzzle = generatePuzzle(difficulty, undefined, topic);
  return json({ token: seal(puzzle), puzzle: toPublic(puzzle), source: "generated" });
}

function json(body: PuzzleResponse) {
  return NextResponse.json({ ...body, aiJudge: aiEnabled() }, { headers: { "Cache-Control": "no-store" } });
}