import { MAX_GUESSES } from "./types";

export interface Stats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** dist[i] = number of wins that used i+1 rows */
  dist: number[];
  lastDaily?: number;
}

const KEY = "quantdle-stats-v1";

export const emptyStats = (): Stats => ({
  played: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  dist: Array(MAX_GUESSES).fill(0),
});

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyStats(), ...JSON.parse(raw) };
  } catch {}
  return emptyStats();
}

export function recordResult(won: boolean, rowsUsed: number, dailyNumber?: number): Stats {
  const s = loadStats();
  s.played++;
  if (won) {
    s.wins++;
    s.streak++;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.dist[Math.min(rowsUsed, MAX_GUESSES) - 1]++;
  } else {
    s.streak = 0;
  }
  if (dailyNumber) s.lastDaily = dailyNumber;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  return s;
}

export function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
