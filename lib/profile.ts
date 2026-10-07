import { addToSet, del, setIfAbsent, get, hDel, hGetAll, hIncrBy, hSet, inSet, incrBy, set, zIncr, zRankOf, zTop } from "./store";
import {
  MAX_GUESSES,
  type Award,
  type Difficulty,
  type LeaderboardResponse,
  type Period,
  type PlayerEntry,
  type Profile,
  type Puzzle,
  type School,
  type SchoolEntry,
} from "./types";
import { logActivity } from "./activity";
import { isAdmin } from "./auth";
import { schoolById } from "./schools";
import {
  EGG_POINTS,
  PRACTICE_DAILY_CAP,
  dayNumber,
  type Egg,
  parseDailyId,
  periodEnd,
  weekIndex,
  winPoints,
} from "./scoring";

/**
 * Player profiles, points and the leaderboards. A profile is a Redis hash keyed by the
 * lower-cased username; the leaderboards are sorted sets (one per period, for players and schools).
 */

const WEEK = 7 * 86_400;
const DAILY_TTL = 3 * 86_400;
const WEEKLY_TTL = 21 * 86_400;

/** Old all-time "problems solved" board, kept only to carry existing win counts over. */
export const LEGACY_LEADERBOARD = "lb:solved";

const profKey = (u: string) => `prof:${u.toLowerCase()}`;
const avatarKey = (u: string) => `avatar:${u.toLowerCase()}`;
const solvedKey = (u: string) => `solved:${u.toLowerCase()}`;
const lostKey = (u: string) => `lost:${u.toLowerCase()}`;

export const boardKey = (kind: "u" | "s", period: Period, now = Date.now()) => {
  const day = dayNumber(now);
  return period === "daily" ? `lb:${kind}:d:${day}` : period === "weekly" ? `lb:${kind}:w:${weekIndex(day)}` : `lb:${kind}:all`;
};

interface Stored {
  points: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  lastDaily: number;
  school: string | null;
  linkedin: string | null;
  avatarV: number;
}

const num = (v: string | undefined, d = 0) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);

/** Loads the stored profile, creating it on first use (carrying over any old leaderboard win count). */
async function load(username: string): Promise<Stored> {
  const h = await hGetAll(profKey(username));
  if (h.points === undefined) {
    const legacy = await zRankOf(LEGACY_LEADERBOARD, username);
    const wins = legacy?.score ?? 0;
    await hSet(profKey(username), { wins, points: 0 });
    return blank(wins);
  }
  return {
    points: num(h.points),
    wins: num(h.wins),
    losses: num(h.losses),
    streak: num(h.streak),
    bestStreak: num(h.bestStreak),
    lastDaily: num(h.lastDaily),
    school: h.school || null,
    linkedin: h.linkedin || null,
    avatarV: num(h.avatarV),
  };
}

const blank = (wins = 0): Stored => ({
  points: 0,
  wins,
  losses: 0,
  streak: 0,
  bestStreak: 0,
  lastDaily: 0,
  school: null,
  linkedin: null,
  avatarV: 0,
});

function shape(username: string, s: Stored, rank: number | null): Profile {
  const alive = s.lastDaily >= dayNumber() - 1; // a missed day ends the streak
  return {
    username,
    points: s.points,
    wins: s.wins,
    losses: s.losses,
    streak: alive ? s.streak : 0,
    bestStreak: Math.max(s.bestStreak, alive ? s.streak : 0),
    rank,
    school: s.school ? schoolById(s.school) : null,
    linkedin: s.linkedin,
    avatar: s.avatarV ? `/api/avatar/${encodeURIComponent(username)}?v=${s.avatarV}` : null,
    admin: isAdmin(username),
  };
}

export async function getProfile(username: string): Promise<Profile> {
  const [s, r] = await Promise.all([load(username), zRankOf(boardKey("u", "all"), username)]);
  return shape(username, s, r ? r.rank + 1 : null);
}

/** Display-cased username for a (case-insensitive) name, or null if there's no such player. */
export async function findUser(name: string): Promise<string | null> {
  const raw = await get(`user:${name.toLowerCase()}`);
  return raw ? (JSON.parse(raw) as { username: string }).username : null;
}

// ───────────── earning points ─────────────

