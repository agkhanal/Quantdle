import { get, incrBy, mget, set, zAddMember, zNewest } from "./store";
import { logActivity } from "./activity";
import { adminAdjustPoints } from "./profile";
import { BUG_CATEGORIES, type BugCategory, type BugReport, type BugStatus } from "./types";

/**
 * Bug reports. Each report is its own key (so it can change status); an ordered index lets us list the newest.
 * A counter keeps the number of open reports for the admin badge, and a per-player counter tells a reporter
 * their report was updated (it's read with the usual "who am I" call, so no extra polling).
 */

const key = (id: number) => `bug:${id}`;
const INDEX = "bugs:idx";
const SEQ = "bugs:seq";
const OPEN = "bugs:open";
const userIndex = (u: string) => `bugs:user:${u.toLowerCase()}`;
const unseenKey = (u: string) => `bugs:unseen:${u.toLowerCase()}`;
const FOREVER = 10 * 365 * 86_400;

export const MAX_TITLE = 100;
export const MAX_BODY = 1500;
export const MAX_POINTS = 1000;

const clean = (v: unknown, max: number, multiline = false) =>
  typeof v !== "string"
    ? ""
    : v
        .replace(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g : /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ")
        .replace(multiline ? /[ \t]+/g : /\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, max);

export function parseReportInput(input: { category?: unknown; title?: unknown; body?: unknown; tech?: unknown }) {
  const category = BUG_CATEGORIES.includes(input.category as BugCategory) ? (input.category as BugCategory) : "Other";
  const title = clean(input.title, MAX_TITLE);
  const body = clean(input.body, MAX_BODY, true);
  let tech: BugReport["tech"];
  if (input.tech && typeof input.tech === "object") {
    const t = input.tech as Record<string, unknown>;
    tech = { path: clean(t.path, 120), viewport: clean(t.viewport, 30), ua: clean(t.ua, 220), game: clean(t.game, 140) };
  }
  return { category, title, body, tech };
}

const parse = (raw: string | null): BugReport | null => {
  try {
    return raw ? (JSON.parse(raw) as BugReport) : null;
  } catch {
    return null;
  }
};

export async function createBug(user: string, input: ReturnType<typeof parseReportInput>): Promise<BugReport> {
  const id = await incrBy(SEQ, 1, FOREVER);
  const report: BugReport = { id, at: Date.now(), user, category: input.category, title: input.title, body: input.body, ...(input.tech ? { tech: input.tech } : {}), status: "open" };
  await set(key(id), JSON.stringify(report));
  await Promise.all([zAddMember(INDEX, id, String(id)), zAddMember(userIndex(user), id, String(id)), incrBy(OPEN, 1, FOREVER)]);
  logActivity("bug", user, `reported a bug #${id} (${input.category}): ${input.title || input.body.slice(0, 80)}`);
  return report;
}

export async function openCount(): Promise<number> {
  return Math.max(0, Number((await get(OPEN)) ?? 0));
}

async function load(ids: string[]): Promise<BugReport[]> {
  const rows = await mget(ids.map((id) => key(Number(id))));
  return rows.map(parse).filter((r): r is BugReport => r !== null);
}

/** Newest first. `status` filters (looks at the newest 300 reports). */
export async function listBugs(status: BugStatus | "all", limit = 100): Promise<BugReport[]> {
  const ids = (await zNewest(INDEX, 300)).reverse();
  const reports = await load(ids);
  const filtered = status === "all" ? reports : reports.filter((r) => r.status === status);
  return filtered.slice(0, limit);
}

export async function getBug(id: number): Promise<BugReport | null> {
  return parse(await get(key(id)));
}

/** A player's own reports, newest first. Reading them clears the "updated" badge. */
export async function myBugs(user: string): Promise<BugReport[]> {
  const ids = (await zNewest(userIndex(user), 30)).reverse();
  await set(unseenKey(user), "0");
  return load(ids);
}

export async function unseenUpdates(user: string): Promise<number> {
  return Math.max(0, Number((await get(unseenKey(user))) ?? 0));
}

/** How many reports a player filed recently (to limit spam). */
export async function recentCount(user: string, withinMs: number): Promise<number> {
  const mine = await load((await zNewest(userIndex(user), 15)).reverse());
  return mine.filter((r) => Date.now() - r.at < withinMs).length;
}

/** The same report text from the same player within 10 minutes counts as a duplicate. */
export async function isDuplicate(user: string, body: string): Promise<boolean> {
  const k = `bugdup:${user.toLowerCase()}:${body.toLowerCase().slice(0, 80)}`;
  if (await get(k)) return true;
  await set(k, "1", 600);
  return false;
}

/**
 * Admin handling: set the status, add a note for the reporter, and (once, when resolving) award points.
 * Returns the updated report, or null if it doesn't exist.
 */
export async function handleBug(id: number, admin: string, edit: { status: BugStatus; note?: string; points?: number }): Promise<BugReport | { error: string } | null> {
  const report = await getBug(id);
  if (!report) return null;

  const note = clean(edit.note, 300);
  const wantPoints = Number.isInteger(edit.points) ? Math.min(Math.max(edit.points ?? 0, 0), MAX_POINTS) : 0;
  if (wantPoints > 0 && edit.status !== "resolved") return { error: "Points can only be awarded when resolving a report." };
  if (wantPoints > 0 && report.points) return { error: `This report already earned ${report.points} points.` };

  const wasOpen = report.status === "open";
  const nowOpen = edit.status === "open";
  const changed = report.status !== edit.status || note !== (report.note ?? "") || wantPoints > 0;

  report.status = edit.status;
  if (nowOpen) {
    delete report.handledBy;
    delete report.handledAt;
  } else {
    report.handledBy = admin;
    report.handledAt = Date.now();
  }
  if (note) report.note = note;
  else if (nowOpen) delete report.note;

  if (wantPoints > 0) {
    await adminAdjustPoints(report.user, wantPoints, `bug report #${id}`, admin);
    report.points = wantPoints;
  }

  await set(key(id), JSON.stringify(report));
  if (wasOpen !== nowOpen) await incrBy(OPEN, nowOpen ? 1 : -1, FOREVER);
  if (changed && !nowOpen) await incrBy(unseenKey(report.user), 1, FOREVER);

  logActivity("admin", admin, `${edit.status === "open" ? "reopened" : edit.status} bug #${id} from ${report.user}${wantPoints ? ` (+${wantPoints} pts)` : ""}`);
  return report;
}
