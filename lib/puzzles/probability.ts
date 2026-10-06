/** Probability puzzle templates, easiest first. */

import { pick, int, die, NAMES, frac, texFrac, texFracApprox, num, choose, step, ind, type Rng, type Template } from "./kit";

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

const birthday: Template = {
  id: "birthday",
  difficulty: "medium",
  topic: "Probability",
  make(rng) {
    const setting = pick(rng, [
      { d: 365, ns: [15, 20, 23, 25, 30, 35], who: "people are in a room", what: "share a birthday", unit: "birthdays (ignore Feb 29, all 365 days equally likely)" },
      { d: 100, ns: [8, 10, 12, 15], who: "people each pick a whole number from 1 to 100 at random", what: "pick the same number", unit: "picks" },
      { d: 52, ns: [5, 6, 7, 8, 10], who: "cards are drawn from a shuffled deck, with each card put back and the deck reshuffled before the next draw", what: "are the same card", unit: "draws" },
    ] as const);
    const { d } = setting;
    const n = pick(rng, setting.ns);
    const distinct = (k: number) => {
      let p = 1;
      for (let i = 0; i < k; i++) p *= (d - i) / d;
      return p;
    };
    const allDiff = distinct(n);
    let half = 1;
    while (distinct(half) > 0.5) half++;
    const sample = (r: Rng) => {
      const seen = new Set<number>();
      for (let i = 0; i < n; i++) seen.add(Math.floor(r() * d));
      return seen.size === n;
    };
    return {
      title: pick(rng, ["Shared Birthday", "Collision Course", "Same Again"]),
      category: "Probability",
      story: `${n} ${setting.who}. What is the probability that at least two of them ${setting.what}? And how big would the group need to be before that's more likely than not?`,
      steps: [
        step(
          `What is the probability all ${n} ${setting.unit.split(" (")[0]} are different? (4 decimals)`,
          allDiff,
          num(allDiff),
          `Go one at a time: the second must avoid 1 value, the third must avoid 2, and so on.`,
          `\\(\\prod_{i=0}^{${n - 1}} \\frac{${d} - i}{${d}} \\approx ${num(allDiff)}\\).`,
          { sim: (r) => ind(sample(r)) },
        ),
        step(
          `What is the probability at least two ${setting.what}? (4 decimals)`,
          1 - allDiff,
          num(1 - allDiff),
          "Complement of all different.",
          `\\(1 - ${num(allDiff)} = ${num(1 - allDiff)}\\).`,
          { sim: (r) => ind(!sample(r)) },
        ),
        step(
          "What is the smallest group size for which a match is more likely than not?",
          half,
          `${half}`,
          "Keep multiplying factors until the all-different probability drops below 1/2.",
          `With ${half - 1} it's \\(${num(1 - distinct(half - 1))}\\); with ${half} it's \\(${num(1 - distinct(half))}\\).`,
        ),
      ],
      solution: `\\(P(\\text{all different}) = \\prod_{i=0}^{n-1} \\left(1 - \\frac{i}{${d}}\\right) \\approx ${num(allDiff)}\\), so a match has probability \\(\\approx ${num(1 - allDiff)}\\). It crosses 50% at just ${half}: there are \\(\\binom{n}{2}\\) pairs, which grows like \\(n^2\\), so matches come far sooner than intuition says (roughly \\(\\sqrt{2 \\ln 2 \\cdot ${d}}\\)).`,
    };
  },
};

