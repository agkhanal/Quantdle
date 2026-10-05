import { NextResponse } from "next/server";
import { aiEnabled, judgeGuess } from "@/lib/ai";
import { sessionUser } from "@/lib/auth";
import { evaluate, relativeError } from "@/lib/math";
import { isSolved, markLost, markSolved, progressTtl, recordLoss, recordWin } from "@/lib/profile";
import { get, incr, set } from "@/lib/store";
import { unseal } from "@/lib/token";
import { MAX_GUESSES, type Award, type GuessRequest, type GuessResponse, type Puzzle, type Verdict } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Within this relative error, a wrong answer is "close" (yellow) even without the AI judge. */
const NEAR = 0.15;

export async function POST(req: Request) {
  let body: GuessRequest;
  try {
    body = (await req.json()) as GuessRequest;
  } catch {
    return error("Bad request.", 400);
  }

  const puzzle = typeof body.token === "string" ? unseal(body.token) : null;
  if (!puzzle) return error("This puzzle has expired. Start a new one!", 410);

  const step = puzzle.steps[body.step];
  if (!step) return error("No such step.", 400);

  const value = evaluate(String(body.answer ?? ""));
  if (value === null) return error("Couldn't read that as a number. Try 0.25, 1/4, 25% or e^-1.", 422);

  const relErr = relativeError(value, step.answer);
  const tol = Math.max(step.tolerance, 1e-9);
  const direction = value < step.answer ? "higher" : "lower";
  const user = sessionUser(req);

  if (relErr <= tol) {
    const award = user ? await recordSolve(user, puzzle, body.step) : undefined;
    return json({
      verdict: "green",
      feedback: pick(["Nailed it.", "Clean.", "Exactly right.", "Spot on.", "That's the one."]),
      direction: null,
      value,
      solved: { answerDisplay: step.answerDisplay, explanation: step.explanation },
      judgedBy: "rules",
      award,
    });
  }

  const loss = user ? await countMiss(user, puzzle) : undefined;

  // Baseline from the numbers alone.
  let verdict: Verdict = relErr <= NEAR ? "yellow" : "grey";
  let feedback =
    verdict === "yellow"
      ? `Close! You're within ${Math.max(1, Math.round(relErr * 100))}%. Check your arithmetic or rounding.`
      : `Not quite. Go ${direction}, and rethink the approach.`;
  let judgedBy: GuessResponse["judgedBy"] = "rules";

  // The AI judge reads the attempt (and any reasoning) and can upgrade grey -> yellow
  // when the thinking is on track, plus writes a targeted nudge.
  if (aiEnabled()) {
    try {
      const judged = await judgeGuess({
        puzzle,
        stepIndex: body.step,
        guess: value,
        rawGuess: String(body.answer).slice(0, 120),
        reasoning: typeof body.reasoning === "string" ? body.reasoning : undefined,
        previous: Array.isArray(body.previous) ? body.previous.slice(-5).map(String) : undefined,
        relErr,
      });
      if (judged) {
        if (judged.verdict === "yellow") verdict = "yellow";
        feedback = judged.feedback;
        judgedBy = "ai";
      }
    } catch (err) {
      console.error("[quantdle] AI judge failed, using rules:", err);
    }
  }

  return json({ verdict, feedback, direction, value, judgedBy, award: loss });
}

// ───────────── points, Elo and streak accounting (signed-in players) ─────────────
// Guesses are never blocked; a puzzle just doesn't score unless its steps were solved in
// order within MAX_GUESSES guesses (a hint counts as one). Each puzzle scores once.

const triesKey = (user: string, id: string) => `tries:${user.toLowerCase()}:${id}`;
const progressKey = (user: string, id: string) => `prog:${user.toLowerCase()}:${id}`;

function countGuess(user: string, id: string) {
  return incr(triesKey(user, id), progressTtl);
}

/** A wrong guess. If it was the last one available, the puzzle is lost (once). */
async function countMiss(user: string, puzzle: Puzzle): Promise<Award | undefined> {
  const tries = await countGuess(user, puzzle.id);
  if (tries < MAX_GUESSES || (await isSolved(user, puzzle.id))) return undefined;
  return (await markLost(user, puzzle.id)) ? recordLoss(user, puzzle) : undefined;
}

async function recordSolve(user: string, puzzle: Puzzle, stepIndex: number): Promise<Award | undefined> {
  const tries = await countGuess(user, puzzle.id);
  if (await isSolved(user, puzzle.id)) return undefined;

  const progress = Number((await get(progressKey(user, puzzle.id))) ?? 0);
  if (stepIndex !== progress) return undefined; // skipped ahead, or repeating a step
  await set(progressKey(user, puzzle.id), String(progress + 1), progressTtl);

  const finished = progress + 1 === puzzle.steps.length;
  if (!finished || tries > MAX_GUESSES) return undefined;
  if (!(await markSolved(user, puzzle.id))) return undefined;
  return recordWin(user, puzzle, tries);
}

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function json(body: GuessResponse) {
  return NextResponse.json(body);
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}