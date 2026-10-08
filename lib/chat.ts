import { del, get, incrBy, keysWithPrefix, mget, set, zAddMember, zByScore, zNewest, zRemMember, zTrim } from "./store";
import { isAdmin } from "./auth";
import { type ChatMessage, type ChatReaction, type ChatReactions } from "./types";

/**
 * The global chat: an ordered log in Redis (score = sequence number). Deleting a message removes it
 * and appends a small "delete" event, so clients that are already up to date drop it too.
 */

const LOG = "chat:log";
const SEQ = "chat:seq";
const KEEP = 400;
export const FIRST_LOAD = 60;
export const MAX_LENGTH = 280;

const mutedKey = (u: string) => `chat:mute:${u.toLowerCase()}`;
const rxKey = (id: number) => `chat:rx:${id}`;
const mentionKey = (u: string) => `chat:mentions:${u.toLowerCase()}`;
const RX_TTL = 40 * 86_400;
const MAX_REACTORS = 200; // per reaction on one message
const MAX_MENTIONS = 5; // per message
const MENTIONS_KEPT = 50; // per player
const lastKey = (u: string) => `chat:last:${u.toLowerCase()}`;

const nextId = () => incrBy(SEQ, 1, 10 * 365 * 86_400);

const parse = (raw: string): ChatMessage | null => {
  try {
    return JSON.parse(raw) as ChatMessage;
  } catch {
    return null;
  }
};

/** Collapses whitespace, strips control characters and enforces the length limit. Returns "" if nothing is left. */
export function cleanText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LENGTH);
}

/** Newest messages (or everything after `after`), oldest first. Delete and reaction events are included so clients can apply them. */
export async function readChat(after: number | null): Promise<{ messages: ChatMessage[]; latest: number }> {
  const raw = after === null ? await zNewest(LOG, FIRST_LOAD) : await zByScore(LOG, `(${after}`, "+inf", 100);
  const all = raw.map(parse).filter((m): m is ChatMessage => m !== null);
  const latest = all.length ? all[all.length - 1].id : (after ?? 0);
  // A first load already carries each message's current reactions, so the older updates in that window are redundant.
  const messages = after === null ? all.filter((m) => m.rx === undefined) : all;
  const real = messages.filter((m) => !m.del && m.rx === undefined);
  const stored = await mget(real.map((m) => rxKey(m.id)));
  real.forEach((m, i) => {
    const r = parseReactions(stored[i]);
    if (Object.keys(r).length) m.r = r;
  });
  return { messages, latest };
}

function parseReactions(raw: string | null): ChatReactions {
  if (!raw) return {};
  try {
    const r = JSON.parse(raw) as ChatReactions;
    return r && typeof r === "object" ? r : {};
  } catch {
    return {};
  }
}

/** The @names in a message that could be accounts (the route checks which are real). */
export function extractMentions(text: string): string[] {
  const seen = new Map<string, string>();
  for (const m of text.matchAll(/(?:^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]{3,20})/g)) {
    if (!seen.has(m[1].toLowerCase())) seen.set(m[1].toLowerCase(), m[1]);
    if (seen.size >= MAX_MENTIONS) break;
  }
  return [...seen.values()];
}

/** Adds (or, if you'd already reacted that way, removes) your reaction. Returns the message's reactions, or null if it's gone. */
export async function toggleReaction(username: string, id: number, kind: ChatReaction): Promise<ChatReactions | null> {
  const [raw] = await zByScore(LOG, String(id), String(id), 1);
  const target = raw ? parse(raw) : null;
  if (!target || target.del || target.rx !== undefined) return null;
  const current = parseReactions(await get(rxKey(id)));
  const who = current[kind] ?? [];
  const at = who.findIndex((u) => u.toLowerCase() === username.toLowerCase());
  const next = at >= 0 ? who.filter((_, i) => i !== at) : [...who, username].slice(-MAX_REACTORS);
  if (next.length) current[kind] = next;
  else delete current[kind];
  await set(rxKey(id), JSON.stringify(current), RX_TTL);
  const event: ChatMessage = { id: await nextId(), u: "", a: null, m: false, t: "", at: Date.now(), rx: id, r: current };
  await zAddMember(LOG, event.id, JSON.stringify(event));
  await zTrim(LOG, KEEP);
  return current;
}