const montyHall: Template = {
  id: "monty-hall",
  difficulty: "medium",
  topic: "Probability",
  make(rng) {
    const n = pick(rng, [3, 4, 5, 6, 8, 10]);
    const k = int(rng, 1, n - 2);
    const rest = n - 1 - k; // unopened doors other than yours
    const stay = 1 / n;
    const sw = (n - 1) / (n * rest);
    const play = (r: Rng, switchDoor: boolean) => {
      const car = Math.floor(r() * n);
      // You pick door 0. The host opens k goat doors among the others, at random.
      const goats = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((x) => x !== car);
      for (let i = goats.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [goats[i], goats[j]] = [goats[j], goats[i]];
      }
      const opened = new Set(goats.slice(0, k));
      const others = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((x) => !opened.has(x));
      const final = switchDoor ? others[Math.floor(r() * others.length)] : 0;
      return ind(final === car);
    };
    return {
      title: pick(rng, ["Let's Make a Deal", "Switch or Stay", "Door Number Two"]),
      category: "Probability",
      story: `A game show has ${n} doors: one hides a car, the rest hide goats. You pick a door. The host, who knows where the car is, opens ${k === 1 ? "one other door" : `${k} other doors`} that ${k === 1 ? "hides a goat" : "all hide goats"}. You may stay, or switch to ${rest === 1 ? "the one other closed door" : `one of the ${rest} other closed doors, chosen at random`}. Should you switch?`,
      steps: [
        step("What is the probability you win if you stay?", stay, frac(1, n), "The host's reveal tells you nothing new about your own door.", `Your door was right with probability \\(\\frac{1}{${n}}\\) and that doesn't change.`, {
          sim: (r) => play(r, false),
        }),
        step(
          `What is the probability you win if you switch${rest > 1 ? " (to a random closed door)" : ""}?`,
          sw,
          frac(n - 1, n * rest),
          `The other doors held the car with probability \\(\\frac{${n - 1}}{${n}}\\), and now that is spread over the ${rest} still closed.`,
          `\\(\\frac{${n - 1}}{${n}} \\cdot \\frac{1}{${rest}} = ${texFrac(n - 1, n * rest)}\\).`,
          { sim: (r) => play(r, true) },
        ),
        step(
          "How many times more likely are you to win by switching than by staying?",
          sw / stay,
          frac(n - 1, rest),
          "Divide step 2 by step 1.",
          `\\(\\frac{${n - 1}}{${rest}}${rest === n - 1 ? "" : ` = ${texFrac(n - 1, rest)}`}\\).`,
        ),
      ],
      solution: `Staying wins with \\(\\frac{1}{${n}}\\). The other ${n - 1} doors jointly held the car with \\(\\frac{${n - 1}}{${n}}\\); the host only opens goats, so that whole probability now sits on the ${rest} closed door${rest === 1 ? "" : "s"}, and switching wins with \\(${texFrac(n - 1, n * rest)}\\), ${num(sw / stay)} times better. Always switch.`,
    };
  },
};

const brokenStick: Template = {
  id: "broken-stick",
  difficulty: "hard",
  topic: "Probability",
  make(rng) {
    const n = pick(rng, [3, 3, 4, 5, 6]);
    const thing = pick(rng, ["stick", "strand of dry spaghetti", "metre rule"]);
    const shape = n === 3 ? "a triangle" : n === 4 ? "a quadrilateral" : n === 5 ? "a pentagon" : "a hexagon";
    const oneLong = 1 / 2 ** (n - 1);
    const pieces = (r: Rng) => {
      const cuts = Array.from({ length: n - 1 }, () => r()).sort((a, b) => a - b);
      return [...cuts, 1].map((c, i) => c - (i ? cuts[i - 1] : 0));
    };
    return {
      title: pick(rng, ["Snap Into Shape", "Broken Stick", "Pieces Fit"]),
      category: "Probability",
      story: `A ${thing} of length 1 is snapped at ${n - 1} points chosen independently and uniformly at random, giving ${n} pieces. What is the probability the pieces can be put together to form ${shape}?`,
      steps: [
        step(
          "Pieces form a polygon exactly when no piece is at least half the stick. What is the probability the leftmost piece is longer than \\(\\tfrac{1}{2}\\)?",
          oneLong,
          frac(1, 2 ** (n - 1)),
          "The leftmost piece is long exactly when every break point lands in the right half.",
          `All ${n - 1} points beyond \\(\\tfrac{1}{2}\\): \\(\\left(\\tfrac{1}{2}\\right)^{${n - 1}} = ${texFrac(1, 2 ** (n - 1))}\\).`,
          { sim: (r) => ind(pieces(r)[0] > 0.5) },
        ),
        step(
          "What is the probability that some piece is longer than \\(\\tfrac{1}{2}\\)?",
          n * oneLong,
          frac(n, 2 ** (n - 1)),
          "By symmetry every piece has the same chance, and two pieces can't both be over half.",
          `The events are disjoint, so \\(${n} \\cdot ${texFrac(1, 2 ** (n - 1))} = ${texFrac(n, 2 ** (n - 1))}\\).`,
          { sim: (r) => ind(pieces(r).some((x) => x > 0.5)) },
        ),
        step(
          `What is the probability the pieces form ${shape}?`,
          1 - n * oneLong,
          frac(2 ** (n - 1) - n, 2 ** (n - 1)),
          "Complement of step 2.",
          `\\(1 - ${texFrac(n, 2 ** (n - 1))} = ${texFrac(2 ** (n - 1) - n, 2 ** (n - 1))}\\).`,
          { sim: (r) => ind(pieces(r).every((x) => x < 0.5)) },
        ),
      ],
      solution: `A polygon needs every side shorter than the sum of the others, i.e. every piece under \\(\\tfrac{1}{2}\\). The ${n} spacings are exchangeable, each exceeds \\(\\tfrac{1}{2}\\) with probability \\(2^{-${n - 1}}\\), and at most one can, so \\(P = 1 - \\frac{${n}}{2^{${n - 1}}} = ${texFracApprox(2 ** (n - 1) - n, 2 ** (n - 1))}\\).`,
    };
  },
};

