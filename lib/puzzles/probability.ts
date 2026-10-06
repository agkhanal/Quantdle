/** Probability puzzle templates, easiest first. */

import { pick, int, die, NAMES, frac, texFrac, texFracApprox, num, step, ind, type Rng, type Template } from "./kit";

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

export const PROBABILITY: Template[] = [diceSum, atLeastOne, cardsBoth, duel, orderStats, uniformSum];
