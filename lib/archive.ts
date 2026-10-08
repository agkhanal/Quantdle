import { dayStart } from "./day";
import { book, dailyMarketDifficulty, dailyMarketSeed, isOver, newMarket, replay } from "./market";
import { loadJSON } from "./stats";
import type { Difficulty } from "./types";

/**
 * Helpers for the past-dailies archive. Both games save a day's progress in the browser under a
 * key that names the day, so any day, past or present, resumes where you left it.
 */

/** A daily puzzle's saved progress. */
export const puzzleSaveKey = (day: number) => `quantdle-daily-${day}`;
/** v2: daily markets moved to their own contracts, so quotes saved under the old key don't apply. */
export const marketSaveKey = (day: number) => `quantdle-market-daily-v2-${day}`;

/** How a day stands for this player: finished (won / lost), started, or not touched. */
export type DayStatus = "won" | "lost" | "playing" | "new";

export function localPuzzleStatus(day: number): DayStatus {
  const saved = loadJSON<{ status?: string; rows?: unknown[] }>(puzzleSaveKey(day));
  if (saved?.status === "won" || saved?.status === "lost") return saved.status;
  return saved?.rows?.length ? "playing" : "new";
}

/** A daily market counts as won when it finished in profit. */
export function localMarketStatus(day: number): DayStatus {
  const quotes = loadJSON<[number, number][]>(marketSaveKey(day)) ?? [];
  if (quotes.length === 0) return "new";
  const g = replay(dailyMarketSeed(day), dailyMarketDifficulty(day), quotes, "daily");
  if (!isOver(g)) return "playing";
  return (book(g).pnl ?? 0) > 0 ? "won" : "lost";
}

/** The contract behind a day's market (safe to show once the day is over). */
export function marketInfo(day: number): { name: string; difficulty: Difficulty } {
  const difficulty = dailyMarketDifficulty(day);
  return { name: newMarket(dailyMarketSeed(day), difficulty, "daily").contract.name, difficulty };
}

/** "Wed, Oct 7": the day's date in UTC, which is how days roll over. */
export const dayLabel = (day: number) =>
  new Date(dayStart(day)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
