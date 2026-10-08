export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Verdict = "green" | "yellow" | "grey";

/** Practice puzzle topics (the `category` every generated puzzle is labelled with). */
export const TOPICS = ["Probability", "Combinatorics", "Expected Value", "Statistics", "Markets"] as const;
export type Topic = (typeof TOPICS)[number];
export const isTopic = (x: unknown): x is Topic => TOPICS.includes(x as Topic);

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
  /** A past daily, served from the archive (half points, no streak). */
  archive?: boolean;
  aiJudge?: boolean;
}

/** One row of the past-dailies archive. Titles are safe to show: the day is over. */
export interface ArchiveDay {
  day: number;
  title: string;
  category: string;
  difficulty: Difficulty;
}

export interface ArchiveResponse {
  today: number;
  /** Today's puzzle, for the "Today" row (its title is on the page already). */
  current: ArchiveDay;
  /** The first daily that went live. */
  launch: number;
  /** Newest first, not including today. */
  days: ArchiveDay[];
  /** The signed-in player's result on each daily (today included); absent days weren't finished. */
  results: Record<number, "won" | "lost">;
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
  /** True for admin accounts, which get the points tools in their profile. */
  admin: boolean;
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

/** One entry in the global chat log. A delete event has `del` set to the id it removes. */
/** The reactions a message can get. They are drawn as icons (see components/ReactionIcons.tsx). */
export const CHAT_REACTIONS = ["like", "love", "laugh", "fire"] as const;
export type ChatReaction = (typeof CHAT_REACTIONS)[number];
export const isReaction = (v: unknown): v is ChatReaction => typeof v === "string" && (CHAT_REACTIONS as readonly string[]).includes(v);
/** Who reacted with what. */
export type ChatReactions = Partial<Record<ChatReaction, string[]>>;

export interface ChatMessage {
  id: number;
  /** Username */
  u: string;
  /** Avatar URL when it was sent */
  a: string | null;
  /** Sent by an admin account */
  m: boolean;
  /** Text */
  t: string;
  at: number;
  /** Players this message @mentions (real accounts only, display-cased) */
  n?: string[];
  /** Reactions on this message */
  r?: ChatReactions;
  /** Client only: a message you just sent, shown while the server confirms it */
  pending?: boolean;
  /** Not a message: an update to the reactions on message `rx`, carried in `r` */
  rx?: number;
  del?: number;
}

export type ActivityType = "account" | "guess" | "hint" | "win" | "loss" | "profile" | "chat" | "admin" | "egg" | "bug";

/** One entry in the admin activity log. */
export interface ActivityEvent {
  id: number;
  at: number;
  type: ActivityType;
  user: string;
  text: string;
}

export const BUG_CATEGORIES = ["Gameplay", "Display", "Account", "Chat", "Other"] as const;
export type BugCategory = (typeof BUG_CATEGORIES)[number];
export type BugStatus = "open" | "resolved" | "dismissed";

/** A bug report from a player, handled by admins. */
export interface BugReport {
  id: number;
  at: number;
  user: string;
  category: BugCategory;
  title: string;
  body: string;
  /** Technical details the reporter chose to include. */
  tech?: { path: string; viewport: string; ua: string; game: string };
  status: BugStatus;
  handledBy?: string;
  handledAt?: number;
  /** Message to the reporter from the admin who handled it. */
  note?: string;
  /** Points awarded to the reporter for this report. */
  points?: number;
}
