import { after } from "next/server";
import { incrBy, zAddMember, zByScore, zNewest, zTrim } from "./store";
import type { ActivityEvent, ActivityType } from "./types";

/**
 * A short, admin-only log of what players do: sign-ins, puzzle attempts, wins and losses, profile changes
 * and admin actions. Stored like the chat (an ordered set in Redis, newest few thousand kept). Writing it never
 * slows down or breaks the action being logged: it runs after the response is sent, and failures are swallowed.
 */

const LOG = "admin:activity";
const SEQ = "admin:activity:seq";
const KEEP = 3000;
const TRIM_EVERY = 100;
export const FIRST_LOAD = 150;

/** Record an event. `text` is a short human sentence, e.g. `won "HH vs HT" in 4 guesses (+34 pts)`. */
export function logActivity(type: ActivityType, user: string, text: string): void {
  const run = async () => {
    try {
      const id = await incrBy(SEQ, 1, 10 * 365 * 86_400);
      const event: ActivityEvent = { id, at: Date.now(), type, user, text: text.slice(0, 240) };
      await zAddMember(LOG, id, JSON.stringify(event));
      if (id % TRIM_EVERY === 0) await zTrim(LOG, KEEP);
    } catch (err) {
      console.error("[quantdle] activity log failed:", err);
    }
  };
  try {
    after(run); // after the response has gone out
  } catch {
    void run(); // not inside a request (scripts, tests)
  }
}

const parse = (raw: string): ActivityEvent | null => {
  try {
    return JSON.parse(raw) as ActivityEvent;
  } catch {
    return null;
  }
};

/** The newest events, or only those after `afterId`, oldest first. */
export async function readActivity(afterId: number | null): Promise<{ events: ActivityEvent[]; latest: number }> {
  const raw = afterId === null ? await zNewest(LOG, FIRST_LOAD) : await zByScore(LOG, `(${afterId}`, "+inf", 300);
  const events = raw.map(parse).filter((e): e is ActivityEvent => e !== null);
  return { events, latest: events.length ? events[events.length - 1].id : (afterId ?? 0) };
}
