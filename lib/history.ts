/**
 * A per-browser log of finished games, behind the stats page's topic breakdown.
 * Like the rest of the local stats it lives in localStorage, so it works signed out
 * and covers the market game too (which never talks to the server).
 */

import type { Difficulty } from "./types";

/** The market-making game counts as its own topic next to the puzzle categories. */
export const MARKET_TOPIC = "Market making";

export type GameMode = "daily" | "practice";
export type GameKind = "puzzle" | "market";

export interface GameResult {
  at: number;
  mode: GameMode;
  kind: GameKind;
  /** The puzzle's category, or MARKET_TOPIC. */
  topic: string;
  difficulty: Difficulty;
  /** Puzzles: solved within the guesses. Markets: finished with a profit. */
  won: boolean;
  /** Puzzles: wrong guesses. Markets: rounds whose mid wasn't close to fair. */
  misses: number;
  /** Puzzles: guesses made. Markets: rounds played. */
  attempts: number;
}

const KEY = "quantdle-history-v1";
const KEEP = 1000;

export function loadHistory(): GameResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    const xs = raw ? JSON.parse(raw) : [];
    return Array.isArray(xs) ? xs : [];
  } catch {
    return [];
  }
}

export function recordGame(result: Omit<GameResult, "at">) {
  const xs = [...loadHistory(), { ...result, at: Date.now() }].slice(-KEEP);
  try {
    localStorage.setItem(KEY, JSON.stringify(xs));
  } catch {}
}

export interface TopicSummary {
  topic: string;
  kind: GameKind;
  played: number;
  won: number;
  lost: number;
  misses: number;
  attempts: number;
  /** Share of games won, 0 to 1. */
  winRate: number;
  /** Share of guesses (or rounds) that missed, 0 to 1. */
  missRate: number;
}

/** Per-topic totals, most played first. Pass a mode to count only daily or only practice games. */
export function summarize(results: GameResult[], mode?: GameMode): TopicSummary[] {
  const by = new Map<string, TopicSummary>();
  for (const r of results) {
    if (mode && r.mode !== mode) continue;
    const s =
      by.get(r.topic) ??
      by.set(r.topic, { topic: r.topic, kind: r.kind, played: 0, won: 0, lost: 0, misses: 0, attempts: 0, winRate: 0, missRate: 0 }).get(r.topic)!;
    s.played++;
    if (r.won) s.won++;
    else s.lost++;
    s.misses += r.misses;
    s.attempts += r.attempts;
  }
  return [...by.values()]
    .map((s) => ({ ...s, winRate: s.won / s.played, missRate: s.attempts ? s.misses / s.attempts : 0 }))
    .sort((a, b) => b.played - a.played || a.topic.localeCompare(b.topic));
}
