/**
 * Market-making game logic. Pure functions, no network: runs entirely in the browser.
 *
 * Contracts are generated procedurally: a family (sum of dice, max of dice, product,
 * coin counts, ...) with random parameters, picked to suit the difficulty. The contract
 * settles on a function of a few hidden draws (dice or coins). Each round you quote a
 * two-sided market (bid / ask) and three kinds of counterparty may trade with you:
 *  - sharp: sometimes present, has peeked at the NEXT draw (adverse selection)
 *  - arb:   trades whenever your quote is off from today's fair value (punishes mispricing)
 *  - noise: trades a random side, more often when your market is tight (pays your spread)
 * Then one draw is revealed. After the last one the contract settles and we score P&L.
 *
 * Fair value is computed exactly by enumerating every remaining outcome.
 * `scripts/verify-markets.ts` checks that against Monte Carlo simulation.
 */

import { DIFFICULTIES, type Difficulty, type Verdict } from "./types";

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

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

// ───────────── contracts ─────────────

/** One hidden draw: a fair die with `sides` faces, or a fair coin (0 = tails, 1 = heads). */
export type Draw = { kind: "die"; sides: number } | { kind: "coin" };

const outcomes = (d: Draw) => (d.kind === "coin" ? [0, 1] : Array.from({ length: d.sides }, (_, i) => i + 1));

export interface Contract {
  family: string;
  name: string;
  blurb: string;
  difficulty: Difficulty;
  draws: Draw[];
  settle: (xs: number[]) => number;
  /** Widest market you're allowed to quote (ask − bid). */
  maxWidth: number;
  /** Chance per round that the counterparty is the sharp trader rather than the arb. */
  sharpRate: number;
}

type Family = (rng: Rng) => Omit<Contract, "difficulty" | "maxWidth" | "sharpRate">;

const dice = (n: number, sides: number): Draw[] => Array.from({ length: n }, () => ({ kind: "die", sides }));
const coins = (n: number): Draw[] => Array.from({ length: n }, () => ({ kind: "coin" }));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const dieName = (s: number) => (s === 6 ? "dice" : `${s}-sided dice`);