const buffon: Template = {
  id: "buffon",
  difficulty: "hard",
  topic: "Probability",
  make(rng) {
    const [l, d] = pick(rng, [
      [1, 2],
      [1, 3],
      [2, 3],
      [2, 5],
      [3, 4],
      [3, 5],
      [4, 5],
    ] as const);
    const scene = pick(rng, [
      { thing: "needle", where: "a floor of parallel floorboards", gap: "boards" },
      { thing: "matchstick", where: "a sheet of ruled paper", gap: "lines" },
      { thing: "chopstick", where: "a striped tablecloth", gap: "stripe edges" },
    ] as const);
    const unit = l === 1 ? "unit" : "units";
    const p = (2 * l) / (Math.PI * d);
    // Position of the centre relative to the nearest line, and the angle to the lines.
    const crosses = (r: Rng, theta: number) => r() * (d / 2) <= (l / 2) * Math.sin(theta);
    return {
      title: pick(rng, ["Buffon's Needle", "Crossing Lines", "Drop and Count"]),
      category: "Probability",
      story: `A ${scene.thing} of length ${l} ${unit} is dropped at random onto ${scene.where}, with ${scene.gap} ${d} units apart. What is the probability it crosses a line?`,
      steps: [
        step(
          "Suppose it happened to land perpendicular to the lines. What is the probability it crosses one?",
          l / d,
          frac(l, d),
          "Its centre is uniform between two lines; when does the needle reach a line?",
          `It crosses when its centre is within \\(${texFrac(l, 2)}\\) of a line: \\(\\frac{${l}}{${d}}\\) of the gap.`,
          { sim: (r) => ind(crosses(r, Math.PI / 2)) },
        ),
        step(
          "At a random angle \\(\\theta\\), the needle's reach across the lines is \\(${l}\\sin\\theta\\). What is the average of \\(\\sin\\theta\\) over a uniform angle in \\([0, \\pi]\\)? (4 decimals)",
          2 / Math.PI,
          num(2 / Math.PI),
          "\\(\\frac{1}{\\pi} \\int_0^\\pi \\sin\\theta \\, d\\theta\\).",
          "\\(\\frac{2}{\\pi} \\approx 0.6366\\).",
          { sim: (r) => Math.sin(Math.PI * r()) },
        ),
        step(
          "What is the probability it crosses a line? (4 decimals)",
          p,
          num(p),
          "Average step 1's logic over the angle: the effective length is shortened by step 2's factor.",
          `\\(\\frac{${l}}{${d}} \\cdot \\frac{2}{\\pi} = \\frac{${2 * l}}{${d}\\pi} \\approx ${num(p)}\\).`,
          { sim: (r) => ind(crosses(r, Math.PI * r())), trials: 60_000 },
        ),
      ],
      solution: `With centre distance \\(x \\sim U(0, ${texFrac(d, 2)})\\) and angle \\(\\theta \\sim U(0, \\pi)\\), it crosses when \\(x \\le ${texFrac(l, 2)}\\sin\\theta\\). Integrating: \\(P = \\frac{2l}{\\pi d} = \\frac{${2 * l}}{${d}\\pi} \\approx ${num(p)}\\). Turned around, dropping many needles is a (slow) way to estimate \\(\\pi\\).`,
    };
  },
};

