/** Combinatorics puzzle templates, easiest first. */

import { pick, int, flip, NAMES, frac, texFrac, texFracApprox, num, choose, factorial, step, ind, shuffle, cap, type Rng, type Template } from "./kit";

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

const anagrams: Template = {
  id: "anagrams",
  difficulty: "easy",
  topic: "Combinatorics",
  make(rng) {
    const word = pick(rng, ["LETTER", "BANANA", "COFFEE", "PEPPER", "STATS", "ASSESS", "SUCCESS", "BALLOON", "TATTOO", "COOKBOOK", "BOOKKEEPER", "MISSISSIPPI"]);
    const n = word.length;
    const counts = new Map<string, number>();
    for (const c of word) counts.set(c, (counts.get(c) ?? 0) + 1);
    const [glue, c] = [...counts.entries()].reduce((best, e) => (e[1] > best[1] ? e : best));
    const denom = [...counts.values()].reduce((p, x) => p * factorial(x), 1);
    const distinct = factorial(n) / denom;
    const glued = factorial(n - c + 1) / (denom / factorial(c));
    const together = (r: Rng) => {
      const tiles = shuffle(r, [...word]);
      const at = tiles.flatMap((x, i) => (x === glue ? [i] : []));
      return at[at.length - 1] - at[0] === c - 1;
    };
    const reps = [...counts.entries()].filter(([, x]) => x > 1);
    return {
      title: pick(rng, ["Letter Shuffle", "Tile Rack", "Rearranged"]),
      category: "Combinatorics",
      story: `The ${n} letter tiles of ${word} are shuffled and laid out in a row. How many different strings can appear, and how likely is it that all ${c} ${glue}s end up next to each other?`,
      steps: [
        step(`If all ${n} tiles were different, how many orders would there be?`, factorial(n), `${factorial(n)}`, "Any of the tiles first, then any of the rest, ...", `\\(${n}! = ${factorial(n).toLocaleString("en-US")}\\).`),
        step(
          `How many different strings can the tiles spell?`,
          distinct,
          `${distinct}`,
          "Swapping two identical tiles gives the same string. Divide out those swaps.",
          `\\(\\frac{${n}!}{${reps.map(([, x]) => `${x}!`).join(" \\cdot ")}} = ${distinct.toLocaleString("en-US")}\\), dividing out the repeated ${reps.map(([l]) => l).join(", ")}.`,
        ),
        step(
          `What is the probability all ${c} ${glue}s are next to each other?`,
          glued / distinct,
          frac(glued, distinct),
          `Glue the ${glue}s into a single block and count strings of ${n - c + 1} items.`,
          `With the block there are ${glued.toLocaleString("en-US")} strings, out of ${distinct.toLocaleString("en-US")}: \\(${texFrac(glued, distinct)}\\).`,
          { sim: (r) => ind(together(r)) },
        ),
      ],
      solution: `Strings: \\(\\frac{${n}!}{\\prod (\\text{repeats})!} = ${distinct.toLocaleString("en-US")}\\). Gluing the ${c} ${glue}s into one block leaves ${n - c + 1} items and ${glued.toLocaleString("en-US")} strings, so \\(P = ${texFracApprox(glued, distinct)}\\). Every string is equally likely when the tiles are shuffled, so counting strings is enough.`,
    };
  },
};

const latticePaths: Template = {
  id: "lattice-paths",
  difficulty: "easy",
  topic: "Combinatorics",
  make(rng) {
    const a = int(rng, 3, 6);
    const b = int(rng, 2, 5);
    const x = int(rng, 1, a - 1);
    const y = int(rng, 1, b - 1);
    const total = choose(a + b, a);
    const via = choose(x + y, x) * choose(a - x + b - y, a - x);
    const name = pick(rng, NAMES);
    const spot = pick(rng, ["a coffee shop", "a newsstand", "a friend's flat", "a bakery"]);
    const passes = (r: Rng) => {
      const moves = shuffle(r, [...Array(a).fill(1), ...Array(b).fill(0)]);
      let [px, py] = [0, 0];
      for (const m of moves) {
        if (px === x && py === y) return true;
        if (m) px++;
        else py++;
      }
      return px === x && py === y;
    };
    return {
      title: pick(rng, ["City Blocks", "Shortest Routes", "Grid Walk"]),
      category: "Combinatorics",
      story: `${name}'s office is ${a} blocks east and ${b} blocks north of home, on a perfect grid. ${name} only ever walks east or north, and picks one of the shortest routes uniformly at random. ${cap(spot)} sits on the corner ${x} east and ${y} north of home. What is the chance the walk goes past it?`,
      steps: [
        step("How many shortest routes are there?", total, `${total}`, `A route is a string of ${a} E's and ${b} N's.`, `\\(\\binom{${a + b}}{${a}} = ${total}\\).`),
        step(
          `How many of them pass the corner (${x}, ${y})?`,
          via,
          `${via}`,
          "Count routes to the corner, then from the corner on, and multiply.",
          `\\(\\binom{${x + y}}{${x}} \\cdot \\binom{${a - x + b - y}}{${a - x}} = ${choose(x + y, x)} \\cdot ${choose(a - x + b - y, a - x)} = ${via}\\).`,
          { sim: (r) => ind(passes(r)) * total },
        ),
        step(`What is the probability the walk passes ${spot}?`, via / total, frac(via, total), "Divide.", `\\(\\frac{${via}}{${total}} = ${texFrac(via, total)}\\).`, {
          sim: (r) => ind(passes(r)),
        }),
      ],
      solution: `There are \\(\\binom{${a + b}}{${a}} = ${total}\\) shortest routes and \\(\\binom{${x + y}}{${x}}\\binom{${a + b - x - y}}{${a - x}} = ${via}\\) go through (${x}, ${y}), so \\(P = ${texFracApprox(via, total)}\\).`,
    };
  },
};