const FAMILIES: Record<Difficulty, Record<string, Family>> = {
  easy: {
    sum(rng) {
      const n = int(rng, 2, 3);
      const s = pick(rng, [4, 6, 8]);
      return { family: "sum", name: `Sum of ${n} ${dieName(s)}`, blurb: `Settles at the sum of ${n} fair ${dieName(s)}.`, draws: dice(n, s), settle: sum };
    },
    heads(rng) {
      const n = int(rng, 3, 6);
      const k = pick(rng, [1, 2, 5, 10]);
      return {
        family: "heads",
        name: k === 1 ? `Heads in ${n} flips` : `${k} × heads in ${n} flips`,
        blurb: `Settles at ${k === 1 ? "" : `${k} times `}the number of heads in ${n} fair coin flips.`,
        draws: coins(n),
        settle: (xs) => k * sum(xs),
      };
    },
    single(rng) {
      const s = pick(rng, [10, 12, 20]);
      const k = pick(rng, [2, 3, 5]);
      return {
        family: "scaled",
        name: `${k} × d${s} + d${s}`,
        blurb: `Two fair ${s}-sided dice: settles at ${k} times the first plus the second.`,
        draws: dice(2, s),
        settle: (xs) => k * xs[0] + xs[1],
      };
    },
  },
  medium: {
    sum(rng) {
      const n = int(rng, 3, 4);
      const s = n === 4 ? pick(rng, [6, 8]) : pick(rng, [6, 8, 10, 12]);
      return { family: "sum", name: `Sum of ${n} ${dieName(s)}`, blurb: `Settles at the sum of ${n} fair ${dieName(s)}.`, draws: dice(n, s), settle: sum };
    },
    product(rng) {
      const s = pick(rng, [4, 6, 8]);
      return { family: "product", name: `Product of 2 ${dieName(s)}`, blurb: `Settles at the product of two fair ${dieName(s)}.`, draws: dice(2, s), settle: (xs) => xs[0] * xs[1] };
    },
    zeroTop(rng) {
      const n = int(rng, 3, 4);
      return {
        family: "zero-top",
        name: `Sum of ${n} dice, sixes count as 0`,
        blurb: `Settles at the sum of ${n} fair dice, except any 6 counts as zero.`,
        draws: dice(n, 6),
        settle: (xs) => sum(xs.map((x) => (x === 6 ? 0 : x))),
      };
    },
    countFace(rng) {
      const n = int(rng, 3, 5);
      const k = pick(rng, [5, 10, 20]);
      const face = int(rng, 1, 6);
      return {
        family: "count-face",
        name: `${k} × number of ${face}s in ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at ${k} for every die that shows a ${face}.`,
        draws: dice(n, 6),
        settle: (xs) => k * xs.filter((x) => x === face).length,
      };
    },
  },
  hard: {
    max(rng) {
      const n = int(rng, 2, 4);
      const s = pick(rng, [6, 8, 10]);
      return { family: "max", name: `Highest of ${n} ${dieName(s)}`, blurb: `Settles at the highest of ${n} fair ${dieName(s)}.`, draws: dice(n, s), settle: (xs) => Math.max(...xs) };
    },
    min(rng) {
      const n = int(rng, 2, 4);
      const s = pick(rng, [6, 8, 10]);
      return { family: "min", name: `Lowest of ${n} ${dieName(s)}`, blurb: `Settles at the lowest of ${n} fair ${dieName(s)}.`, draws: dice(n, s), settle: (xs) => Math.min(...xs) };
    },
    topTwo(rng) {
      const n = int(rng, 3, 4);
      return {
        family: "top-two",
        name: `Top 2 of ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at the sum of the two highest.`,
        draws: dice(n, 6),
        settle: (xs) => {
          const s = [...xs].sort((a, b) => b - a);
          return s[0] + s[1];
        },
      };
    },
    range(rng) {
      const n = int(rng, 3, 4);
      return {
        family: "range",
        name: `Range of ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at the highest minus the lowest.`,
        draws: dice(n, 6),
        settle: (xs) => Math.max(...xs) - Math.min(...xs),
      };
    },
    distinct(rng) {
      const n = int(rng, 3, 5);
      const k = pick(rng, [1, 10]);
      return {
        family: "distinct",
        name: `${k === 1 ? "" : `${k} × `}distinct faces in ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at ${k === 1 ? "" : `${k} times `}the number of different faces showing.`,
        draws: dice(n, 6),
        settle: (xs) => k * new Set(xs).size,
      };
    },
  },
  expert: {
    product3(rng) {
      const s = pick(rng, [4, 6]);
      return { family: "product3", name: `Product of 3 ${dieName(s)}`, blurb: `Settles at the product of three fair ${dieName(s)}.`, draws: dice(3, s), settle: (xs) => xs[0] * xs[1] * xs[2] };
    },
    squares(rng) {
      const n = int(rng, 2, 3);
      return { family: "squares", name: `Sum of squares of ${n} dice`, blurb: `Settles at the sum of the squares of ${n} fair dice.`, draws: dice(n, 6), settle: (xs) => sum(xs.map((x) => x * x)) };
    },
    evenOdd(rng) {
      const n = int(rng, 3, 4);
      return {
        family: "even-odd",
        name: `Evens minus odds, ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at the sum of the even dice minus the sum of the odd ones. It can be negative.`,
        draws: dice(n, 6),
        settle: (xs) => sum(xs.map((x) => (x % 2 === 0 ? x : -x))),
      };
    },
    maxTimesMin(rng) {
      const n = int(rng, 2, 3);
      return {
        family: "max-x-min",
        name: `Highest × lowest of ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at the highest die times the lowest die.`,
        draws: dice(n, 6),
        settle: (xs) => Math.max(...xs) * Math.min(...xs),
      };
    },
    headsSquared(rng) {
      const n = int(rng, 4, 6);
      return {
        family: "heads-squared",
        name: `(Heads in ${n} flips)²`,
        blurb: `Flip ${n} fair coins. Settles at the square of the number of heads.`,
        draws: coins(n),
        settle: (xs) => sum(xs) ** 2,
      };
    },
    diceAndCoin(rng) {
      const n = int(rng, 2, 3);
      return {
        family: "dice-and-coin",
        name: `Sum of ${n} dice, doubled on heads`,
        blurb: `Roll ${n} fair dice, then flip a coin. Settles at the dice total, doubled if the coin is heads.`,
        draws: [...dice(n, 6), { kind: "coin" }],
        settle: (xs) => sum(xs.slice(0, n)) * (xs[n] === 1 ? 2 : 1),
      };
    },
  },
};

