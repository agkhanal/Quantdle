import { LAUNCH_DAY } from "./day";
import { DIFFICULTIES, TOPICS, type Difficulty } from "./types";

/**
 * The result card (the image behind "Share image" and the site's link previews). Everything it shows comes in as
 * URL parameters, so this module is the one place that decides what's allowed: anything unexpected is dropped, and the
 * route fills in titles and contract names from its own data, never from the URL.
 */

/** green, yellow, grey, hint */
export type Tile = "g" | "y" | "x" | "h";
export type CardKind = "puzzle" | "market" | "site";

export interface CardSpec {
  kind: CardKind;
  mode: "daily" | "practice";
  /** Daily number (daily results, and the site card's "today") */
  n?: number;
  difficulty?: Difficulty;
  /** Puzzle topic (practice results) */
  topic?: string;
  /** One row of tiles per step (puzzles) or a single row of rounds (markets). An empty row is a step you never reached. */
  rows: Tile[][];
  /** Puzzle: how many guesses it took, or null if it wasn't solved. */
  guesses: number | null;
  /** Market: final profit and loss */
  pnl?: number;
  /** A player's name; the route only shows it if the account exists. */
  user?: string;
}

const MAX_ROWS = 8;
const MAX_TILES = 6;
const TILE = /^[gyxh]$/;

/** Turns a spec into the card's query string. */
export function encodeCard(spec: CardSpec): string {
  const q = new URLSearchParams({ kind: spec.kind, mode: spec.mode });
  if (spec.n !== undefined) q.set("n", String(spec.n));
  if (spec.difficulty) q.set("d", spec.difficulty);
  if (spec.topic) q.set("t", spec.topic);
  if (spec.rows.length) q.set("g", spec.rows.map((r) => (r.length ? r.join("") : "_")).join("."));
  if (spec.kind === "puzzle") q.set("s", spec.guesses === null ? "x" : String(spec.guesses));
  if (spec.pnl !== undefined) q.set("p", String(Math.round(spec.pnl * 100) / 100));
  if (spec.user) q.set("u", spec.user);
  return q.toString();
}

/** Reads a card query string, keeping only values that are valid. `today` is the current daily number. */
export function parseCard(q: URLSearchParams, today: number): CardSpec {
  const kindRaw = q.get("kind");
  const kind: CardKind = kindRaw === "puzzle" || kindRaw === "market" ? kindRaw : "site";
  const nRaw = q.get("n");
  const n = nRaw !== null && /^\d{1,5}$/.test(nRaw) && Number(nRaw) >= LAUNCH_DAY && Number(nRaw) <= today ? Number(nRaw) : undefined;
  const mode = q.get("mode") === "daily" && n !== undefined ? "daily" : "practice";
  const dRaw = q.get("d");
  const difficulty = DIFFICULTIES.find((d) => d === dRaw);
  const tRaw = q.get("t");
  const topic = TOPICS.find((t) => t === tRaw);

  const rows: Tile[][] = [];
  const g = q.get("g");
  if (g && /^[gyxh_.]{1,80}$/.test(g)) {
    for (const part of g.split(".").slice(0, MAX_ROWS)) {
      rows.push(part === "_" ? [] : ([...part].filter((c) => TILE.test(c)).slice(0, MAX_TILES) as Tile[]));
    }
  }

  const sRaw = q.get("s");
  const guesses = sRaw !== null && /^[1-6]$/.test(sRaw) ? Number(sRaw) : null;
  const pRaw = q.get("p");
  const p = pRaw !== null && /^-?\d{1,7}(\.\d{1,2})?$/.test(pRaw) ? Number(pRaw) : undefined;
  const uRaw = q.get("u");
  const user = uRaw !== null && /^[A-Za-z0-9_-]{3,20}$/.test(uRaw) ? uRaw : undefined;

  return { kind, mode, n: kind === "site" ? (n ?? today) : n, difficulty, topic, rows, guesses, pnl: kind === "market" ? p : undefined, user };
}
