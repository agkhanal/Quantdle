import { dailyNumber } from "./day";
import { MAX_GUESSES, type Difficulty } from "./types";

/**
 * How finishing a puzzle is scored. Everything here is pure so it can be tuned (and
 * verified with scripts/verify-scoring.ts) without touching the database code.
 *
 * Points: harder puzzles are worth more, and fewer guesses is worth more. The daily puzzle
 * is worth double and earns a streak bonus; practice is capped per day so it can't be farmed.
 */

export const BASE_POINTS: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 35, expert: 50 };
export const DAILY_MULTIPLIER = 2;
/** Practice points stop counting after this many per UTC day (wins still count). */
export const PRACTICE_DAILY_CAP = 100;
export const STREAK_BONUS_PER_DAY = 2;
export const STREAK_BONUS_MAX_DAYS = 10;
/** One-time bonus for finding the easter egg in the logo. */
export const EGG_POINTS = 10;

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
  const m = /^daily-(\d+)(?:-|$)/.exec(id);
  return m ? Number(m[1]) : null;
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