/**
 * Contracts reserved for the daily market, so the daily is never a contract you could
 * have just played in practice (and practice never repeats the daily).
 */
const DAILY_FAMILIES: Record<Difficulty, Record<string, Family>> = {
  easy: {
    difference(rng) {
      const s = pick(rng, [8, 10, 12]);
      return {
        family: "difference",
        name: `First minus second, two d${s}`,
        blurb: `Two fair ${s}-sided dice: settles at the first minus the second. It can be negative.`,
        draws: dice(2, s),
        settle: (xs) => xs[0] - xs[1],
      };
    },
    oddSum(rng) {
      const n = int(rng, 3, 4);
      return {
        family: "odd-sum",
        name: `Odd dice only, ${n} dice`,
        blurb: `Roll ${n} fair dice. Settles at the total of the dice showing odd numbers; even dice count for nothing.`,
        draws: dice(n, 6),
        settle: (xs) => sum(xs.filter((x) => x % 2 === 1)),
      };
    },
    dieAndCoins(rng) {
      const m = int(rng, 2, 4);
      const k = pick(rng, [3, 5]);
      return {
        family: "die-and-coins",
        name: `A die plus ${k} per head (${m} coins)`,
        blurb: `Roll a fair die, then flip ${m} coins. Settles at the die plus ${k} for every head.`,
        draws: [...dice(1, 6), ...coins(m)],
        settle: (xs) => xs[0] + k * sum(xs.slice(1)),
      };
    },
  },
  medium: {
    pairBonus(rng) {
      const n = int(rng, 2, 3);
      return {
        family: "pair-bonus",
        name: `Sum of ${n} dice, +10 for a match`,
        blurb: `Roll ${n} fair dice. Settles at their total, plus 10 if any two dice show the same number.`,
        draws: dice(n, 6),
        settle: (xs) => sum(xs) + (new Set(xs).size < xs.length ? 10 : 0),
      };
    },
    longestRun(rng) {
      const n = int(rng, 5, 7);
      const k = pick(rng, [1, 5]);
      return {
        family: "longest-run",
        name: `${k === 1 ? "" : `${k} × `}longest run of heads, ${n} flips`,
        blurb: `Flip ${n} fair coins in order. Settles at ${k === 1 ? "" : `${k} times `}the length of the longest streak of consecutive heads.`,
        draws: coins(n),
        settle: (xs) => {
          let best = 0;
          let run = 0;
          for (const x of xs) best = Math.max(best, (run = x ? run + 1 : 0));
          return k * best;
        },
      };
    },
    beatTheFirst(rng) {
      const n = int(rng, 3, 5);
      return {
        family: "beat-the-first",
        name: `Beat the first die, ${n} dice`,
        blurb: `Roll ${n} fair dice in order. Settles at 10 for every later die that is higher than the first.`,
        draws: dice(n, 6),
        settle: (xs) => 10 * xs.slice(1).filter((x) => x > xs[0]).length,
      };
    },
  },
  hard: {
    median(rng) {
      const s = pick(rng, [6, 8, 10]);
      return {
        family: "median",
        name: `Middle of 3 ${dieName(s)}`,
        blurb: `Roll three fair ${dieName(s)}. Settles at the middle value.`,
        draws: dice(3, s),
        settle: (xs) => [...xs].sort((a, b) => a - b)[1],
      };
    },
    switches(rng) {
      const n = int(rng, 5, 7);
      const k = pick(rng, [2, 5]);
      return {
        family: "switches",
        name: `${k} × switches in ${n} flips`,
        blurb: `Flip ${n} fair coins in order. Settles at ${k} for every flip that differs from the one before it.`,
        draws: coins(n),
        settle: (xs) => k * xs.slice(1).filter((x, i) => x !== xs[i]).length,
      };
    },
    gap(rng) {
      const s = pick(rng, [10, 12, 20]);
      return {
        family: "gap",
        name: `Gap between two d${s}`,
        blurb: `Two fair ${s}-sided dice: settles at the absolute difference between them.`,
        draws: dice(2, s),
        settle: (xs) => Math.abs(xs[0] - xs[1]),
      };
    },
  },
  expert: {
    dieTimesHeads(rng) {
      const m = int(rng, 3, 4);
      return {
        family: "die-x-heads",
        name: `Die × heads in ${m} flips`,
        blurb: `Roll a fair die, then flip ${m} coins. Settles at the die times the number of heads.`,
        draws: [...dice(1, 6), ...coins(m)],
        settle: (xs) => xs[0] * sum(xs.slice(1)),
      };
    },
    betterPair() {
      return {
        family: "better-pair",
        name: "Better of two pairs",
        blurb: "Roll four fair dice: the first two are one pair, the last two another. Settles at the larger pair total.",
        draws: dice(4, 6),
        settle: (xs) => Math.max(xs[0] + xs[1], xs[2] + xs[3]),
      };
    },
    beforeSix(rng) {
      const n = int(rng, 3, 4);
      return {
        family: "before-six",
        name: `Total before the first six, ${n} dice`,
        blurb: `Roll ${n} fair dice in order. Settles at the total of the dice before the first 6 (all of them if no 6 shows).`,
        draws: dice(n, 6),
        settle: (xs) => {
          const at = xs.indexOf(6);
          return sum(at < 0 ? xs : xs.slice(0, at));
        },
      };
    },
  },
};