const polya: Template = {
  id: "polya-urn",
  difficulty: "expert",
  topic: "Probability",
  make(rng) {
    const a = int(rng, 1, 3);
    const b = int(rng, 1, 3);
    const n = int(rng, 3, 5);
    const j = int(rng, 1, n - 1);
    const rising = (x: number, k: number) => Array.from({ length: k }, (_, i) => x + i).reduce((p, y) => p * y, 1);
    const top = rising(a, j) * rising(b, n - j);
    const bottom = rising(a + b, n);
    const draws = (r: Rng) => {
      let [red, blue] = [a, b];
      return Array.from({ length: n }, () => {
        const isRed = r() * (red + blue) < red;
        if (isRed) red++;
        else blue++;
        return isRed;
      });
    };
    const pl = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
    return {
      title: pick(rng, ["Pólya's Urn", "Rich Get Richer", "Self-Reinforcing"]),
      category: "Probability",
      story: `An urn holds ${pl(a, "red ball")} and ${pl(b, "blue ball")}. You draw a ball at random, then put it back along with one extra ball of the same colour. You do this ${n} times. What is the probability exactly ${j} of your ${n} draws are red?`,
      steps: [
        step(
          "What is the probability the second draw is red?",
          a / (a + b),
          frac(a, a + b),
          "Condition on the first draw, then simplify. The answer may surprise you.",
          `\\(\\frac{${a}}{${a + b}} \\cdot \\frac{${a + 1}}{${a + b + 1}} + \\frac{${b}}{${a + b}} \\cdot \\frac{${a}}{${a + b + 1}} = ${texFrac(a, a + b)}\\): the same as the first draw.`,
          { sim: (r) => ind(draws(r)[1]) },
        ),
        step(
          `What is the probability the first ${j} draws are red and the remaining ${n - j} are blue, in that order?`,
          top / bottom,
          frac(top, bottom),
          "Multiply the conditional probabilities draw by draw; the urn grows by one each time.",
          `Numerators \\(${a}${j > 1 ? ` \\cdots ${a + j - 1}` : ""}\\) for red and \\(${b}${n - j > 1 ? ` \\cdots ${b + n - j - 1}` : ""}\\) for blue, over \\(${a + b} \\cdots ${a + b + n - 1}\\): \\(${texFrac(top, bottom)}\\).`,
          { sim: (r) => ind(draws(r).every((x, i) => x === i < j)) },
        ),
        step(
          `What is the probability exactly ${j} of the ${n} draws are red?`,
          (choose(n, j) * top) / bottom,
          frac(choose(n, j) * top, bottom),
          "Does the order of the colours change the product you found in step 2?",
          `Every order has the same probability (the numerators are just rearranged), so multiply by \\(\\binom{${n}}{${j}} = ${choose(n, j)}\\): \\(${texFrac(choose(n, j) * top, bottom)}\\).`,
          { sim: (r) => ind(draws(r).filter(Boolean).length === j) },
        ),
      ],
      solution: `Pólya's urn is exchangeable: any sequence with ${j} reds has probability \\(\\frac{a^{\\overline{${j}}}\\, b^{\\overline{${n - j}}}}{(a+b)^{\\overline{${n}}}} = ${texFrac(top, bottom)}\\) (rising factorials), whatever the order. So \\(P = \\binom{${n}}{${j}} \\cdot ${texFrac(top, bottom)} = ${texFracApprox(choose(n, j) * top, bottom)}\\).${a === 1 && b === 1 ? ` Starting from one of each, the number of reds is uniform on \\(0, \\ldots, ${n}\\).` : ""}`,
    };
  },
};

