/** Expected Value puzzle templates, easiest first. */

import { pick, int, die, flip, frac, texFrac, texFracApprox, num, choose, step, ind, type Rng, type Template } from "./kit";

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

const geomWait: Template = {
  id: "geometric-wait",
  difficulty: "easy",
  topic: "Expected Value",
  make(rng) {
    const s = pick(rng, [6, 8, 10, 12, 20]);
    const m = int(rng, 1, Math.floor(s / 2));
    const t = int(rng, 2, 5);
    const what = m === 1 ? `a ${s}` : `${s - m + 1} or higher`;
    const p = m / s;
    const wait = (r: Rng) => {
      let n = 1;
      while (die(r, s) <= s - m) n++;
      return n;
    };
    return {
      title: pick(rng, ["Waiting Game", "Until It Lands", "Patience"]),
      category: "Expected Value",
      story: `You roll a fair ${s}-sided die until you get ${what}. On average, how many rolls does it take? And if the first ${t} rolls all miss, how long should you expect to keep going?`,
      steps: [
        step("What is the expected number of rolls, counting the successful one?", 1 / p, frac(s, m), `Each roll succeeds with probability \\(${texFrac(m, s)}\\). A geometric wait averages \\(1/p\\).`, `\\(\\frac{1}{p} = ${texFrac(s, m)}\\).`, {
          sim: wait,
        }),
        step("What is the expected number of misses before the first success?", 1 / p - 1, frac(s - m, m), "Every roll except the last one is a miss.", `\\(${texFrac(s, m)} - 1 = ${texFrac(s - m, m)}\\).`, {
          sim: (r) => wait(r) - 1,
        }),
        step(
          `Given the first ${t} rolls all missed, what is the expected total number of rolls?`,
          t + 1 / p,
          frac(t * m + s, m),
          "The die has no memory of the misses.",
          `Memoryless: \\(${t} + ${texFrac(s, m)} = ${texFrac(t * m + s, m)}\\).`,
          { sim: (r) => {
            const n = wait(r);
            return n > t ? n : NaN;
          } },
        ),
      ],
      solution: `A geometric wait with success probability \\(${texFrac(m, s)}\\) averages \\(${texFrac(s, m)}\\) rolls. Because the die is memoryless, ${t} misses don't make a hit "due": you still expect \\(${texFrac(s, m)}\\) more, for \\(${texFracApprox(t * m + s, m)}\\) in total.`,
    };
  },
};

const adjacentPairs: Template = {
  id: "adjacent-pairs",
  difficulty: "easy",
  topic: "Expected Value",
  make(rng) {
    const s = pick(rng, [4, 6, 8, 10, 12]);
    const n = int(rng, 4, 12);
    const roll = (r: Rng) => Array.from({ length: n }, () => die(r, s));
    const scene = pick(rng, [
      `${n} fair ${s}-sided dice are rolled and lined up in a row.`,
      `${n} people stand in a line and each rolls a fair ${s}-sided die.`,
      `${n} players sit in a row and each rolls a fair ${s}-sided die.`,
    ]);
    return {
      title: pick(rng, ["Matching Neighbours", "Side by Side", "Same as Next"]),
      category: "Expected Value",
      story: `${scene} How many neighbouring pairs do you expect to show the same number? And how many matching pairs overall?`,
      steps: [
        step("What is the probability that two particular dice match?", 1 / s, frac(1, s), "Whatever the first shows, the second has to equal it.", `\\(\\frac{1}{${s}}\\).`, {
          sim: (r) => ind(die(r, s) === die(r, s)),
        }),
        step(
          "What is the expected number of neighbouring pairs that match?",
          (n - 1) / s,
          frac(n - 1, s),
          "Linearity of expectation: add up an indicator for each neighbouring pair, even though they're not independent.",
          `There are ${n - 1} neighbouring pairs: \\(\\frac{${n - 1}}{${s}}${(n - 1) % s ? "" : ` = ${(n - 1) / s}`}\\).`,
          { sim: (r) => {
            const xs = roll(r);
            return xs.slice(1).filter((x, i) => x === xs[i]).length;
          } },
        ),
        step(
          "What is the expected number of matching pairs among all pairs, neighbours or not?",
          choose(n, 2) / s,
          frac(choose(n, 2), s),
          "Same idea over every pair.",
          `\\(\\binom{${n}}{2} \\cdot \\frac{1}{${s}} = ${texFrac(choose(n, 2), s)}\\).`,
          { sim: (r) => {
            const xs = roll(r);
            let c = 0;
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c += ind(xs[i] === xs[j]);
            return c;
          } },
        ),
      ],
      solution: `Write the count as a sum of indicators, one per pair, each with expectation \\(\\frac{1}{${s}}\\). Linearity doesn't care that the pairs overlap: ${n - 1} neighbouring pairs give \\(${texFracApprox(n - 1, s)}\\), and all \\(\\binom{${n}}{2}\\) pairs give \\(${texFracApprox(choose(n, 2), s)}\\).`,
    };
  },
};

export const EXPECTED_VALUE: Template[] = [reroll, geomWait, adjacentPairs, patterns, distinctFaces, coupon, optimalStopping];
