import { logActivity } from "./activity";
import { rebuildSchoolBoards } from "./profile";
import { del, get, incr, set } from "./store";

/**
 * One-time data repairs, run when the server starts (see `instrumentation.ts`). Each runs exactly once per
 * database: a "done" flag records it, and a short lock keeps several server instances starting at the same
 * time from running it twice. If a run fails, the lock is dropped so the next start tries again.
 */
async function once(name: string, job: () => Promise<string>) {
  if (await get(`migration:${name}:done`)) return;
  if ((await incr(`migration:${name}:lock`, 300)) !== 1) return; // another instance is already on it
  try {
    const summary = await job();
    await set(`migration:${name}:done`, String(Date.now()));
    console.log(`[quantdle] migration ${name}: ${summary}`);
    logActivity("admin", "system", `${name}: ${summary}`);
  } catch (err) {
    await del(`migration:${name}:lock`);
    console.error(`[quantdle] migration ${name} failed, will retry on the next start:`, err);
  }
}

export async function runMigrations() {
  // Players who changed school before their points moved with them left the school boards out of step with the players.
  await once("school-boards-v1", async () => {
    const diffs = await rebuildSchoolBoards(true);
    const n = diffs.all.length + diffs.weekly.length + diffs.daily.length;
    return n === 0 ? "school leaderboards already matched the players' points" : `corrected ${n} school ${n === 1 ? "total" : "totals"} on the leaderboards`;
  });
}