/** How each difficulty plays: market width (in standard deviations of the contract) and how often the sharp trader shows up. */
const LEVELS: Record<Difficulty, { widthSd: number; sharpRate: number }> = {
  easy: { widthSd: 1.0, sharpRate: 0.15 },
  medium: { widthSd: 0.8, sharpRate: 0.25 },
  hard: { widthSd: 0.7, sharpRate: 0.3 },
  expert: { widthSd: 0.65, sharpRate: 0.25 },
};

export type MarketPool = "practice" | "daily";
const POOLS: Record<MarketPool, typeof FAMILIES> = { practice: FAMILIES, daily: DAILY_FAMILIES };

export const familyCount = (d: Difficulty, pool: MarketPool = "practice") => Object.keys(POOLS[pool][d]).length;

/** Family ids in a pool, for checking the daily and practice pools never share a contract. */
export const familyIds = (pool: MarketPool) =>
  DIFFICULTIES.flatMap((d) => Object.values(POOLS[pool][d]).map((f) => f(mulberry32(1)).family));

// ───────────── fair value ─────────────

/** Exact mean and standard deviation of the settlement, given the draws revealed so far. */
export function fairValue(c: Contract, revealed: number[]): { mean: number; sd: number } {
  const rest = c.draws.slice(revealed.length).map(outcomes);
  const xs = [...revealed, ...rest.map((o) => o[0])];
  let n = 0;
  let total = 0;
  let totalSq = 0;
  const walk = (j: number) => {
    if (j === rest.length) {
      const v = c.settle(xs);
      n++;
      total += v;
      totalSq += v * v;
      return;
    }
    for (const o of rest[j]) {
      xs[revealed.length + j] = o;
      walk(j + 1);
    }
  };
  walk(0);
  const mean = total / n;
  return { mean, sd: Math.sqrt(Math.max(0, totalSq / n - mean * mean)) };
}

