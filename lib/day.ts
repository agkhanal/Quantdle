/**
 * The daily numbering, kept apart from the puzzle bank so the browser can import it
 * without downloading every daily puzzle's answers. Day 1 = 2026-01-01 (UTC).
 */
const EPOCH = Date.UTC(2026, 0, 1);

/**
 * The first daily players could actually play: the site launched on 2026-10-04. Numbers before it never
 * went live, so the archive of past dailies starts here.
 */
export const LAUNCH_DAY = 277;

/** Midnight UTC at the start of a daily number, in ms since epoch. */
export const dayStart = (n: number) => EPOCH + (n - 1) * 86_400_000;

export function dailyNumber(now = Date.now()): number {
  return Math.floor((now - EPOCH) / 86_400_000) + 1;
}
