/**
 * Market-making game logic. Pure functions, no network: runs entirely in the browser.
 *
 * A contract settles on some function of a few hidden dice. Each round you quote a
 * two-sided market (bid / ask) and three kinds of counterparty may trade with you:
 *  - sharp: sometimes present, has peeked at the NEXT die (adverse selection)
 *  - arb:   trades whenever your quote is off from today's fair value (punishes mispricing)
 *  - noise: trades a random side, more often when your market is tight (pays your spread)
 * Then one die is revealed. After the last die the contract settles and we score P&L.
 */

import type { Verdict } from "./types";

export interface Contract {
  id: string;
  name: string;
  blurb: string;
  dice: number;
  /** Widest market you're allowed to quote (ask − bid). */
  maxWidth: number;
  settle: (dice: number[]) => number;
}

export const CONTRACTS: Contract[] = [
  {
    id: "sum3",
    name: "Sum of 3 dice",
    blurb: "Settles at the sum of three fair dice.",
    dice: 3,
    maxWidth: 2,
    settle: (d) => d.reduce((a, b) => a + b, 0),
  },
  {
    id: "sum4",
    name: "Sum of 4 dice",
    blurb: "Settles at the sum of four fair dice.",
    dice: 4,
    maxWidth: 3,
    settle: (d) => d.reduce((a, b) => a + b, 0),
  },
  {
    id: "prod2",
    name: "Product of 2 dice",
    blurb: "Settles at the product of two fair dice.",
    dice: 2,
    maxWidth: 8,
    settle: (d) => d[0] * d[1],
  },
  {
    id: "max3",
    name: "Highest of 3 dice",
    blurb: "Settles at the highest of three fair dice.",
    dice: 3,
    maxWidth: 1,
    settle: (d) => Math.max(...d),
  },
  {
    id: "zero6",
    name: "Sum of 3 dice, sixes count as 0",
    blurb: "Settles at the sum of three fair dice, except any 6 counts as zero.",
    dice: 3,
    maxWidth: 2,
    settle: (d) => d.reduce((a, b) => a + (b === 6 ? 0 : b), 0),
  },
];

// ───────────── randomness ─────────────

/** Small seeded PRNG so the daily market is the same for everyone. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

const rollDie = (rng: Rng) => 1 + Math.floor(rng() * 6);

// ───────────── fair value ─────────────

/** Exact mean and standard deviation of the settlement, given the dice revealed so far. */
export function fairValue(c: Contract, revealed: number[]): { mean: number; sd: number } {
  const unknown = c.dice - revealed.length;
  const combos = Math.pow(6, unknown);
  let sum = 0;
  let sumSq = 0;
  const dice = [...revealed, ...Array(unknown).fill(1)];
  for (let i = 0; i < combos; i++) {
    let k = i;
    for (let j = 0; j < unknown; j++) {
      dice[revealed.length + j] = (k % 6) + 1;
      k = Math.floor(k / 6);
    }
    const v = c.settle(dice);
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / combos;
  return { mean, sd: Math.sqrt(Math.max(0, sumSq / combos - mean * mean)) };
}

// ───────────── game state ─────────────

export interface Trade {
  side: "buy" | "sell"; // from YOUR point of view
  size: number;
  price: number;
  who: "sharp" | "arb" | "noise";
}

export interface RoundResult {
  bid: number;
  ask: number;
  fair: number;
  sd: number;
  trades: Trade[];
  verdict: Verdict;
  revealed: number;
}

export interface MarketGameState {
  contract: Contract;
  dice: number[]; // hidden until revealed
  rounds: RoundResult[];
  seed: number;
}

export function newMarket(seed: number): MarketGameState {
  const rng = mulberry32(seed);
  const contract = CONTRACTS[Math.floor(rng() * CONTRACTS.length)];
  const dice = Array.from({ length: contract.dice }, () => rollDie(rng));
  return { contract, dice, rounds: [], seed };
}

export const revealedDice = (g: MarketGameState) => g.dice.slice(0, g.rounds.length);
export const isOver = (g: MarketGameState) => g.rounds.length >= g.contract.dice;

export function validateQuote(c: Contract, bid: number, ask: number): string | null {
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return "Enter a bid and an ask.";
  if (bid >= ask) return "Your bid has to be below your ask.";
  if (ask - bid > c.maxWidth + 1e-9) return `Too wide. Max width for this contract is ${c.maxWidth}.`;
  return null;
}

/**
 * Play one round: the counterparties react to your quote, then the next die is revealed.
 * Uses a per-round RNG derived from the seed, so results don't depend on how many
 * random numbers earlier rounds consumed.
 */
export function playRound(g: MarketGameState, bid: number, ask: number): MarketGameState {
  const c = g.contract;
  const r = g.rounds.length;
  const rng = mulberry32(g.seed * 31 + r * 7919 + 1);
  const known = g.dice.slice(0, r);
  const { mean: fair, sd } = fairValue(c, known);

  const trades: Trade[] = [];
  const unit = Math.max(0.5, c.maxWidth / 2);
  const sizeFor = (edge: number) => Math.min(3, 1 + Math.floor(edge / unit));

  // One of two "smart" traders may act. The sharp has peeked at the next die
  // (present 40% of the time); otherwise an arb trades against any mispricing.
  const sharp = rng() < 0.4;
  const view = sharp ? fairValue(c, g.dice.slice(0, r + 1)).mean : fair;
  const who = sharp ? "sharp" : "arb";
  if (view > ask + 0.25) {
    trades.push({ side: "sell", size: sizeFor(view - ask), price: ask, who });
  } else if (view < bid - 0.25) {
    trades.push({ side: "buy", size: sizeFor(bid - view), price: bid, who });
  }

  // Two noise traders, each trading a random side, more likely when your market is tight.
  const width = ask - bid;
  const pNoise = 0.25 + 0.45 * (1 - width / (c.maxWidth + 0.5));
  for (let i = 0; i < 2; i++) {
    if (rng() < pNoise) {
      trades.push(rng() < 0.5 ? { side: "sell", size: 1, price: ask, who: "noise" } : { side: "buy", size: 1, price: bid, who: "noise" });
    }
  }

  const err = Math.abs((bid + ask) / 2 - fair);
  const verdict: Verdict = err <= Math.max(0.3 * sd, 0.25) ? "green" : err <= Math.max(0.8 * sd, 0.75) ? "yellow" : "grey";

  return {
    ...g,
    rounds: [...g.rounds, { bid, ask, fair, sd, trades, verdict, revealed: g.dice[r] }],
  };
}

/** Position in lots (+ long / − short), cash from trades, and settlement P&L. */
export function book(g: MarketGameState) {
  let position = 0;
  let cash = 0;
  for (const round of g.rounds) {
    for (const t of round.trades) {
      if (t.side === "buy") {
        position += t.size;
        cash -= t.size * t.price;
      } else {
        position -= t.size;
        cash += t.size * t.price;
      }
    }
  }
  const settlement = isOver(g) ? g.contract.settle(g.dice) : null;
  const pnl = settlement === null ? null : cash + position * settlement;
  // Mark-to-fair while the game is running.
  const mark = fairValue(g.contract, revealedDice(g)).mean;
  return { position, cash, settlement, pnl, markPnl: cash + position * mark };
}