/** Roll a fresh set of hidden draws for a contract. */
export const sampleDraws = (c: Contract, rng: Rng) => c.draws.map((d) => (d.kind === "coin" ? (rng() < 0.5 ? 1 : 0) : 1 + Math.floor(rng() * d.sides)));

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
  draws: number[]; // hidden until revealed
  rounds: RoundResult[];
  seed: number;
}

/** Build a contract for a difficulty from a seed (deterministic). */
export function makeContract(difficulty: Difficulty, rng: Rng, pool: MarketPool = "practice"): Contract {
  const fam = pick(rng, Object.values(POOLS[pool][difficulty]));
  const base = fam(rng);
  const level = LEVELS[difficulty];
  const draft: Contract = { ...base, difficulty, maxWidth: 1, sharpRate: level.sharpRate };
  const { sd } = fairValue(draft, []);
  // Round the allowed width to a friendly increment.
  draft.maxWidth = Math.max(0.5, Math.round(sd * level.widthSd * 2) / 2);
  return draft;
}

export function newMarket(seed: number, difficulty: Difficulty, pool: MarketPool = "practice"): MarketGameState {
  const rng = mulberry32(seed);
  const contract = makeContract(difficulty, rng, pool);
  return { contract, draws: sampleDraws(contract, rng), rounds: [], seed };
}

/** The daily market cycles through the difficulties, one per day. */
export const dailyMarketDifficulty = (dailyNumber: number): Difficulty => DIFFICULTIES[(dailyNumber - 1) % DIFFICULTIES.length];
export const dailyMarketSeed = (dailyNumber: number) => dailyNumber * 7919 + 13;

export const revealedDraws = (g: MarketGameState) => g.draws.slice(0, g.rounds.length);
export const isOver = (g: MarketGameState) => g.rounds.length >= g.contract.draws.length;

export function validateQuote(c: Contract, bid: number, ask: number): string | null {
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return "Enter a bid and an ask.";
  if (bid >= ask) return "Your bid has to be below your ask.";
  if (ask - bid > c.maxWidth + 1e-9) return `Too wide. Max width for this contract is ${c.maxWidth}.`;
  return null;
}

/**
 * Play one round: the counterparties react to your quote, then the next draw is revealed.
 * Uses a per-round RNG derived from the seed, so results don't depend on how many
 * random numbers earlier rounds consumed.
 */
export function playRound(g: MarketGameState, bid: number, ask: number): MarketGameState {
  const c = g.contract;
  const r = g.rounds.length;
  const rng = mulberry32(g.seed * 31 + r * 7919 + 1);
  const { mean: fair, sd } = fairValue(c, g.draws.slice(0, r));

  const trades: Trade[] = [];
  const unit = Math.max(0.5, c.maxWidth / 2);
  const sizeFor = (edge: number) => Math.min(3, 1 + Math.floor(edge / unit));

  // One "smart" trader may act. The sharp has peeked at the next draw; otherwise an
  // arb trades against any mispricing relative to today's fair value.
  const sharp = rng() < c.sharpRate;
  const view = sharp ? fairValue(c, g.draws.slice(0, r + 1)).mean : fair;
  const who = sharp ? "sharp" : "arb";
  const slack = Math.max(0.25, c.maxWidth * 0.1);
  if (view > ask + slack) {
    trades.push({ side: "sell", size: sizeFor(view - ask), price: ask, who });
  } else if (view < bid - slack) {
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
    rounds: [...g.rounds, { bid, ask, fair, sd, trades, verdict, revealed: g.draws[r] }],
  };
}

/** Rebuild a game from its seed and the quotes played (used to restore the daily market). */
export function replay(seed: number, difficulty: Difficulty, quotes: [number, number][], pool: MarketPool = "daily"): MarketGameState {
  let g = newMarket(seed, difficulty, pool);
  for (const [b, a] of quotes) {
    if (isOver(g)) break;
    g = playRound(g, b, a);
  }
  return g;
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
  const settlement = isOver(g) ? g.contract.settle(g.draws) : null;
  const pnl = settlement === null ? null : cash + position * settlement;
  return { position, cash, settlement, pnl };
}