/** A dealt hand as ranks 0..12 and suits 0..3. */
function deal(r: Rng, n: number) {
  const deck = shuffle(r, Array.from({ length: 52 }, (_, i) => i));
  return deck.slice(0, n).map((c) => ({ rank: c % 13, suit: Math.floor(c / 13) }));
}

/** Sorted rank multiplicities of a hand, e.g. [3, 2] for a full house. */
function rankShape(hand: { rank: number }[]) {
  const m = new Map<number, number>();
  for (const c of hand) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  return [...m.values()].sort((a, b) => b - a).join("");
}

const pokerHand: Template = {
  id: "poker-hand",
  difficulty: "medium",
  topic: "Combinatorics",
  make(rng) {
    const total = choose(52, 5);
    const hand = pick(rng, [
      { name: "a full house", shape: "32", ways: 13 * 4 * 12 * 6, how: "\\(13 \\cdot \\binom{4}{3} \\cdot 12 \\cdot \\binom{4}{2}\\)", hint: "Pick the rank of the triple and its suits, then the rank of the pair and its suits." },
      { name: "two pair", shape: "221", ways: choose(13, 2) * 36 * 44, how: "\\(\\binom{13}{2} \\cdot \\binom{4}{2}^2 \\cdot 44\\)", hint: "Pick the two pair ranks together (order doesn't matter), their suits, then a fifth card of another rank." },
      { name: "three of a kind (and nothing better)", shape: "311", ways: 13 * 4 * choose(12, 2) * 16, how: "\\(13 \\cdot \\binom{4}{3} \\cdot \\binom{12}{2} \\cdot 4^2\\)", hint: "Pick the triple, then two different other ranks, each in any suit." },
      { name: "four of a kind", shape: "41", ways: 13 * 48, how: "\\(13 \\cdot 48\\)", hint: "Pick the rank of the four, then any one of the other cards." },
      { name: "exactly one pair (and nothing better)", shape: "2111", ways: 13 * 6 * choose(12, 3) * 64, how: "\\(13 \\cdot \\binom{4}{2} \\cdot \\binom{12}{3} \\cdot 4^3\\)", hint: "Pick the pair, then three different other ranks, each in any suit." },
    ] as const);
    const p = hand.ways / total;
    return {
      title: pick(rng, ["Read the Hand", "Five Card Draw", "Deal Me In"]),
      category: "Combinatorics",
      story: `You're dealt 5 cards from a well-shuffled 52-card deck. What is the probability you're holding ${hand.name}?`,
      steps: [
        step("How many different 5-card hands are there?", total, `${total}`, "Order doesn't matter.", `\\(\\binom{52}{5} = ${total.toLocaleString("en-US")}\\).`),
        step(`How many of those hands are ${hand.name}?`, hand.ways, `${hand.ways}`, hand.hint, `${hand.how} \\(= ${hand.ways.toLocaleString("en-US")}\\).`),
        step(`What is the probability of ${hand.name}? (4 significant figures)`, p, num(p), "Divide.", `\\(\\frac{${hand.ways.toLocaleString("en-US")}}{${total.toLocaleString("en-US")}} \\approx ${num(p)}\\).`, {
          sim: (r) => ind(rankShape(deal(r, 5)) === hand.shape),
          trials: 150_000,
        }),
      ],
      solution: `Count by building the hand rank by rank: ${hand.how} \\(= ${hand.ways.toLocaleString("en-US")}\\) hands, out of \\(\\binom{52}{5} = ${total.toLocaleString("en-US")}\\), so \\(P \\approx ${num(p)}\\). The classic trap is ordering ranks that play the same role (like the two pairs), which double counts.`,
    };
  },
};

