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
  steps: { question: string }[];
}

export interface PuzzleResponse {
  token: string;
  puzzle: PublicPuzzle;
  source: "ai" | "bank" | "generated";
  dailyNumber?: number;
  aiJudge?: boolean;
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
  /** Signed-in players only: set when this guess ended the puzzle (a win or the sixth miss). */
  award?: Award;
}

export interface School {
  id: string;
  name: string;
  country: string;
}

export interface Profile {
  username: string;
  points: number;
  wins: number;
  losses: number;
  /** Consecutive daily puzzles won, ending yesterday or today. */
  streak: number;
  bestStreak: number;
  /** All-time points rank, 1 = best; null until the first point is earned. */
  rank: number | null;
  school: School | null;
  /** LinkedIn handle, i.e. the part after linkedin.com/in/ */
  linkedin: string | null;
  /** URL of the profile picture, or null for the default initials avatar. */
  avatar: string | null;
}

/** What finishing a puzzle did to a signed-in player. */
export interface Award {
  result: "win" | "loss";
  points: number;
  breakdown: { label: string; value: number }[];
  streak: number;
  profile: Profile;
}

export const PERIODS = ["daily", "weekly", "all"] as const;
export type Period = (typeof PERIODS)[number];

export interface PlayerEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string | null;
  school: School | null;
}

export interface SchoolEntry {
  rank: number;
  school: School;
  points: number;
}

export interface LeaderboardResponse {
  type: "players" | "schools";
  period: Period;
  /** When the current daily/weekly window ends (ms since epoch); null for all-time. */
  resetsAt: number | null;
  players?: PlayerEntry[];
  schools?: SchoolEntry[];
  /** The signed-in player's own standing (or their school's, on the schools board). */
  me: { rank: number | null; points: number } | null;
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
    steps: p.steps.map((s) => ({ question: s.question })),
  };
}
