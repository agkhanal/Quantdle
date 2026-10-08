import type { ChatMessage } from "./types";

/** A message joins the one above it (no repeated avatar or name) if it's from the same player and this soon after. */
export const BUNCH_MS = 5 * 60_000;

export function bunchesWith(prev: ChatMessage | undefined, m: ChatMessage): boolean {
  return Boolean(prev) && prev!.u.toLowerCase() === m.u.toLowerCase() && m.at - prev!.at >= 0 && m.at - prev!.at < BUNCH_MS;
}