const penney: Template = {
  id: "penney",
  difficulty: "expert",
  topic: "Probability",
  make(rng) {
    const pat = () => Array.from({ length: 3 }, () => pick(rng, ["H", "T"])).join("");
    const A = pat();
    const flipSide = (c: string) => (c === "H" ? "T" : "H");
    let B = rng() < 0.7 ? flipSide(A[1]) + A[0] + A[1] : pat(); // usually Conway's best reply
    while (B === A) B = pat();
    // Conway's correlation: weight 2^(k-1) when the last k of x equal the first k of y.
    const corr = (x: string, y: string) => [1, 2, 3].reduce((s, k) => s + (x.slice(3 - k) === y.slice(0, k) ? 2 ** (k - 1) : 0), 0);
    const [AA, AB, BB, BA] = [corr(A, A), corr(A, B), corr(B, B), corr(B, A)];
    const num1 = BB - BA;
    const den = AA - AB + (BB - BA);
    const wait = (r: Rng, x: string) => {
      let s = "";
      while (!s.endsWith(x)) s += r() < 0.5 ? "H" : "T";
      return s.length;
    };
    const race = (r: Rng) => {
      let s = "";
      for (;;) {
        s += r() < 0.5 ? "H" : "T";
        if (s.endsWith(A)) return 1;
        if (s.endsWith(B)) return 0;
      }
    };
    return {
      title: pick(rng, ["Penney's Game", "Pattern Race", "Pick Second"]),
      category: "Probability",
      story: `You pick the pattern ${A} and your opponent picks ${B}. A fair coin is flipped until one of the two patterns appears as three consecutive flips; whoever's pattern comes first wins. What is your probability of winning?`,
      steps: [
        step(
          `On its own, how many flips does it take on average to see ${A}?`,
          2 * AA,
          `${2 * AA}`,
          `Overlap matters: ${A === "HHH" || A === "TTT" ? "every suffix of the pattern is also a prefix" : "check which endings of the pattern are also beginnings"}.`,
          `Add \\(2^k\\) for every \\(k\\) where the last \\(k\\) flips of ${A} equal its first \\(k\\): ${2 * AA}.`,
          { sim: (r) => wait(r, A) },
        ),
        step(
          `And on average to see ${B}?`,
          2 * BB,
          `${2 * BB}`,
          "Same method, for the other pattern.",
          `Overlaps of ${B} with itself give ${2 * BB}.`,
          { sim: (r) => wait(r, B) },
        ),
        step(
          `What is the probability ${A} appears before ${B}?`,
          num1 / den,
          frac(num1, den),
          `Set up states for the useful partial matches, or use Conway's formula: the odds for ${A} are \\((BB - BA) : (AA - AB)\\), where \\(XY\\) adds \\(2^{k-1}\\) when the last \\(k\\) of \\(X\\) match the first \\(k\\) of \\(Y\\).`,
          `\\(AA = ${AA}, AB = ${AB}, BB = ${BB}, BA = ${BA}\\), so \\(P = \\frac{${BB} - ${BA}}{(${AA} - ${AB}) + (${BB} - ${BA})} = ${texFrac(num1, den)}\\).`,
          { sim: race },
        ),
      ],
      solution: `Conway's leading numbers: \\(P(${A} \\text{ first}) = \\frac{BB - BA}{(AA - AB) + (BB - BA)} = ${texFracApprox(num1, den)}\\). ${2 * BB > 2 * AA && num1 / den < 0.5 ? `Even though ${B} takes longer on its own, it usually wins the race: it can only appear right after a near-miss for ${A}.` : num1 / den < 0.5 ? `${B} usually wins: whoever chooses second can always find a pattern that beats the first, so the game is non-transitive.` : "Here you're the favourite, but whoever picks second can always find a reply that beats any pattern: the game is non-transitive."}`,
    };
  },
};

export const PROBABILITY: Template[] = [diceSum, atLeastOne, cardsBoth, duel, birthday, montyHall, orderStats, brokenStick, buffon, uniformSum, polya, penney];
