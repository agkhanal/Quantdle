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

export const COMBINATORICS: Template[] = [binomialHeads, anagrams, latticePaths, derangement, ballot];
