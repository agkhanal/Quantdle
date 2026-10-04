import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { aiEnabled, generatePuzzle } from "@/lib/ai";
import { bankByDifficulty, dailyNumber, dailyPuzzle } from "@/lib/bank";
import { seal } from "@/lib/token";
import { DIFFICULTIES, toPublic, type Difficulty, type Puzzle, type PuzzleResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // generation with careful reasoning can take a while

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "practice" ? "practice" : "daily";

  if (mode === "daily") {
    const n = dailyNumber();
    const puzzle = dailyPuzzle(n);
    return json({ token: seal(puzzle), puzzle: toPublic(puzzle), source: "bank", dailyNumber: n });
  }

  const d = url.searchParams.get("difficulty") as Difficulty;
  const difficulty: Difficulty = DIFFICULTIES.includes(d) ? d : "medium";

  if (aiEnabled()) {
    try {
      const puzzle = await generatePuzzle(difficulty);
      if (puzzle) return json({ token: seal(puzzle), puzzle: toPublic(puzzle), source: "ai" });
    } catch (err) {
      console.error("[quantdle] puzzle generation failed, falling back to bank:", err);
    }
  }

  // Fallback: a random bank puzzle of this difficulty, avoiding the one just played.
  const exclude = url.searchParams.get("exclude");
  const pool = bankByDifficulty(difficulty);
  const choices = pool.filter((p) => p.id !== exclude);
  const puzzle: Puzzle = (choices.length ? choices : pool)[crypto.randomInt((choices.length || pool.length))];
  return json({ token: seal(puzzle), puzzle: toPublic(puzzle), source: "bank" });
}

function json(body: PuzzleResponse) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