async function addPoints(username: string, school: string | null, points: number, now = Date.now()) {
  if (points === 0) return;
  const jobs: Promise<unknown>[] = [
    zIncr(boardKey("u", "all", now), username, points),
    zIncr(boardKey("u", "daily", now), username, points, DAILY_TTL),
    zIncr(boardKey("u", "weekly", now), username, points, WEEKLY_TTL),
  ];
  if (school) {
    jobs.push(
      zIncr(boardKey("s", "all", now), school, points),
      zIncr(boardKey("s", "daily", now), school, points, DAILY_TTL),
      zIncr(boardKey("s", "weekly", now), school, points, WEEKLY_TTL),
    );
  }
  await Promise.all(jobs);
}

/** A puzzle was solved within the guess limit. Call once per puzzle (the caller guards that). */
export async function recordWin(username: string, puzzle: Puzzle, guesses: number): Promise<Award> {
  const now = Date.now();
  const today = dayNumber(now);
  const s = await load(username);
  const dailyN = parseDailyId(puzzle.id);
  const isDaily = dailyN === today; // an old daily token replayed later scores like practice

  let streak = s.streak;
  if (isDaily) streak = s.lastDaily === today - 1 ? s.streak + 1 : s.lastDaily === today ? s.streak : 1;

  const scored = winPoints({ difficulty: puzzle.difficulty, steps: puzzle.steps.length, guesses, daily: isDaily, streak });
  let { points } = scored;
  const breakdown = [...scored.breakdown];

  if (!isDaily) {
    const used = await incrBy(`pcap:${username.toLowerCase()}:${today}`, points, 2 * 86_400);
    const allowed = Math.min(points, Math.max(0, PRACTICE_DAILY_CAP - (used - points)));
    if (allowed < points) {
      breakdown.push({ label: `Daily practice cap (${PRACTICE_DAILY_CAP})`, value: allowed - points });
      points = allowed;
    }
  }

  const best = Math.max(s.bestStreak, streak);

  await Promise.all([
    ...(isDaily ? [hSet(profKey(username), { streak, bestStreak: best, lastDaily: today })] : []),
    hIncrBy(profKey(username), "points", points),
    hIncrBy(profKey(username), "wins", 1),
    hIncrBy(profKey(username), `d${Math.min(guesses, MAX_GUESSES)}`, 1),
    addPoints(username, s.school, points, now),
  ]);

  const updated: Stored = {
    ...s,
    points: s.points + points,
    wins: s.wins + 1,
    ...(isDaily ? { streak, bestStreak: best, lastDaily: today } : {}),
  };
  logActivity(
    "win",
    username,
    `won ${puzzle.difficulty} "${puzzle.title}" in ${guesses} ${guesses === 1 ? "guess" : "guesses"}${isDaily ? " (daily)" : ""}: +${points} pts, streak ${shape(username, updated, null).streak}`,
  );
  const r = await zRankOf(boardKey("u", "all"), username);
  return {
    result: "win",
    points,
    breakdown,
    streak: shape(username, updated, null).streak,
    profile: shape(username, updated, r ? r.rank + 1 : null),
  };
}

/** The sixth guess was spent without finishing. Call once per puzzle. */
export async function recordLoss(username: string, puzzle: Puzzle): Promise<Award> {
  const today = dayNumber();
  const s = await load(username);
  const isDaily = parseDailyId(puzzle.id) === today;

  await Promise.all([
    ...(isDaily ? [hSet(profKey(username), { streak: 0 })] : []),
    hIncrBy(profKey(username), "losses", 1),
  ]);

  const updated: Stored = { ...s, losses: s.losses + 1, streak: isDaily ? 0 : s.streak };
  logActivity("loss", username, `lost ${puzzle.difficulty} "${puzzle.title}"${isDaily ? " (daily)" : ""}: out of guesses`);
  const r = await zRankOf(boardKey("u", "all"), username);
  return {
    result: "loss",
    points: 0,
    breakdown: [],
    streak: shape(username, updated, null).streak,
    profile: shape(username, updated, r ? r.rank + 1 : null),
  };
}

export const markSolved = (username: string, puzzleId: string) => addToSet(solvedKey(username), puzzleId);
export const isSolved = (username: string, puzzleId: string) => inSet(solvedKey(username), puzzleId);
export const markLost = (username: string, puzzleId: string) => addToSet(lostKey(username), puzzleId);
export const progressTtl = WEEK;

// ───────────── admin adjustments ─────────────