/** How many messages that mention this player came after `after` (their last-seen message). */
export async function countMentions(username: string, after: number): Promise<number> {
  return (await zByScore(mentionKey(username), `(${after}`, "+inf", MENTIONS_KEPT)).length;
}

/** The newest message id, so a new reader can start with nothing unread. */
export async function latestChatId(): Promise<number> {
  return Number((await get(SEQ)) ?? 0);
}

/** `until` is when it ends (ms), "never" for a ban, or null for an older mute whose end wasn't recorded. */
export type Mute = { until: number | "never" | null };

const readMute = (raw: string | null): Mute | null => {
  if (raw === null) return null;
  if (raw === "never") return { until: "never" };
  const n = Number(raw);
  return Number.isFinite(n) && n > 1 ? { until: n } : { until: null };
};

/** What to tell a muted player. */
export function muteNotice(m: Mute): string {
  if (m.until === "never") return "You've been banned from chat.";
  if (m.until === null) return "You've been muted for a while.";
  const minutes = Math.max(1, Math.ceil((m.until - Date.now()) / 60_000));
  return minutes < 60 ? `You're muted for another ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` : `You're muted for another ${Math.ceil(minutes / 60)} ${Math.ceil(minutes / 60) === 1 ? "hour" : "hours"}.`;
}

export async function getMute(username: string): Promise<Mute | null> {
  return readMute(await get(mutedKey(username)));
}

/** Everyone currently muted or banned (lower-cased usernames). */
export async function listMutes(): Promise<{ username: string; until: Mute["until"] }[]> {
  const keys = await keysWithPrefix("chat:mute:");
  const values = await mget(keys);
  return keys.flatMap((k, i) => {
    const m = readMute(values[i]);
    return m ? [{ username: k.slice("chat:mute:".length), until: m.until }] : [];
  });
}

/** Same text from the same player within 30 seconds counts as a repeat. */
export async function isRepeat(username: string, text: string): Promise<boolean> {
  const last = await get(lastKey(username));
  await set(lastKey(username), text.toLowerCase(), 30);
  return last === text.toLowerCase();
}

export async function postMessage(username: string, avatar: string | null, text: string, mentions: string[] = []): Promise<ChatMessage> {
  const msg: ChatMessage = { id: await nextId(), u: username, a: avatar, m: isAdmin(username), t: text, at: Date.now(), ...(mentions.length ? { n: mentions } : {}) };
  await zAddMember(LOG, msg.id, JSON.stringify(msg));
  await zTrim(LOG, KEEP);
  for (const name of mentions) {
    if (name.toLowerCase() === username.toLowerCase()) continue; // mentioning yourself isn't a notification
    await zAddMember(mentionKey(name), msg.id, String(msg.id));
    await zTrim(mentionKey(name), MENTIONS_KEPT);
  }
  return msg;
}

export async function deleteMessage(id: number): Promise<ChatMessage | null> {
  const [raw] = await zByScore(LOG, String(id), String(id), 1);
  if (!raw) return null;
  const target = parse(raw);
  if (!target || target.del) return null;
  await zRemMember(LOG, raw);
  await del(rxKey(id));
  for (const name of target.n ?? []) await zRemMember(mentionKey(name), String(id));
  const event: ChatMessage = { id: await nextId(), u: "", a: null, m: false, t: "", at: Date.now(), del: id };
  await zAddMember(LOG, event.id, JSON.stringify(event));
  return target;
}

/** Stops a player chatting for `minutes`, or for good if `minutes` is null (a chat ban). */
export async function muteUser(username: string, minutes: number | null) {
  if (minutes === null) return set(mutedKey(username), "never");
  const seconds = Math.max(60, Math.round(minutes * 60));
  await set(mutedKey(username), String(Date.now() + seconds * 1000), seconds);
}

export async function unmuteUser(username: string) {
  await del(mutedKey(username));
}