const starsBars: Template = {
  id: "stars-and-bars",
  difficulty: "medium",
  topic: "Combinatorics",
  make(rng) {
    const k = int(rng, 3, 5);
    const n = int(rng, k + 3, 12);
    const m = int(rng, 2, Math.min(4, n - k + 1));
    const [thing, who] = pick(rng, [
      ["identical sweets", "children"],
      ["identical $1 coins", "charities"],
      ["identical tasks", "servers"],
    ] as const);
    const all = choose(n + k - 1, k - 1);
    const each = choose(n - 1, k - 1);
    const lead = choose(n - m, k - 1);
    // A uniformly random split: choose the k-1 bar positions among n+k-1 slots.
    const split = (r: Rng) => {
      const slots = shuffle(r, Array.from({ length: n + k - 1 }, (_, i) => i)).slice(0, k - 1).sort((a, b) => a - b);
      return [...slots, n + k - 1].map((s, i) => s - (i ? slots[i - 1] + 1 : 0));
    };
    return {
      title: pick(rng, ["Stars and Bars", "Share It Out", "Split the Pile"]),
      category: "Combinatorics",
      story: `${n} ${thing} are shared among ${k} ${who}. Only how many each one gets matters. How many ways are there to share them out, with and without everyone getting something?`,
      steps: [
        step(`How many ways are there if some ${who} may get nothing?`, all, `${all}`, `Line up ${n} stars and ${k - 1} bars; each arrangement is a split.`, `\\(\\binom{${n} + ${k - 1}}{${k - 1}} = ${all}\\).`),
        step(
          `How many ways if every one gets at least one?`,
          each,
          `${each}`,
          `Hand out one each first, or choose ${k - 1} of the ${n - 1} gaps between stars.`,
          `\\(\\binom{${n - 1}}{${k - 1}} = ${each}\\).`,
          { sim: (r) => ind(split(r).every((x) => x >= 1)) * all },
        ),
        step(
          `How many ways if every one gets at least one and the first gets at least ${m}?`,
          lead,
          `${lead}`,
          `Pre-assign the guaranteed amounts, then share the rest freely.`,
          `After giving out ${m} + ${k - 1} = ${m + k - 1}, share the remaining ${n - m - k + 1} freely: \\(\\binom{${n - m - k + 1} + ${k - 1}}{${k - 1}} = ${lead}\\).`,
          { sim: (r) => {
            const s = split(r);
            return ind(s[0] >= m && s.every((x) => x >= 1)) * all;
          } },
        ),
      ],
      solution: `Stars and bars: \\(\\binom{n + k - 1}{k - 1} = ${all}\\) splits in all, \\(\\binom{n - 1}{k - 1} = ${each}\\) with nobody left out, and pre-assigning minimums reduces any lower-bound question to the free case: ${lead}.`,
    };
  },
};

const voidSuit: Template = {
  id: "void-suit",
  difficulty: "medium",
  topic: "Combinatorics",
  make(rng) {
    const h = int(rng, 4, 10);
    const total = choose(52, h);
    const one = choose(39, h) / total;
    const two = choose(26, h) / total;
    const three = choose(13, h) / total;
    const any = 4 * one - 6 * two + 4 * three;
    const suits = (r: Rng) => new Set(deal(r, h).map((c) => c.suit));
    return {
      title: pick(rng, ["Missing Suit", "All Four Suits", "Void"]),
      category: "Combinatorics",
      story: `You're dealt ${h} cards from a well-shuffled 52-card deck. What is the probability your hand is missing at least one suit?`,
      steps: [
        step("What is the probability you have no spades? (4 decimals)", one, num(one), `All ${h} cards come from the 39 non-spades.`, `\\(\\binom{39}{${h}} / \\binom{52}{${h}} \\approx ${num(one)}\\).`, {
          sim: (r) => ind(!suits(r).has(0)),
        }),
        step("What is the probability you have no spades and no hearts? (4 significant figures)", two, num(two), "Now all cards come from 26.", `\\(\\binom{26}{${h}} / \\binom{52}{${h}} \\approx ${num(two)}\\).`, {
          sim: (r) => {
            const s = suits(r);
            return ind(!s.has(0) && !s.has(1));
          },
          trials: 120_000,
        }),
        step(
          "What is the probability at least one suit is missing? (4 decimals)",
          any,
          num(any),
          "Inclusion-exclusion over the 4 suits: add singles, subtract pairs, add triples.",
          `\\(4 \\cdot ${num(one)} - 6 \\cdot ${num(two)} + 4 \\cdot ${num(three)} \\approx ${num(any)}\\).`,
          { sim: (r) => ind(suits(r).size < 4) },
        ),
      ],
      solution: `Adding \\(4 \\cdot P(\\text{no spades})\\) double counts hands missing two suits, so inclusion-exclusion gives \\(4\\binom{39}{${h}} - 6\\binom{26}{${h}} + 4\\binom{13}{${h}}\\) over \\(\\binom{52}{${h}}\\), about ${num(any)}. So all four suits show up with probability about ${num(1 - any)}.`,
    };
  },
};

export const COMBINATORICS: Template[] = [binomialHeads, anagrams, latticePaths, pokerHand, starsBars, voidSuit, derangement, ballot];
