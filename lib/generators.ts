/**
 * Procedurally generated puzzles: templates with random parameters.
 *
 * Every template computes its answers exactly (closed form or a small exact
 * calculation), and every random quantity also has a simulator. Before a puzzle
 * is served, `generatePuzzle` runs a Monte Carlo check on each simulated step and
 * throws the puzzle away if any exact answer disagrees with the simulation.
 * `scripts/verify-generators.ts` runs the same check much harder across many seeds.
 */

import { mulberry32, type Rng } from "./market";
import { DIFFICULTIES, type Difficulty, type Puzzle, type Step, type Topic } from "./types";

// ───────────── helpers ─────────────

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const die = (rng: Rng, s: number) => 1 + Math.floor(rng() * s);
const flip = (rng: Rng, p: number) => rng() < p;

const NAMES = ["Alex", "Priya", "Diego", "Mei", "Omar", "Sofia", "Kenji", "Amara", "Luca", "Zoe", "Ravi", "Noor"];

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** "3/8 = 0.375" style display for exact fractions. */
function frac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return b === 1 ? `${a}` : `${a}/${b} ≈ ${num(a / b)}`;
}

/** LaTeX stacked fraction (reduced like `frac`), for display text only. */
function texFrac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return b === 1 ? `${a}` : `\\frac{${a}}{${b}}`;
}

/** LaTeX version of `frac`: reduced fraction plus decimal approximation. Display text only. */
function texFracApprox(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return b === 1 ? `${a}` : `\\frac{${a}}{${b}} \\approx ${num(a / b)}`;
}

