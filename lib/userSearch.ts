import { get, keysWithPrefix, lexAdd, lexAll, lexPrefix, set } from "./store";

/**
 * Finding players by username. Every username (lower-cased) goes into an alphabetical index
 * when the account is created. Accounts that predate the index are added the first time anyone
 * searches (a one-off scan), so nothing needs migrating by hand.
 */

const INDEX = "users:names";
const BACKFILLED = "users:names:backfilled";
const USER_PREFIX = "user:";

export const indexUser = (username: string) => lexAdd(INDEX, username.toLowerCase());

let backfill: Promise<void> | null = null;

function ensureIndex(): Promise<void> {
  backfill ??= (async () => {
    if (await get(BACKFILLED)) return;
    const keys = await keysWithPrefix(USER_PREFIX);
    await Promise.all(keys.map((k) => lexAdd(INDEX, k.slice(USER_PREFIX.length))));
    await set(BACKFILLED, "1");
  })().catch((err) => {
    backfill = null; // try again on the next search
    throw err;
  });
  return backfill;
}

const POOL = 3000;

/** Lower-cased usernames matching a query: names that start with it first, then names that contain it. */
export async function searchUsernames(query: string, limit = 8): Promise<string[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  await ensureIndex();

  const starts = await lexPrefix(INDEX, q, limit);
  if (starts.length >= limit) return starts;

  const seen = new Set(starts);
  const contains = (await lexAll(INDEX, POOL)).filter((n) => n.includes(q) && !seen.has(n));
  return [...starts, ...contains].slice(0, limit);
}