/** Adds (or, if negative, removes) points from a player, on every board, and records who/why. Returns null for an unknown player. */
export async function adminAdjustPoints(name: string, points: number, reason: string, by = "(secret key)"): Promise<Profile | null> {
  const username = await findUser(name);
  if (!username) return null;
  const s = await load(username);
  await Promise.all([hIncrBy(profKey(username), "points", points), addPoints(username, s.school, points)]);
  logActivity("admin", by, `adjusted ${username}'s points by ${points > 0 ? "+" : ""}${points}${reason ? ` (${reason})` : ""}`);
  await set(`admin:grant:${Date.now()}:${username.toLowerCase()}`, JSON.stringify({ username, points, reason, at: new Date().toISOString() }));
  return getProfile(username);
}

// ───────────── easter egg ─────────────

/** Gives an egg's one-time bonus. Returns the new profile, or null if this player already found that egg. */
export async function claimEgg(username: string, egg: Egg): Promise<Profile | null> {
  if (!(await setIfAbsent(`egg:${username.toLowerCase()}:${egg}`, "1"))) return null;
  const points = EGG_POINTS[egg];
  const s = await load(username);
  await Promise.all([hIncrBy(profKey(username), "points", points), addPoints(username, s.school, points)]);
  logActivity("egg", username, `found the ${egg} easter egg: +${points} pts`);
  return getProfile(username);
}

// ───────────── editing a profile ─────────────

const LINKEDIN_RE = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9\-_%]{3,100})\/?(?:[?#].*)?$/i;

/** Accepts a LinkedIn profile URL (or just "in/handle") and returns the handle, or null if it doesn't look like one. */
export function parseLinkedIn(input: string): string | null {
  const t = input.trim();
  const m = LINKEDIN_RE.exec(t) ?? LINKEDIN_RE.exec(t.replace(/^in\//i, "linkedin.com/in/"));
  return m ? m[1] : null;
}

export async function updateProfile(
  username: string,
  edit: { school?: string | null; linkedin?: string | null },
): Promise<Profile> {
  await load(username); // make sure the hash exists
  const key = profKey(username);
  const jobs: Promise<unknown>[] = [];
  for (const field of ["school", "linkedin"] as const) {
    const value = edit[field];
    if (value === undefined) continue;
    jobs.push(value === null ? hDel(key, field) : hSet(key, { [field]: value }));
  }
  await Promise.all(jobs);
  return getProfile(username);
}

export async function saveAvatar(username: string, base64: string) {
  await set(avatarKey(username), base64);
  await hSet(profKey(username), { avatarV: Date.now() });
}

export async function removeAvatar(username: string) {
  await del(avatarKey(username));
  await hDel(profKey(username), "avatarV");
}

export const loadAvatar = (username: string) => get(avatarKey(username));

// ───────────── leaderboards ─────────────

const TOP = 25;

export async function playersBoard(period: Period, me: string | null): Promise<Omit<LeaderboardResponse, "storage">> {
  const key = boardKey("u", period);
  const [top, mine] = await Promise.all([zTop(key, TOP), me ? zRankOf(key, me) : null]);
  const cards = await Promise.all(top.map((t) => load(t.member)));
  const players: PlayerEntry[] = top.map((t, i) => {
    const p = shape(t.member, cards[i], null);
    return { rank: i + 1, username: t.member, points: t.score, avatar: p.avatar, school: p.school };
  });
  return {
    type: "players",
    period,
    resetsAt: period === "all" ? null : periodEnd(period),
    players,
    me: me ? { rank: mine ? mine.rank + 1 : null, points: mine?.score ?? 0 } : null,
  };
}

export async function schoolsBoard(period: Period, mySchool: string | null): Promise<Omit<LeaderboardResponse, "storage">> {
  const key = boardKey("s", period);
  const [top, mine] = await Promise.all([zTop(key, TOP), mySchool ? zRankOf(key, mySchool) : null]);
  const schools: SchoolEntry[] = [];
  top.forEach((t, i) => {
    const school = schoolById(t.member);
    if (school) schools.push({ rank: i + 1, school, points: t.score });
  });
  return {
    type: "schools",
    period,
    resetsAt: period === "all" ? null : periodEnd(period),
    schools,
    me: mySchool ? { rank: mine ? mine.rank + 1 : null, points: mine?.score ?? 0 } : null,
  };
}

export type { School, Difficulty };
