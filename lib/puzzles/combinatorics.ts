/** Combinatorics puzzle templates, easiest first. */

import { pick, int, flip, NAMES, frac, texFrac, texFracApprox, num, choose, factorial, step, ind, type Rng, type Template } from "./kit";

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

export const COMBINATORICS: Template[] = [binomialHeads, derangement, ballot];
