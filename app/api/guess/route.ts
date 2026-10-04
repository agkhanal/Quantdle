import { NextResponse } from "next/server";
import { aiEnabled, judgeGuess } from "@/lib/ai";
import { evaluate, relativeError } from "@/lib/math";
import { unseal } from "@/lib/token";
import type { GuessRequest, GuessResponse, Verdict } from "@/lib/types";

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

  if (relErr <= tol) {
    return json({
      verdict: "green",
      feedback: pick(["Nailed it.", "Clean.", "Exactly right.", "Spot on.", "That's the one."]),
      direction: null,
      value,
      solved: { answerDisplay: step.answerDisplay, explanation: step.explanation },
      judgedBy: "rules",
    });
  }

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

  return json({ verdict, feedback, direction, value, judgedBy });
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
