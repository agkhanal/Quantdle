import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import crypto from "node:crypto";
import type { Difficulty, Puzzle, Step, Verdict } from "./types";

const MODEL = "claude-opus-5-5";

// Route refused requests to a fallback model automatically, instead of failing.
const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// ────────────────────────── Generation ──────────────────────────

const CATEGORIES = [
  "Probability",
  "Expected Value",
  "Combinatorics",
  "Brainteaser",
  "Markets",
  "Statistics",
  "Game Theory",
];

const FLAVORS = [
  "dice",
  "cards",
  "coin flips",
  "urns and balls",
  "random walks",
  "a trading desk scenario",
  "an option or simple derivative",
  "a betting game with a decision to make",
  "geometric probability",
  "order statistics",
  "a market-making quote",
  "a sequential game between two players",
  "Bayesian updating",
  "a waiting-time problem",
  "a counting problem with arrangements",
];

const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  easy: "First-round phone screen. One core idea, small numbers, solvable in a couple of minutes by a strong undergrad.",
  medium:
    "Typical trading/quant interview question. Requires one non-obvious insight (conditioning, complement, linearity of expectation, a recursion).",
  hard: "Final-round interview. Multiple ideas chained together, e.g. a recursion plus a clever symmetry argument, or a continuous probability computation.",
  expert:
    "Hardest interview / green-book tier. Elegant but deep: martingales, optimal stopping, risk-neutral pricing, tricky conditioning, or a clever closed form.",
};

const StepSchema = z.object({
  question: z.string().describe("The sub-question for this step. Self-contained and unambiguous."),
  answer: z.number().describe("The exact numeric answer as a decimal number."),
  answerDisplay: z.string().describe('How to present the answer, e.g. "1/6 ≈ 0.1667" or "14.7".'),
  tolerance: z
    .number()
    .describe("Relative tolerance for counting a guess as correct: 0 for integers, 0.01 for most fractions."),
  hint: z.string().describe("A nudge in the right direction that does not give away the answer."),
  explanation: z.string().describe("One or two sentences showing how to get the answer."),
});

const GeneratedSchema = z.object({
  title: z.string().describe("A short, catchy title (2-4 words)."),
  category: z.string(),
  story: z.string().describe("The full problem statement, 1-4 sentences."),
  steps: z.array(StepSchema).describe("3 or 4 steps. The LAST step must answer the problem in the story."),
  solution: z.string().describe("A compact full walkthrough (3-5 sentences) with the key insight called out."),
});

const GENERATOR_SYSTEM = `You write puzzles for Quantdle, a daily practice game for people preparing for quant trading and quant research interviews.

Each puzzle is broken into 3 or 4 steps that scaffold toward the final answer, like a good interviewer guiding a candidate. Earlier steps are stepping stones (a sub-case, a key intermediate quantity, a simpler version); the last step is the answer to the original problem.

Rules:
- Every step's answer is a single real number. No answers that are words, intervals, or expressions in variables.
- Each step question must be answerable on its own given the story and the previous steps.
- State every assumption needed (fair coins, independence, with/without replacement, rounding precision).
- If an answer is irrational or a messy decimal, say in the question how many decimals to give.
- Correctness is critical. Work the problem out completely and double-check every number before answering, ideally two different ways.
- Hints nudge without revealing. Never put the answer in a question or hint.
- Prefer classic interview ideas with a fresh twist over textbook drills.`;

export async function generatePuzzle(difficulty: Difficulty): Promise<Puzzle | null> {
  const category = CATEGORIES[crypto.randomInt(CATEGORIES.length)];
  const flavor = FLAVORS[crypto.randomInt(FLAVORS.length)];

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: "high", format: betaZodOutputFormat(GeneratedSchema) },
    system: GENERATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write one ${difficulty.toUpperCase()} puzzle.
Difficulty: ${DIFFICULTY_GUIDE[difficulty]}
Category: ${category}
Theme to draw on: ${flavor}
Random seed (for variety): ${crypto.randomUUID()}`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  const g = response.parsed_output;

  const steps: Step[] = g.steps
    .filter((s) => Number.isFinite(s.answer))
    .slice(0, 4)
    .map((s) => ({ ...s, tolerance: clamp(s.tolerance, 0, 0.05) }));
  if (steps.length < 2) return null;

  return {
    id: `ai-${crypto.randomUUID()}`,
    title: g.title,
    category: g.category || category,
    difficulty,
    story: g.story,
    steps,
    solution: g.solution,
  };
}

// ────────────────────────── Judging ──────────────────────────

const JudgeSchema = z.object({
  verdict: z
    .enum(["yellow", "grey"])
    .describe("yellow = on the right track; grey = wrong approach or no evidence of the right idea."),
  feedback: z.string().describe("At most 2 short sentences for the player. Never reveal the answer."),
});

const JUDGE_SYSTEM = `You are the judge in Quantdle, a Wordle-style quant interview practice game. A player has answered one step of a multi-step puzzle incorrectly. The game has already checked the number; your job is to grade how close their THINKING is and give a short, Socratic nudge, like a friendly interviewer.

Verdicts:
- "yellow": the approach is right but something small is off (arithmetic slip, rounding, off-by-one, forgot to subtract from 1, ordered vs unordered, a factor of 2), OR their reasoning shows the key insight.
- "grey": the approach is wrong, the number suggests a misunderstanding, or there's nothing to suggest they're on track.

Feedback rules:
- Never state or imply the correct number, and never give a formula that trivially produces it.
- Point at the specific mistake you suspect if you can infer it from their number or reasoning ("Looks like you counted ordered pairs; does order matter here?").
- Maximum 2 short sentences. Plain text, no markdown. Warm, a little playful.`;

export interface JudgeInput {
  puzzle: Puzzle;
  stepIndex: number;
  guess: number;
  rawGuess: string;
  reasoning?: string;
  previous?: string[];
  relErr: number;
}

export async function judgeGuess(input: JudgeInput): Promise<{ verdict: Exclude<Verdict, "green">; feedback: string } | null> {
  const { puzzle, stepIndex, guess, rawGuess, reasoning, previous, relErr } = input;
  const step = puzzle.steps[stepIndex];
  const priorSteps = puzzle.steps
    .slice(0, stepIndex)
    .map((s, i) => `Step ${i + 1} (solved): ${s.question} → ${s.answerDisplay}`)
    .join("\n");

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    ...FALLBACK,
    output_config: { effort: "low", format: betaZodOutputFormat(JudgeSchema) },
    system: JUDGE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `<puzzle>
${puzzle.story}
</puzzle>
${priorSteps ? `<solved_steps>\n${priorSteps}\n</solved_steps>\n` : ""}<current_step>
Question: ${step.question}
Correct answer (secret): ${step.answerDisplay} (= ${step.answer})
Why: ${step.explanation}
</current_step>
<player_attempt>
Typed: ${rawGuess}
Evaluates to: ${guess}
Relative error vs correct answer: ${(relErr * 100).toFixed(1)}%
${previous?.length ? `Earlier wrong attempts on this step: ${previous.join(", ")}` : ""}
Reasoning: ${reasoning?.trim() ? reasoning.trim().slice(0, 1500) : "(none given)"}
</player_attempt>`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return response.parsed_output;
}

function clamp(v: number, lo: number, hi: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}