/** Up to 4 decimals, or 4 significant figures for small numbers. */
function num(x: number): string {
  if (Number.isInteger(x)) return x.toLocaleString("en-US");
  const abs = Math.abs(x);
  if (abs >= 1) return String(+x.toFixed(4));
  return String(+x.toPrecision(4));
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** A step plus an optional simulator: one random sample whose mean should equal `answer`. */
interface GenStep extends Step {
  sim?: (rng: Rng) => number;
  /** Override the number of Monte Carlo trials for this step. */
  trials?: number;
}

function step(
  question: string,
  answer: number,
  answerDisplay: string,
  hint: string,
  explanation: string,
  extra: { sim?: (rng: Rng) => number; tolerance?: number; trials?: number } = {},
): GenStep {
  return {
    question,
    answer,
    answerDisplay,
    hint,
    explanation,
    tolerance: extra.tolerance ?? (Number.isInteger(answer) ? 0 : 0.01),
    sim: extra.sim,
    trials: extra.trials,
  };
}

interface Generated {
  title: string;
  category: string;
  story: string;
  steps: GenStep[];
  solution: string;
}

interface Template {
  id: string;
  difficulty: Difficulty;
  topic: Topic;
  make: (rng: Rng) => Generated;
}

const ind = (b: boolean) => (b ? 1 : 0);

// ───────────── EASY ─────────────

const diceSum: Template = {
  id: "dice-sum",
  difficulty: "easy",
  topic: "Probability",
  make(rng) {
    const s = pick(rng, [4, 6, 8, 10, 12]);
    const k = int(rng, 3, 2 * s - 1);
    const ways = s - Math.abs(k - (s + 1));
    const name = pick(rng, NAMES);
    return {
      title: pick(rng, ["Target Total", "Dice Dash", "Hit the Number"]),
      category: "Probability",
      story: `${name} rolls two fair ${s}-sided dice (faces 1 to ${s}). What is the probability the total is exactly ${k}?`,
      steps: [
        step("How many equally likely ordered outcomes are there?", s * s, `${s * s}`, `Each die has ${s} faces.`, `\\(${s} \\times ${s} = ${s * s}\\).`),
        step(
          `How many of those outcomes sum to ${k}?`,
          ways,
          `${ways}`,
          `For each value of the first die, is there a second die value that completes ${k}?`,
          `First die can be ${Math.max(1, k - s)} to ${Math.min(s, k - 1)}, each with exactly one partner: ${ways} outcomes.`,
          { sim: (r) => ind(die(r, s) + die(r, s) === k) * s * s },
        ),
        step(
          `What is \\(P(\\text{total} = ${k})\\)?`,
          ways / (s * s),
          frac(ways, s * s),
          "Favourable over total.",
          `\\(\\frac{${ways}}{${s * s}}\\).`,
          { sim: (r) => ind(die(r, s) + die(r, s) === k) },
        ),
      ],
      solution: `There are ${s * s} ordered outcomes, and ${ways} of them total ${k}, so \\(P = ${texFracApprox(ways, s * s)}\\). Sums near the middle (${s + 1}) are the most likely.`,
    };
  },
};

const atLeastOne: Template = {
  id: "at-least-one",
  difficulty: "easy",
  topic: "Probability",
  make(rng) {
    const s = pick(rng, [6, 8, 10, 12, 20]);
    const m = pick(rng, [1, 2, 3]);
    const n = int(rng, 2, 6);
    const what = m === 1 ? `a ${s}` : m === 2 ? `a ${s - 1} or ${s}` : `${s - 2} or higher`;
    const q = (s - m) / s;
    const isHit = (r: Rng) => die(r, s) > s - m;
    return {
      title: pick(rng, ["At Least Once", "Just One Hit", "Complement It"]),
      category: "Probability",
      story: `You roll a fair ${s}-sided die ${n} times. What is the probability you roll ${what} at least once?`,
      steps: [
        step(
          `On a single roll, what is the probability you do NOT roll ${what}?`,
          q,
          frac(s - m, s),
          `${m} of the ${s} faces count as a hit.`,
          `${s - m} of ${s} faces miss.`,
          { sim: (r) => ind(!isHit(r)) },
        ),
        step(
          `What is the probability of no hits in all ${n} rolls? (4 decimals)`,
          Math.pow(q, n),
          num(Math.pow(q, n)),
          "The rolls are independent, so multiply.",
          `\\(\\left(${texFrac(s - m, s)}\\right)^{${n}} \\approx ${num(Math.pow(q, n))}\\).`,
          { sim: (r) => ind(Array.from({ length: n }).every(() => !isHit(r))) },
        ),
        step(
          `What is \\(P(\\text{at least one hit})\\)? (4 decimals)`,
          1 - Math.pow(q, n),
          num(1 - Math.pow(q, n)),
          "'At least one' is the complement of 'none'.",
          `\\(1 - ${num(Math.pow(q, n))} = ${num(1 - Math.pow(q, n))}\\).`,
          { sim: (r) => ind(Array.from({ length: n }).some(() => isHit(r))) },
        ),
      ],
      solution: `Use the complement: \\(P(\\text{no hit}) = \\left(\\frac{${s - m}}{${s}}\\right)^{${n}} \\approx ${num(Math.pow(q, n))}\\), so \\(P(\\text{at least one}) \\approx ${num(1 - Math.pow(q, n))}\\).`,
    };
  },
};

const reroll: Template = {
  id: "reroll",
  difficulty: "easy",
  topic: "Expected Value",
  make(rng) {
    const s = 2 * int(rng, 2, 15); // even-sided dice 4..30, so a fresh roll is never a tie
    const ev = (s + 1) / 2;
    const t = Math.floor(ev) + 1; // keep anything above a fresh roll's value
    let keptSum = 0;
    for (let x = t; x <= s; x++) keptSum += x;
    const value = keptSum / s + ((t - 1) / s) * ev;
    return {
      title: pick(rng, ["Roll It Back", "Second Chance", "Keep or Reroll"]),
      category: "Expected Value",
      story: `A game pays you the face value of a fair ${s}-sided die, in dollars. After seeing your first roll you may re-roll once, but then you must keep the second roll. With optimal play, what is the game worth?`,
      steps: [
        step("What is the expected value of a single roll?", ev, num(ev), `Average the faces 1 through ${s}.`, `\\(\\frac{1 + ${s}}{2} = ${num(ev)}\\).`, {
          sim: (r) => die(r, s),
        }),
        step(
          "What is the smallest first roll you should keep?",
          t,
          `${t}`,
          "Re-rolling is worth exactly your answer to step 1. Keep anything that beats it.",
          `A re-roll is worth ${num(ev)}, so keep ${t} or more.`,
        ),
        step(
          "What is the game worth with optimal play?",
          value,
          num(value),
          `With probability \\(\\frac{${s - t + 1}}{${s}}\\) you keep a roll from ${t} to ${s}; otherwise you get a fresh roll worth ${num(ev)}.`,
          `\\(\\frac{${t} + \\cdots + ${s}}{${s}} + \\frac{${t - 1}}{${s}} \\cdot ${num(ev)} = ${num(value)}\\).`,
          {
            sim: (r) => {
              const x = die(r, s);
              return x >= t ? x : die(r, s);
            },
          },
        ),
      ],
      solution: `A fresh roll is worth ${num(ev)}, so keep ${t}+ and re-roll the rest. \\(\\text{EV} = ${num(value)}\\). That's backward induction: value the last decision first.`,
    };
  },
};

const cardsBoth: Template = {
  id: "cards-both",
  difficulty: "easy",
  topic: "Probability",
  make(rng) {
    const [label, c] = pick(rng, [
      ["hearts", 13],
      ["spades", 13],
      ["diamonds", 13],
      ["clubs", 13],
      ["aces", 4],
      ["kings", 4],
      ["face cards (J, Q, K)", 12],
      ["red cards", 26],
      ["black cards", 26],
      ["kings or queens", 8],
      ["number cards from 2 to 5", 16],
      ["cards ranked 10 or higher (10, J, Q, K, A)", 20],
    ] as const);
    const both = (c * (c - 1)) / (52 * 51);
    const draw2 = (r: Rng) => {
      const a = Math.floor(r() * 52);
      let b = Math.floor(r() * 51);
      if (b >= a) b++;
      return [a < c, b < c] as const;
    };
    return {
      title: pick(rng, ["Double Draw", "Two for Two", "Pair of Pulls"]),
      category: "Probability",
      story: `You draw two cards without replacement from a well-shuffled standard 52-card deck. What is the probability both are ${label}?`,
      steps: [
        step(`What is the probability the first card is one of the ${label}?`, c / 52, frac(c, 52), `There are ${c} of them in 52 cards.`, `\\(\\frac{${c}}{52}\\).`, {
          sim: (r) => ind(draw2(r)[0]),
        }),
        step(
          `Given the first card was one of them, what is the probability the second is too?`,
          (c - 1) / 51,
          frac(c - 1, 51),
          "One is gone. How many are left, out of how many cards?",
          `${c - 1} left among 51 cards.`,
          {
            sim: (r) => {
              const [x, y] = draw2(r);
              return x ? ind(y) : NaN;
            },
          },
        ),
        step(`What is \\(P(\\text{both are ${label}})\\)?`, both, frac(c * (c - 1), 52 * 51), "Multiply the two previous answers.", `\\(\\frac{${c}}{52} \\cdot \\frac{${c - 1}}{51}\\).`, {
          sim: (r) => {
            const [x, y] = draw2(r);
            return ind(x && y);
          },
        }),
      ],
      solution: `Chain rule: \\(P = \\frac{${c}}{52} \\cdot \\frac{${c - 1}}{51} = ${texFracApprox(c * (c - 1), 52 * 51)}\\). Without replacement, the second draw is slightly less likely to match.`,
    };
  },
};

const binomialHeads: Template = {
  id: "binomial-heads",
  difficulty: "easy",
  topic: "Combinatorics",
  make(rng) {
    const n = int(rng, 4, 10);
    const k = int(rng, 1, n - 1);
    const ways = choose(n, k);
    const total = 2 ** n;
    const heads = (r: Rng) => Array.from({ length: n }).filter(() => flip(r, 0.5)).length;
    return {
      title: pick(rng, ["Heads Count", "Exactly So", "Coin Census"]),
      category: "Combinatorics",
      story: `You flip a fair coin ${n} times. What is the probability of getting exactly ${k} heads?`,
      steps: [
        step(`How many equally likely sequences of ${n} flips are there?`, total, `${total}`, "Two outcomes per flip.", `\\(2^{${n}} = ${total}\\).`),
        step(
          `How many of them have exactly ${k} heads?`,
          ways,
          `${ways}`,
          `Choose which ${k} of the ${n} positions are heads.`,
          `\\(\\binom{${n}}{${k}} = ${ways}\\).`,
          { sim: (r) => ind(heads(r) === k) * total },
        ),
        step(`What is \\(P(\\text{exactly ${k} heads})\\)?`, ways / total, frac(ways, total), "Favourable over total.", `\\(\\frac{${ways}}{${total}}\\).`, {
          sim: (r) => ind(heads(r) === k),
        }),
      ],
      solution: `\\(P = \\frac{\\binom{${n}}{${k}}}{2^{${n}}} = \\frac{${ways}}{${total}} = ${texFracApprox(ways, total)}\\).`,
    };
  },
};

// ───────────── MEDIUM ─────────────

const bayes: Template = {
  id: "bayes",
  difficulty: "medium",
  topic: "Statistics",
  make(rng) {
    const prev = pick(rng, [0.001, 0.005, 0.01, 0.02, 0.05]);
    const sens = pick(rng, [0.9, 0.95, 0.99]);
    const fpr = pick(rng, [0.01, 0.02, 0.05, 0.1]);
    const joint = prev * sens;
    const pos = joint + (1 - prev) * fpr;
    const post = joint / pos;
    const pct = (x: number) => `${+(x * 100).toFixed(1)}%`;
    const pctTex = (x: number) => `${+(x * 100).toFixed(1)}\\%`;
    const sample = (r: Rng) => {
      const sick = flip(r, prev);
      return [sick, flip(r, sick ? sens : fpr)] as const;
    };
    const thing = pick(rng, [
      ["A disease affects", "a person", "has the disease"],
      ["A fraud scheme hits", "a transaction", "is fraudulent"],
      ["A defect affects", "a chip", "is defective"],
    ] as const);
    return {
      title: pick(rng, ["False Alarm", "Base Rates", "Positive Thinking"]),
      category: "Statistics",
      story: `${thing[0]} ${pct(prev)} of cases. A screen flags ${pct(sens)} of true cases, but also wrongly flags ${pct(fpr)} of clean ones. ${thing[1][0].toUpperCase() + thing[1].slice(1)} gets flagged. What is the probability it really ${thing[2]}?`,
      steps: [
        step("What is \\(P(\\text{true case and flagged})\\)? (4 significant figures)",
          joint,
          num(joint),
          "\\(P(\\text{case}) \\times P(\\text{flagged} \\mid \\text{case})\\).",
          `\\(${prev} \\times ${sens} = ${num(joint)}\\).`, {
          sim: (r) => {
            const [a, b] = sample(r);
            return ind(a && b);
          },
          trials: 200_000,
        }),
        step(
          "What is the overall \\(P(\\text{flagged})\\)? (4 significant figures)",
          pos,
          num(pos),
          `Add true flags and false flags: \\(${prev} \\cdot ${sens} + ${num(1 - prev)} \\cdot ${fpr}\\).`,
          `\\(${num(joint)} + ${num((1 - prev) * fpr)} = ${num(pos)}\\).`,
          { sim: (r) => ind(sample(r)[1]), trials: 200_000 },
        ),
        step("What is \\(P(\\text{true case} \\mid \\text{flagged})\\)? (4 decimals)",
          post,
          num(post),
          "Bayes: divide step 1 by step 2.",
          `\\(\\frac{${num(joint)}}{${num(pos)}} \\approx ${num(post)}\\).`, {
          sim: (r) => {
            const [a, b] = sample(r);
            return b ? ind(a) : NaN;
          },
          trials: 400_000,
        }),
      ],
      solution: `Bayes: \\(P(\\text{case} \\mid \\text{flag}) = \\frac{${num(joint)}}{${num(pos)}} \\approx ${pctTex(post)}\\). When the base rate is low, false flags from the large clean population can swamp the true ones.`,
    };
  },
};

const patterns: Template = {
  id: "patterns",
  difficulty: "medium",
  topic: "Expected Value",
  make(rng) {
    const p = int(rng, 4, 16) / 20; // 0.2, 0.25, ..., 0.8
    const q = 1 - p;
    const eH = 1 / p;
    const eHT = 1 / (p * q);
    const eHH = (1 + p) / (p * p);
    const waitFor = (r: Rng, pat: "HT" | "HH") => {
      let prev = "";
      for (let n = 1; ; n++) {
        const c = flip(r, p) ? "H" : "T";
        if (prev + c === pat) return n;
        prev = c;
      }
    };
    return {
      title: pick(rng, ["HH vs HT", "Pattern Wait", "Streak Hunter"]),
      category: "Expected Value",
      story: `A biased coin lands heads with probability ${p}. You flip it repeatedly. On average, how many flips until you see two heads in a row (\\(\\text{HH}\\))?`,
      steps: [
        step("Warm-up: expected number of flips to see the first H?", eH, num(eH), "Geometric distribution.", `\\(\\frac{1}{p} = \\frac{1}{${p}} = ${num(eH)}\\).`, {
          sim: (r) => {
            let n = 1;
            while (!flip(r, p)) n++;
            return n;
          },
        }),
        step(
          "Expected number of flips to see the pattern \\(\\text{HT}\\)?",
          eHT,
          num(eHT),
          "Wait for an H. After that, extra H's don't set you back; you just wait for a T.",
          `\\(\\frac{1}{p} + \\frac{1}{q} = \\frac{1}{pq} = ${num(eHT)}\\).`,
          { sim: (r) => waitFor(r, "HT") },
        ),
        step(
          "Expected number of flips to see \\(\\text{HH}\\)?",
          eHH,
          num(eHH),
          "Let \\(E\\) be the answer. After an H, a T sends you back to the start: \\(E = \\frac{1}{p} + 1 + q \\cdot E\\).",
          `Solving gives \\(E = \\frac{1 + p}{p^{2}} = ${num(eHH)}\\).`,
          { sim: (r) => waitFor(r, "HH") },
        ),
      ],
      solution: `\\(\\text{HT}\\) takes \\(\\frac{1}{pq} = ${num(eHT)}\\) flips but \\(\\text{HH}\\) takes \\(\\frac{1 + p}{p^{2}} = ${num(eHH)}\\). Chasing \\(\\text{HH}\\), a tail after a head wipes out your progress; chasing \\(\\text{HT}\\), an extra head keeps you where you were.`,
    };
  },
};

const distinctFaces: Template = {
  id: "distinct-faces",
  difficulty: "medium",
  topic: "Expected Value",
  make(rng) {
    const s = pick(rng, [4, 6, 8, 10, 12]);
    const n = int(rng, 3, 2 * s);
    const miss = Math.pow((s - 1) / s, n);
    const distinct = (r: Rng) => new Set(Array.from({ length: n }, () => die(r, s))).size;
    return {
      title: pick(rng, ["Distinct Faces", "How Many Different", "Linearity Lens"]),
      category: "Expected Value",
      story: `You roll a fair ${s}-sided die ${n} times. What is the expected number of different faces that show up?`,
      steps: [
        step(
          `What is the probability that face 1 never shows up? (4 decimals)`,
          miss,
          num(miss),
          `Each roll misses face 1 with probability \\(\\frac{${s - 1}}{${s}}\\).`,
          `\\(\\left(\\frac{${s - 1}}{${s}}\\right)^{${n}} \\approx ${num(miss)}\\).`,
          { sim: (r) => ind(Array.from({ length: n }).every(() => die(r, s) !== 1)) },
        ),
        step(
          "What is the probability face 1 shows up at least once? (4 decimals)",
          1 - miss,
          num(1 - miss),
          "Complement.",
          `\\(1 - ${num(miss)} = ${num(1 - miss)}\\).`,
          { sim: (r) => ind(Array.from({ length: n }).some(() => die(r, s) === 1)) },
        ),
        step(
          "What is the expected number of different faces? (4 significant figures)",
          s * (1 - miss),
          num(s * (1 - miss)),
          "Linearity of expectation: add up an indicator for each face, even though they're dependent.",
          `\\(${s} \\times ${num(1 - miss)} = ${num(s * (1 - miss))}\\).`,
          { sim: distinct },
        ),
      ],
      solution: `Write the count as a sum of ${s} indicators, one per face. Each face appears with probability \\(1 - \\left(\\frac{${s - 1}}{${s}}\\right)^{${n}}\\), so \\(\\mathbb{E} = ${s} \\cdot (1 - ${num(miss)}) \\approx ${num(s * (1 - miss))}\\). Linearity doesn't care that the indicators are dependent.`,
    };
  },
};

const coupon: Template = {
  id: "coupon",
  difficulty: "medium",
  topic: "Expected Value",
  make(rng) {
    const s = int(rng, 3, 10);
    let harmonic = 0;
    for (let k = 1; k <= s; k++) harmonic += 1 / k;
    const total = s * harmonic;
    const thing = pick(rng, [
      [`a fair ${s}-sided die`, "rolls", "face"],
      [`cereal boxes, each with one of ${s} equally likely toys`, "boxes", "toy"],
      [`a random draw from ${s} equally likely trading cards`, "draws", "card"],
    ] as const);
    return {
      title: pick(rng, ["Collect Them All", "Coupon Collector", "Full Set"]),
      category: "Expected Value",
      story: `You keep getting ${thing[0]}. On average, how many ${thing[1]} until you've seen every ${thing[2]} at least once?`,
      steps: [
        step(
          `Having seen exactly 1 distinct ${thing[2]}, what is the expected number of ${thing[1]} to see a new one?`,
          s / (s - 1),
          frac(s, s - 1),
          `${s - 1} of the ${s} are new. That's a geometric wait.`,
          `Success probability \\(\\frac{${s - 1}}{${s}}\\), so wait \\(${texFrac(s, s - 1)}\\) on average.`,
          {
            sim: (r) => {
              let n = 1;
              while (die(r, s) === 1) n++;
              return n;
            },
          },
        ),
        step(
          `Having seen ${s - 1} distinct, what is the expected wait for the last one?`,
          s,
          `${s}`,
          "Only one is new now.",
          `Success probability \\(\\frac{1}{${s}}\\), so ${s}.`,
          {
            sim: (r) => {
              let n = 1;
              while (die(r, s) !== 1) n++;
              return n;
            },
          },
        ),
        step(
          `What is the total expected number of ${thing[1]}? (4 significant figures)`,
          total,
          num(total),
          `Add the geometric waits: \\(\\frac{${s}}{${s}} + \\frac{${s}}{${s - 1}} + \\cdots + \\frac{${s}}{1}\\).`,
          `\\(${s} \\cdot \\left(1 + \\frac{1}{2} + \\cdots + \\frac{1}{${s}}\\right) \\approx ${num(total)}\\).`,
          {
            sim: (r) => {
              const seen = new Set<number>();
              let n = 0;
              while (seen.size < s) {
                seen.add(die(r, s));
                n++;
              }
              return n;
            },
            tolerance: 0.005,
          },
        ),
      ],
      solution: `Split the process into stages. With \\(k\\) seen, a new one arrives with probability \\(\\frac{${s} - k}{${s}}\\), so that stage takes \\(\\frac{${s}}{${s} - k}\\) on average. Total = \\(${s} \\cdot H_{${s}} \\approx ${num(total)}\\).`,
    };
  },
};

const duel: Template = {
  id: "duel",
  difficulty: "medium",
  topic: "Probability",
  make(rng) {
    const s = pick(rng, [6, 8, 10, 12]);
    const m = pick(rng, [1, 2, 3]);
    const p = m / s;
    const q = 1 - p;
    const [a, b] = [pick(rng, NAMES), pick(rng, NAMES.slice().reverse())];
    const B = a === b ? "Sam" : b;
    const what = m === 1 ? `a ${s}` : `${s - m + 1} or higher`;
    const aWins = (r: Rng) => {
      for (let turn = 0; ; turn++) if (die(r, s) > s - m) return ind(turn % 2 === 0);
    };
    return {
      title: pick(rng, ["First to Hit", "Dice Duel", "Who Wins?"]),
      category: "Probability",
      story: `${a} and ${B} take turns rolling a fair ${s}-sided die, ${a} first. The first to roll ${what} wins. What is the probability ${a} wins?`,
      steps: [
        step(`What is the probability ${a} wins on the very first roll?`, p, frac(m, s), `${m} winning face${m > 1 ? "s" : ""} out of ${s}.`, `\\(${texFrac(m, s)}\\).`, {
          sim: (r) => ind(die(r, s) > s - m),
        }),
        step(
          "What is the probability nobody wins in a full round (one roll each)?",
          q * q,
          frac((s - m) * (s - m), s * s),
          "Both have to miss.",
          `\\(\\left(\\frac{${s - m}}{${s}}\\right)^{2} = ${texFracApprox((s - m) * (s - m), s * s)}\\).`,
          { sim: (r) => ind(die(r, s) <= s - m && die(r, s) <= s - m) },
        ),
        step(
          `What is \\(P(\\text{${a} wins})\\)? (4 decimals)`,
          p / (1 - q * q),
          num(p / (1 - q * q)),
          `If the first round is a wash, the game restarts. So \\(P = p + q^{2} P\\).`,
          `\\(P = \\frac{p}{1 - q^{2}} = \\frac{1}{2 - p} = ${num(p / (1 - q * q))}\\).`,
          { sim: aWins },
        ),
      ],
      solution: `Self-similarity: \\(P = p + q^{2} P\\), so \\(P = \\frac{p}{1 - q^{2}} = \\frac{1}{2 - p} \\approx ${num(p / (1 - q * q))}\\). Going first is worth more when hits are likely.`,
    };
  },
};

// ───────────── HARD ─────────────

const gamblersRuin: Template = {
  id: "gamblers-ruin",
  difficulty: "hard",
  topic: "Markets",
  make(rng) {
    const i = int(rng, 2, 6);
    const N = i + int(rng, 3, 8);
    const p = pick(rng, [0.55, 0.6, 0.65, 0.45, 0.4]);
    const r_ = (1 - p) / p;
    const biased = (1 - Math.pow(r_, i)) / (1 - Math.pow(r_, N));
    const walk = (r: Rng, pw: number) => {
      let x = i;
      let steps = 0;
      while (x > 0 && x < N) {
        x += flip(r, pw) ? 1 : -1;
        steps++;
      }
      return [x === N, steps] as const;
    };
    return {
      title: pick(rng, ["Gambler's Ruin", "Bust or Bank", "Walk to the Target"]),
      category: "Markets",
      story: `You start with $${i} and repeatedly bet $1 on a coin flip. You stop when you reach $${N} or go broke. First explore a fair coin, then a coin you win with probability ${p}.`,
      steps: [
        step(
          `With a fair coin, what is the probability you reach $${N}?`,
          i / N,
          frac(i, N),
          "A fair game is a martingale: expected final wealth equals starting wealth.",
          `\\(${N} \\cdot P = ${i}\\), so \\(P = ${texFrac(i, N)}\\).`,
          { sim: (r) => ind(walk(r, 0.5)[0]) },
        ),
        step(
          "With a fair coin, what is the expected number of bets until the game ends?",
          i * (N - i),
          `${i * (N - i)}`,
          `For a symmetric walk between \\(0\\) and \\(N\\) started at \\(i\\), the expected duration is \\(i \\cdot (N - i)\\).`,
          `\\(${i} \\times ${N - i} = ${i * (N - i)}\\).`,
          { sim: (r) => walk(r, 0.5)[1], tolerance: 0 },
        ),
        step(
          `Now you win each bet with probability ${p}. What is the probability you reach $${N}? (4 decimals)`,
          biased,
          num(biased),
          "With \\(r = q/p\\), \\(P = \\frac{1 - r^{i}}{1 - r^{N}}\\).",
          `\\(r = ${num(r_)}\\). \\(P = \\frac{1 - r^{${i}}}{1 - r^{${N}}} \\approx ${num(biased)}\\).`,
          { sim: (r) => ind(walk(r, p)[0]) },
        ),
      ],
      solution: `Fair game: \\(P = \\frac{${i}}{${N}}\\) and duration \\(${i} \\cdot ${N - i} = ${i * (N - i)}\\). With \\(p = ${p}\\), use \\(r = q/p\\): \\(P = \\frac{1 - r^{${i}}}{1 - r^{${N}}} \\approx ${num(biased)}\\). A small edge changes the odds a lot.`,
    };
  },
};

const orderStats: Template = {
  id: "order-stats",
  difficulty: "hard",
  topic: "Probability",
  make(rng) {
    const n = int(rng, 2, 10);
    const sample = (r: Rng) => Array.from({ length: n }, () => r());
    return {
      title: pick(rng, ["Max and Min", "Order Statistics", "Spread of Points"]),
      category: "Probability",
      story: `${n} points are dropped independently and uniformly at random on \\([0, 1]\\). What is the expected distance between the leftmost and rightmost points?`,
      steps: [
        step(
          "What is \\(\\mathbb{E}[\\max]\\)?",
          n / (n + 1),
          frac(n, n + 1),
          `\\(P(\\max \\leq t) = t^{${n}}\\). Differentiate for the density, or use symmetry.`,
          `\\(\\int_0^1 t \\cdot ${n}t^{${n - 1}}\\,dt = \\frac{${n}}{${n + 1}}\\).`,
          { sim: (r) => Math.max(...sample(r)) },
        ),
        step(
          "What is \\(\\mathbb{E}[\\min]\\)?",
          1 / (n + 1),
          frac(1, n + 1),
          "By symmetry, \\(\\min\\) is distributed like \\(1 - \\max\\).",
          `\\(1 - \\frac{${n}}{${n + 1}} = \\frac{1}{${n + 1}}\\).`,
          {
          sim: (r) => Math.min(...sample(r)),
        }),
        step(
          "What is \\(\\mathbb{E}[\\max - \\min]\\)?",
          (n - 1) / (n + 1),
          frac(n - 1, n + 1),
          "Expectation is linear.",
          `\\(\\frac{${n}}{${n + 1}} - \\frac{1}{${n + 1}} = ${texFrac(n - 1, n + 1)}\\).`,
          {
            sim: (r) => {
              const xs = sample(r);
              return Math.max(...xs) - Math.min(...xs);
            },
          },
        ),
      ],
      solution: `${n} uniform points split \\([0, 1]\\) into ${n + 1} gaps of equal expected length \\(\\frac{1}{${n + 1}}\\). So \\(\\mathbb{E}[\\min] = \\frac{1}{${n + 1}}\\), \\(\\mathbb{E}[\\max] = \\frac{${n}}{${n + 1}}\\), and \\(\\mathbb{E}[\\text{range}] = ${texFracApprox(n - 1, n + 1)}\\).`,
    };
  },
};

const optimalStopping: Template = {
  id: "optimal-stopping",
  difficulty: "hard",
  topic: "Expected Value",
  make(rng) {
    const s = pick(rng, [6, 8, 10, 12, 20]);
    const n = pick(rng, [3, 4]);
    const V = [0, (s + 1) / 2];
    for (let k = 2; k <= n; k++) {
      let sum = 0;
      for (let x = 1; x <= s; x++) sum += Math.max(x, V[k - 1]);
      V.push(sum / s);
    }
    const play = (r: Rng, rolls: number) => {
      for (let left = rolls; left >= 1; left--) {
        const x = die(r, s);
        if (left === 1 || x > V[left - 1]) return x;
      }
      return 0;
    };
    return {
      title: pick(rng, ["Stop or Go", "Know When to Stop", "Roll Again?"]),
      category: "Expected Value",
      story: `You may roll a fair ${s}-sided die up to ${n} times. After each roll you can stop and take its face value in dollars, or throw it away and roll again. With optimal play, what is the game worth?`,
      steps: [
        ...Array.from({ length: n }, (_, j) => {
          const k = j + 1;
          return step(
            k === 1 ? "What is the game worth with just 1 roll?" : `What is it worth with ${k} rolls? (4 significant figures)`,
            V[k],
            num(V[k]),
            k === 1
              ? `Average the faces 1 to ${s}.`
              : `After your first roll, compare it with the value of the ${k - 1}-roll game (${num(V[k - 1])}). Keep it only if it's bigger.`,
            k === 1 ? `\\(\\frac{1 + ${s}}{2} = ${num(V[1])}\\).` : `\\(\\mathbb{E}[\\max(X, ${num(V[k - 1])})] = ${num(V[k])}\\).`,
            { sim: (r) => play(r, k), tolerance: 0.005 },
          );
        }),
      ],
      solution: `Backward induction: \\(V_1 = ${num(V[1])}\\), and \\(V_{k+1} = \\mathbb{E}[\\max(X, V_k)]\\). Keep a roll only if it beats what the remaining rolls are worth. \\(${V.slice(1)
        .map((v, k) => `V_{${k + 1}} = ${num(v)}`)
        .join(", ")}\\).`,
    };
  },
};

const derangement: Template = {
  id: "derangement",
  difficulty: "hard",
  topic: "Combinatorics",
  make(rng) {
    const n = int(rng, 4, 8);
    let d = 0;
    for (let k = 0; k <= n; k++) d += ((k % 2 ? -1 : 1) * factorial(n)) / factorial(k);
    d = Math.round(d);
    const perm = (r: Rng) => {
      const a = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const name = pick(rng, NAMES);
    return {
      title: pick(rng, ["Wrong Envelopes", "Hat Check", "Nobody Matches"]),
      category: "Combinatorics",
      story: `${name} puts ${n} letters into ${n} addressed envelopes completely at random. What is the probability that no letter ends up in its correct envelope?`,
      steps: [
        step("What is the probability that letter 1 lands in its own envelope?", 1 / n, frac(1, n), "It's equally likely to be in any envelope.", `\\(\\frac{1}{${n}}\\).`, {
          sim: (r) => ind(perm(r)[0] === 0),
        }),
        step(
          "What is the expected number of letters in their correct envelope?",
          1,
          "1",
          "Linearity: add up the probability for each letter.",
          `\\(${n} \\times \\frac{1}{${n}} = 1\\), whatever \\(n\\) is.`,
          { sim: (r) => perm(r).filter((x, i) => x === i).length },
        ),
        step(
          "What is \\(P(\\text{no letter is in its correct envelope})\\)? (4 decimals)",
          d / factorial(n),
          frac(d, factorial(n)),
          "Inclusion–exclusion: \\(\\sum_{k=0}^{n} \\frac{(-1)^{k}}{k!}\\).",
          `\\(\\frac{D_{${n}}}{${n}!} = \\frac{${d}}{${factorial(n)}} \\approx ${num(d / factorial(n))}\\).`,
          { sim: (r) => ind(perm(r).every((x, i) => x !== i)) },
        ),
      ],
      solution: `By inclusion–exclusion, \\(P(\\text{no fixed point}) = \\sum_{k=0}^{${n}} \\frac{(-1)^{k}}{k!} = \\frac{${d}}{${factorial(n)}} \\approx ${num(d / factorial(n))}\\), already very close to \\(\\frac{1}{e} \\approx 0.3679\\). The expected number of matches is exactly 1 for any \\(n\\).`,
    };
  },
};

// ───────────── EXPERT ─────────────

const binomialTree: Template = {
  id: "binomial-tree",
  difficulty: "expert",
  topic: "Markets",
  make(rng) {
    const u = pick(rng, [1.1, 1.2, 1.25]);
    const d = pick(rng, [0.8, 0.9]);
    const n = pick(rng, [2, 3]);
    const S0 = 100;
    const K = pick(rng, [90, 95, 100, 105, 110].filter((k) => k < S0 * Math.pow(u, n)));
    const q = (1 - d) / (u - d);
    let itm = 0;
    let price = 0;
    for (let j = 0; j <= n; j++) {
      const ST = S0 * Math.pow(u, j) * Math.pow(d, n - j);
      const pr = choose(n, j) * Math.pow(q, j) * Math.pow(1 - q, n - j);
      if (ST > K) itm += pr;
      price += pr * Math.max(ST - K, 0);
    }
    const terminal = (r: Rng) => {
      let S = S0;
      for (let t = 0; t < n; t++) S *= flip(r, q) ? u : d;
      return S;
    };
    return {
      title: pick(rng, ["Binomial Tree", "Price the Call", "Up, Down, Strike"]),
      category: "Markets",
      story: `A stock trades at $${S0}. Each period it moves up \\(\\times ${u}\\) or down \\(\\times ${d}\\). Interest rates are zero. Price a European call with strike $${K} expiring after ${n} periods.`,
      steps: [
        step(
          "What is the risk-neutral probability of an up move? (4 decimals)",
          q,
          num(q),
          `With \\(r = 0\\) the stock is a martingale: \\(${S0} = q \\cdot ${num(S0 * u)} + (1 - q) \\cdot ${num(S0 * d)}\\).`,
          `\\(q = \\frac{1 - d}{u - d} = ${num(q)}\\).`,
        ),
        step(
          "Under that probability, what is \\(P(\\text{the call finishes in the money})\\)? (4 decimals)",
          itm,
          num(itm),
          `List the ${n + 1} terminal prices and add up the binomial probabilities of the ones above $${K}.`,
          `\\(\\sum_{j:\\, S_j > ${K}} \\binom{${n}}{j} q^{j} (1 - q)^{${n} - j} = ${num(itm)}\\).`,
          { sim: (r) => ind(terminal(r) > K) },
        ),
        step(
          "What is the call worth today? (2 decimals)",
          price,
          `$${price.toFixed(2)}`,
          "Average the payoff \\(\\max(S - K, 0)\\) over terminal nodes using the risk-neutral probabilities. No discounting since \\(r = 0\\).",
          `\\(\\sum_{j=0}^{${n}} \\binom{${n}}{j} q^{j} (1 - q)^{${n} - j} \\cdot \\max(S_j - ${K}, 0) = ${price.toFixed(4)}\\).`,
          { sim: (r) => Math.max(terminal(r) - K, 0), tolerance: 0.005 },
        ),
      ],
      solution: `Risk-neutral \\(q = \\frac{1 - d}{u - d} = ${num(q)}\\). The price is the \\(q\\)-weighted average payoff over the ${n + 1} terminal nodes: \\(\\approx\\) $${price.toFixed(2)}. Real-world probabilities never enter.`,
    };
  },
};

const kelly: Template = {
  id: "kelly",
  difficulty: "expert",
  topic: "Markets",
  make(rng) {
    const p = pick(rng, [0.52, 0.55, 0.58, 0.6, 0.62, 0.65, 0.68, 0.7, 0.75]);
    const b = pick(rng, [1, 1.5, 2, 3]);
    const q = 1 - p;
    const edge = p * b - q;
    const f = p - q / b;
    const g = p * Math.log(1 + b * f) + q * Math.log(1 - f);
    const odds = b === 1 ? "even money" : `${b}-to-1`;
    return {
      title: pick(rng, ["Bet Like Kelly", "How Much to Bet", "Growth Optimal"]),
      category: "Markets",
      story: `You're offered a repeated ${odds} bet (win $${b} per $1 staked, or lose the $1) that you win with probability ${p}. You stake a fixed fraction \\(f\\) of your bankroll each round. What fraction maximizes long-run growth, and how fast do you grow?`,
      steps: [
        step("What is your expected profit per $1 staked?", edge, num(edge), `Win $${b} with probability ${p}, lose $1 with probability ${num(q)}.`, `\\(${p} \\cdot ${b} - ${num(q)} = ${num(edge)}\\).`, {
          sim: (r) => (flip(r, p) ? b : -1),
        }),
        step(
          "What fraction \\(f\\) maximizes expected log growth per round? (4 decimals)",
          f,
          num(f),
          `Maximize \\(g(f) = ${p} \\cdot \\ln(1 + ${b}f) + ${num(q)} \\cdot \\ln(1 - f)\\). Set \\(g'(f) = 0\\).`,
          `\\(f^{*} = p - \\frac{q}{b} = ${num(f)}\\).`,
        ),
        step(
          "At that fraction, what is the expected log growth per round? (4 significant figures)",
          g,
          num(g),
          `Plug \\(f^{*}\\) into \\(g(f)\\).`,
          `\\(${p} \\cdot \\ln(${num(1 + b * f)}) + ${num(q)} \\cdot \\ln(${num(1 - f)}) \\approx ${num(g)}\\).`,
          { sim: (r) => (flip(r, p) ? Math.log(1 + b * f) : Math.log(1 - f)), trials: 200_000 },
        ),
      ],
      solution: `Kelly: \\(f^{*} = p - \\frac{q}{b} = ${num(f)}\\), giving growth \\(g \\approx ${num(g)}\\) per round (compounded). Over-betting past about \\(2f^{*}\\) turns long-run growth negative even with an edge.`,
    };
  },
};

const uniformSum: Template = {
  id: "uniform-sum",
  difficulty: "expert",
  topic: "Probability",
  make(rng) {
    const t = int(rng, 3, 10) / 10; // 0.3 .. 1.0
    const draws = (r: Rng) => {
      let sum = 0;
      let n = 0;
      while (sum <= t) {
        sum += r();
        n++;
      }
      return n;
    };
    return {
      title: pick(rng, ["Over the Line", "Summing Uniforms", "Cross the Threshold"]),
      category: "Probability",
      story: `You keep drawing independent \\(\\text{Uniform}(0, 1)\\) numbers and adding them up. Let \\(N\\) be the number of draws needed for the running sum to exceed ${t}. What is \\(\\mathbb{E}[N]\\)?`,
      steps: [
        step(
          `What is \\(P(U_1 + U_2 < ${t})\\)? (4 decimals)`,
          (t * t) / 2,
          num((t * t) / 2),
          `Area of the triangle \\(x + y < ${t}\\) in the unit square.`,
          `\\(\\frac{${t}^{2}}{2} = ${num((t * t) / 2)}\\).`,
          {
          sim: (r) => ind(r() + r() < t),
        }),
        step(
          `What is \\(P(U_1 + U_2 + U_3 < ${t})\\)? (4 decimals)`,
          Math.pow(t, 3) / 6,
          num(Math.pow(t, 3) / 6),
          "Volume of a corner simplex. In general it's \\(\\frac{t^{n}}{n!}\\).",
          `\\(\\frac{${t}^{3}}{6} = ${num(Math.pow(t, 3) / 6)}\\).`,
          { sim: (r) => ind(r() + r() + r() < t) },
        ),
        step(
          "What is \\(\\mathbb{E}[N]\\)? (4 decimals)",
          Math.exp(t),
          num(Math.exp(t)),
          "\\(\\mathbb{E}[N] = \\sum_{n \\geq 0} P(N > n)\\), and \\(N > n\\) exactly when the first \\(n\\) draws sum to less than \\(t\\).",
          `\\(\\sum_{n \\geq 0} \\frac{${t}^{n}}{n!} = e^{${t}} \\approx ${num(Math.exp(t))}\\).`,
          { sim: draws, tolerance: 0.005 },
        ),
      ],
      solution: `\\(P(N > n) = P(U_1 + \\cdots + U_n < ${t}) = \\frac{${t}^{n}}{n!}\\). Tail-sum: \\(\\mathbb{E}[N] = \\sum_{n \\geq 0} \\frac{${t}^{n}}{n!} = e^{${t}} \\approx ${num(Math.exp(t))}\\).${t === 1 ? " With \\(t = 1\\) that's Euler's number itself." : ""}`,
    };
  },
};

const ballot: Template = {
  id: "ballot",
  difficulty: "expert",
  topic: "Combinatorics",
  make(rng) {
    const a = int(rng, 3, 8);
    const b = int(rng, 1, a - 1);
    const [A, B] = ["Ana", "Ben"];
    const count = (r: Rng) => {
      const votes = [...Array(a).fill(1), ...Array(b).fill(-1)];
      for (let i = votes.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [votes[i], votes[j]] = [votes[j], votes[i]];
      }
      return votes;
    };
    const alwaysAhead = (v: number[]) => {
      let lead = 0;
      for (const x of v) {
        lead += x;
        if (lead <= 0) return false;
      }
      return true;
    };
    return {
      title: pick(rng, ["Ballot Problem", "Always Ahead", "Counting Votes"]),
      category: "Combinatorics",
      story: `In an election ${A} gets ${a} votes and ${B} gets ${b}. The ballots are counted one at a time in a uniformly random order. What is the probability ${A} is strictly ahead throughout the entire count?`,
      steps: [
        step(
          `What is the probability the first ballot counted is for ${B}?`,
          b / (a + b),
          frac(b, a + b),
          `If it is, ${A} is not ahead after one ballot.`,
          `${b} of the ${a + b} ballots.`,
          { sim: (r) => ind(count(r)[0] === -1) },
        ),
        step(
          "How many distinct orders of A/B ballots are there?",
          choose(a + b, a),
          `${choose(a + b, a)}`,
          `Choose which ${a} of the ${a + b} positions are ${A}'s.`,
          `\\(\\binom{${a + b}}{${a}} = ${choose(a + b, a)}\\).`,
        ),
        step(
          `What is \\(P(\\text{${A} is strictly ahead throughout})\\)?`,
          (a - b) / (a + b),
          frac(a - b, a + b),
          `Bertrand's ballot theorem. Or: bad orders that start with ${B} can be reflected one-to-one onto bad orders that start with ${A}.`,
          `\\(\\frac{a - b}{a + b} = ${texFrac(a - b, a + b)}\\).`,
          { sim: (r) => ind(alwaysAhead(count(r))) },
        ),
      ],
      solution: `Bertrand's ballot theorem: \\(P = \\frac{a - b}{a + b} = ${texFracApprox(a - b, a + b)}\\). Proof sketch: every bad order starting with ${B} reflects one-to-one onto a bad order starting with ${A}, so \\(P(\\text{bad}) = 2 \\cdot P(\\text{first is ${B}}) = \\frac{2b}{a + b}\\).`,
    };
  },
};

export const TEMPLATES: Template[] = [
  diceSum,
  atLeastOne,
  reroll,
  cardsBoth,
  binomialHeads,
  bayes,
  patterns,
  distinctFaces,
  coupon,
  duel,
  gamblersRuin,
  orderStats,
  optimalStopping,
  derangement,
  binomialTree,
  kelly,
  uniformSum,
  ballot,
];

// ───────────── Monte Carlo check ─────────────

export interface CheckResult {
  step: number;
  exact: number;
  estimate: number;
  stdErr: number;
  ok: boolean;
}

/** Simulate each step that has a simulator; ok when the exact answer is within `z` standard errors. */
export function monteCarloCheck(steps: GenStep[], rng: Rng, trialsScale = 1, z = 5): CheckResult[] {
  const out: CheckResult[] = [];
  steps.forEach((s, i) => {
    if (!s.sim) return;
    const trials = Math.round((s.trials ?? 20_000) * trialsScale);
    let n = 0;
    let mean = 0;
    let m2 = 0;
    for (let t = 0; t < trials; t++) {
      const x = s.sim(rng);
      if (Number.isNaN(x)) continue; // conditional sims skip samples outside the condition
      n++;
      const d = x - mean;
      mean += d / n;
      m2 += d * (x - mean);
    }
    const stdErr = n > 1 ? Math.sqrt(m2 / (n - 1) / n) : Infinity;
    const ok = n > 1 && Math.abs(mean - s.answer) <= z * stdErr + 1e-9 * Math.max(1, Math.abs(s.answer));
    out.push({ step: i, exact: s.answer, estimate: mean, stdErr, ok });
  });
  return out;
}

export function templatesFor(d: Difficulty, topic?: Topic) {
  return TEMPLATES.filter((t) => t.difficulty === d && (!topic || t.topic === topic));
}

/** The difficulties that have at least one template for a topic (all of them when no topic is picked). */
export function levelsFor(topic?: Topic | null): Difficulty[] {
  return DIFFICULTIES.filter((d) => templatesFor(d, topic ?? undefined).length > 0);
}

/** The level closest to `d` that has templates for the topic (`d` itself when it has some). */
export function nearestLevel(d: Difficulty, topic?: Topic | null): Difficulty {
  const levels = levelsFor(topic);
  if (!levels.length || levels.includes(d)) return d;
  const at = DIFFICULTIES.indexOf(d);
  return levels.reduce((best, l) => (Math.abs(DIFFICULTIES.indexOf(l) - at) < Math.abs(DIFFICULTIES.indexOf(best) - at) ? l : best));
}

/** Build a template's puzzle for a given seed, without the Monte Carlo check. */
export function buildFromTemplate(t: Template, seed: number) {
  const g = t.make(mulberry32(seed));
  return { generated: g, id: `gen-${t.id}-${seed}` };
}

function toPuzzle(t: Template, id: string, g: Generated): Puzzle {
  return {
    id,
    title: g.title,
    category: t.topic,
    difficulty: t.difficulty,
    story: g.story,
    // Strip simulators: only plain data goes into the sealed token.
    steps: g.steps.map(({ sim: _sim, trials: _trials, ...rest }) => rest),
    solution: g.solution,
  };
}

/**
 * Generate a verified puzzle. Picks a template for the difficulty (and topic, if given),
 * builds it from the seed, and only returns it if every simulated step agrees with the
 * exact answer. A topic with no template at that difficulty uses its nearest level.
 */
export function generatePuzzle(difficulty: Difficulty, seed: number = Math.floor(Math.random() * 2 ** 31), topic?: Topic): Puzzle {
  const pool = templatesFor(nearestLevel(difficulty, topic), topic);
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = (seed + attempt * 104_729) >>> 0;
    const t = pool[s % pool.length];
    const { generated, id } = buildFromTemplate(t, s);
    const checks = monteCarloCheck(generated.steps, mulberry32(s ^ 0x9e3779b9));
    if (checks.every((c) => c.ok)) return toPuzzle(t, id, generated);
    console.warn(`[quantdle] ${id} failed its Monte Carlo check; trying another`, checks.filter((c) => !c.ok));
  }
  throw new Error("Could not generate a verified puzzle.");
}