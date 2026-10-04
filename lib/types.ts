export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Verdict = "green" | "yellow" | "grey";

/** One segment of a puzzle. Every step has a single numeric answer. */
export interface Step {
  question: string;
  answer: number;
  /** How the answer is best written, e.g. "1/6" or "0.1667". */
  answerDisplay: string;
  /** Relative tolerance for a green, e.g. 0.01 = within 1%. */
  tolerance: number;
  hint: string;
  explanation: string;
}

/** Full puzzle, including answers. Only ever lives on the server or sealed in a token. */
export interface Puzzle {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  story: string;
  steps: Step[];
  solution: string;
}

/** What the browser is allowed to see. */
export interface PublicPuzzle {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  story: string;
  steps: { question: string; hint: string }[];
}

export interface PuzzleResponse {
  token: string;
  puzzle: PublicPuzzle;
  source: "ai" | "bank";
  dailyNumber?: number;
}

export interface GuessRequest {
  token: string;
  step: number;
  answer: string;
  reasoning?: string;
  previous?: string[];
}

export interface GuessResponse {
  verdict: Verdict;
  feedback: string;
  direction: "higher" | "lower" | null;
  /** Parsed numeric value of the guess. */
  value: number;
  /** Present once a step is solved: the canonical answer and why. */
  solved?: { answerDisplay: string; explanation: string };
  judgedBy: "ai" | "rules";
  /** Signed-in players only: whether this guess finished the puzzle and earned a leaderboard point. */
  credited?: boolean;
  totalSolved?: number;
}

export interface Profile {
  username: string;
  solved: number;
  rank: number | null;
}

export interface LeaderboardResponse {
  top: { rank: number; username: string; solved: number }[];
  me: Profile | null;
  storage: "redis" | "memory";
}

export interface RevealResponse {
  steps: { question: string; answerDisplay: string; explanation: string }[];
  solution: string;
}

export const MAX_GUESSES = 6;

export function toPublic(p: Puzzle): PublicPuzzle {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    difficulty: p.difficulty,
    story: p.story,
    steps: p.steps.map((s) => ({ question: s.question, hint: s.hint })),
  };
}
