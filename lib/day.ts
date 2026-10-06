/**
 * The daily numbering, kept apart from the puzzle bank so the browser can import it
 * without downloading every daily puzzle's answers. Day 1 = 2026-01-01 (UTC).
 */
const EPOCH = Date.UTC(2026, 0, 1);

export function dailyNumber(now = Date.now()): number {
  return Math.floor((now - EPOCH) / 86_400_000) + 1;
}
