import { dailyNumber } from "./bank";
import { MAX_GUESSES, type Difficulty } from "./types";

/**
 * How finishing a puzzle is scored. Everything here is pure so it can be tuned (and
 * verified with scripts/verify-scoring.ts) without touching the database code.
 *
 * Points: harder puzzles are worth more, and fewer guesses is worth more. The daily puzzle
 * is worth double and earns a streak bonus; practice is capped per day so it can't be farmed.
 * Elo: each puzzle is an "opponent" rated by its difficulty.
 */

export const BASE_POINTS: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 35, expert: 50 };
export const DAILY_MULTIPLIER = 2;
/** Practice points stop counting after this many per UTC day (wins and Elo still count). */
export const PRACTICE_DAILY_CAP = 100;
export const STREAK_BONUS_PER_DAY = 2;
export const STREAK_BONUS_MAX_DAYS = 10;

/** 1.0 when every guess was a step answer, falling linearly to 0.5 when all six guesses were needed. */
export function efficiency(guesses: number, steps: number): number {
  const spare = MAX_GUESSES - steps;
  if (spare <= 0) return 1;
  const wasted = Math.min(Math.max(guesses - steps, 0), spare);
  return 1 - (0.5 * wasted) / spare;
}

export interface PointsInput {
  difficulty: Difficulty;
  steps: number;
  guesses: number;
  daily: boolean;
  /** Streak after this win (daily only). */
  streak: number;
}

/** Points for a win, itemised so the result screen can show where they came from. */
export function winPoints({ difficulty, steps, guesses, daily, streak }: PointsInput) {
  const base = BASE_POINTS[difficulty];
  const eff = efficiency(guesses, steps);
  const afterEff = Math.round(base * eff);
  const breakdown: { label: string; value: number }[] = [{ label: `${cap(difficulty)} puzzle`, value: base }];
  if (afterEff !== base) breakdown.push({ label: `Used ${guesses} of ${MAX_GUESSES} guesses`, value: afterEff - base });
  let total = afterEff;
  if (daily) {
    const bonus = afterEff * (DAILY_MULTIPLIER - 1);
    breakdown.push({ label: "Daily puzzle bonus", value: bonus });
    total += bonus;
    const days = Math.min(Math.max(streak - 1, 0), STREAK_BONUS_MAX_DAYS);
    if (days > 0) {
      breakdown.push({ label: `${streak}-day streak`, value: days * STREAK_BONUS_PER_DAY });
      total += days * STREAK_BONUS_PER_DAY;
    }
  }
  return { points: total, breakdown, efficiency: eff };
}

// ───────────── Elo ─────────────

export const START_ELO = 1200;
export const MIN_ELO = 100;
export const PUZZLE_RATING: Record<Difficulty, number> = { easy: 1000, medium: 1200, hard: 1400, expert: 1600 };

/** New players move fast so their rating settles quickly. */
export const kFactor = (games: number) => (games < 10 ? 48 : games < 40 ? 32 : 24);

export function eloAfter(rating: number, games: number, difficulty: Difficulty, result: { win: boolean; efficiency: number }) {
  const expected = 1 / (1 + 10 ** ((PUZZLE_RATING[difficulty] - rating) / 400));
  // A win scores 0.7 to 1.0 depending on how cleanly it was solved; a loss scores 0.
  const score = result.win ? 0.7 + 0.3 * ((result.efficiency - 0.5) / 0.5) : 0;
  return Math.max(MIN_ELO, Math.round(rating + kFactor(games) * (score - expected)));
}

const TIERS: [number, string][] = [
  [0, "Intern"],
  [1000, "Analyst"],
  [1200, "Associate"],
  [1400, "Trader"],
  [1600, "Senior Trader"],
  [1800, "Portfolio Manager"],
  [2000, "Managing Director"],
];

export function tierFor(elo: number): string {
  let name = TIERS[0][1];
  for (const [min, label] of TIERS) if (elo >= min) name = label;
  return name;
}

// ───────────── calendar (UTC) ─────────────

const DAY_MS = 86_400_000;
export const dayNumber = (now = Date.now()) => dailyNumber(now);

/** Weeks run Monday to Sunday (UTC). Day 1 of the daily numbering, 2026-01-01, is a Thursday. */
export const weekIndex = (day: number) => Math.floor((day - 1 + 3) / 7);

/** When the current UTC day / week ends, in ms since epoch. */
export function periodEnd(period: "daily" | "weekly", now = Date.now()): number {
  const day = dayNumber(now);
  const epoch = Date.UTC(2026, 0, 1);
  if (period === "daily") return epoch + day * DAY_MS;
  const nextMonday = (weekIndex(day) + 1) * 7 - 2; // first day number of next week
  return epoch + (nextMonday - 1) * DAY_MS;
}

export function parseDailyId(id: string): number | null {
  const m = /^daily-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
