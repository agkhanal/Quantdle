import { incrBy, get, set, zAddMember, zByScore, zNewest, zRemMember, zTrim } from "./store";
import { isAdmin } from "./auth";
import type { ChatMessage } from "./types";

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

/** Newest messages (or everything after `after`), oldest first. Delete events are included so clients can apply them. */
export async function readChat(after: number | null): Promise<{ messages: ChatMessage[]; latest: number }> {
  const raw = after === null ? await zNewest(LOG, FIRST_LOAD) : await zByScore(LOG, `(${after}`, "+inf", 100);
  const messages = raw.map(parse).filter((m): m is ChatMessage => m !== null);
  const latest = messages.length ? messages[messages.length - 1].id : (after ?? 0);
  return { messages, latest };
}

export async function isMuted(username: string): Promise<boolean> {
  return (await get(mutedKey(username))) !== null;
}

/** Same text from the same player within 30 seconds counts as a repeat. */
export async function isRepeat(username: string, text: string): Promise<boolean> {
  const last = await get(lastKey(username));
  await set(lastKey(username), text.toLowerCase(), 30);
  return last === text.toLowerCase();
}

export async function postMessage(username: string, avatar: string | null, text: string): Promise<ChatMessage> {
  const msg: ChatMessage = { id: await nextId(), u: username, a: avatar, m: isAdmin(username), t: text, at: Date.now() };
  await zAddMember(LOG, msg.id, JSON.stringify(msg));
  await zTrim(LOG, KEEP);
  return msg;
}

export async function deleteMessage(id: number): Promise<ChatMessage | null> {
  const [raw] = await zByScore(LOG, String(id), String(id), 1);
  if (!raw) return null;
  const target = parse(raw);
  if (!target || target.del || target.clr) return null;
  await zRemMember(LOG, raw);
  const event: ChatMessage = { id: await nextId(), u: "", a: null, m: false, t: "", at: Date.now(), del: id };
  await zAddMember(LOG, event.id, JSON.stringify(event));
  return target;
}

/** Empties the log and appends a "clear" event, so clients that are already up to date wipe their copy too. */
export async function clearChat(): Promise<ChatMessage> {
  await zTrim(LOG, 0);
  const event: ChatMessage = { id: await nextId(), u: "", a: null, m: false, t: "", at: Date.now(), clr: true };
  await zAddMember(LOG, event.id, JSON.stringify(event));
  return event;
}

export async function muteUser(username: string, minutes: number) {
  await set(mutedKey(username), "1", Math.max(1, Math.round(minutes * 60)));
}
