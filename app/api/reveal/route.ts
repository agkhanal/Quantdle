import { NextResponse } from "next/server";
import { unseal } from "@/lib/token";
import type { RevealResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Called once a game is over, to show the full worked solution. */
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const puzzle = typeof token === "string" ? unseal(token) : null;
  if (!puzzle) return NextResponse.json({ error: "This puzzle has expired." }, { status: 410 });

  const body: RevealResponse = {
    steps: puzzle.steps.map((s) => ({
      question: s.question,
      answerDisplay: s.answerDisplay,
      explanation: s.explanation,
    })),
    solution: puzzle.solution,
  };
  return NextResponse.json(body);
}
