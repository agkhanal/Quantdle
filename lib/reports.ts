import { get, incrBy, mget, set, zAddMember, zNewest } from "./store";
import { logActivity } from "./activity";
import { REPORT_REASONS, type BugStatus, type ChatMessage, type PlayerReport, type ReportReason } from "./types";

/**
 * Reports about players (from the chat's player menu). Stored like bug reports: one key per report, an ordered
 * index of the newest, and a counter of open ones for the admin badge. Kept apart from bug reports because they're
 * about people, not the app, and are handled differently (mute, ban, take points) rather than fixed.
 */

const key = (id: number) => `report:${id}`;
const INDEX = "reports:idx";
const SEQ = "reports:seq";
const OPEN = "reports:open";
const FOREVER = 10 * 365 * 86_400;

export const MAX_DETAILS = 500;

const clean = (v: unknown, max: number) =>
  typeof v !== "string"
    ? ""
    : v
        .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);

export const parseReason = (v: unknown): ReportReason => (REPORT_REASONS.includes(v as ReportReason) ? (v as ReportReason) : "Other");
export const cleanDetails = (v: unknown) => clean(v, MAX_DETAILS);

const parse = (raw: string | null): PlayerReport | null => {
  try {
    return raw ? (JSON.parse(raw) as PlayerReport) : null;
  } catch {
    return null;
  }
};

export async function createReport(by: string, user: string, reason: ReportReason, details: string, message: ChatMessage | null): Promise<PlayerReport> {
  const id = await incrBy(SEQ, 1, FOREVER);
  const report: PlayerReport = {
    id,
    at: Date.now(),
    by,
    user,
    reason,
    details,
    ...(message ? { message: { id: message.id, text: message.t, at: message.at } } : {}),
    status: "open",
  };
  await set(key(id), JSON.stringify(report));
  await Promise.all([zAddMember(INDEX, id, String(id)), incrBy(OPEN, 1, FOREVER)]);
  logActivity("report", by, `reported ${user} #${id} (${reason})${details ? `: ${details.slice(0, 80)}` : ""}`);
  return report;
}

export async function openReports(): Promise<number> {
  return Math.max(0, Number((await get(OPEN)) ?? 0));
}

/** Newest first. `status` filters (looks at the newest 300 reports). */
export async function listReports(status: BugStatus | "all", limit = 100): Promise<PlayerReport[]> {
  const ids = (await zNewest(INDEX, 300)).reverse();
  const reports = (await mget(ids.map((id) => key(Number(id))))).map(parse).filter((r): r is PlayerReport => r !== null);
  return (status === "all" ? reports : reports.filter((r) => r.status === status)).slice(0, limit);
}

/** One report per reporter, target and message (or target, without one) every 10 minutes. */
export async function isDuplicate(by: string, user: string, messageId: number | null): Promise<boolean> {
  const k = `reportdup:${by.toLowerCase()}:${user.toLowerCase()}:${messageId ?? "-"}`;
  if (await get(k)) return true;
  await set(k, "1", 600);
  return false;
}

/** Set a report's status and an optional admin note. Returns the updated report, or null if it doesn't exist. */
export async function handleReport(id: number, admin: string, edit: { status: BugStatus; note?: string }): Promise<PlayerReport | null> {
  const report = parse(await get(key(id)));
  if (!report) return null;
  const wasOpen = report.status === "open";
  const nowOpen = edit.status === "open";
  const note = clean(edit.note, 300);

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

  await set(key(id), JSON.stringify(report));
  if (wasOpen !== nowOpen) await incrBy(OPEN, nowOpen ? 1 : -1, FOREVER);
  logActivity("admin", admin, `${nowOpen ? "reopened" : edit.status} report #${id} about ${report.user}`);
  return report;
}
