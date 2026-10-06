/** Expected Value puzzle templates, easiest first. */

import { pick, int, die, flip, frac, texFrac, texFracApprox, num, choose, step, ind, shuffle, type Rng, type Template } from "./kit";

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

const records: Template = {
  id: "records",
  difficulty: "hard",
  topic: "Expected Value",
  make(rng) {
    const n = int(rng, 6, 30);
    const k = int(rng, 3, Math.min(n, 10));
    let H = 0;
    let V = 0;
    for (let i = 1; i <= n; i++) {
      H += 1 / i;
      V += (1 / i) * (1 - 1 / i);
    }
    const scene = pick(rng, [
      { story: `A city has ${n} years of rainfall data, all different and in random order. A year is a "record" if it was wetter than every year before it (the first year counts).`, unit: "year" },
      { story: `${n} acts perform at a talent show, one at a time, in a random order (no two get the same score). An act sets a "record" if it outscores every act before it (the first counts).`, unit: "act" },
      { story: `You're shown ${n} job offers one by one, in random order of salary (no ties). An offer is a "record" if it beats every earlier offer (the first counts).`, unit: "offer" },
    ]);
    const recs = (r: Rng) => {
      let best = -1;
      let c = 0;
      for (let i = 0; i < n; i++) {
        const x = r();
        if (x > best) {
          best = x;
          c++;
        }
      }
      return c;
    };
    const kth = (r: Rng) => {
      let best = -1;
      let rec = false;
      for (let i = 0; i < k; i++) {
        const x = r();
        rec = x > best;
        if (rec) best = x;
      }
      return rec;
    };
    return {
      title: pick(rng, ["Record Breakers", "New High", "Best So Far"]),
      category: "Expected Value",
      story: `${scene.story} How many records do you expect?`,
      steps: [
        step(`What is the probability the ${ordinal(k)} ${scene.unit} is a record?`, 1 / k, frac(1, k), `Among the first ${k}, each is equally likely to be the largest.`, `By symmetry, \\(\\frac{1}{${k}}\\).`, {
          sim: (r) => ind(kth(r)),
        }),
        step(
          "What is the expected number of records? (4 decimals)",
          H,
          num(H),
          "Add up an indicator for each position. Records aren't independent, but expectation doesn't care.",
          `\\(1 + \\frac{1}{2} + \\cdots + \\frac{1}{${n}} = H_{${n}} \\approx ${num(H)}\\).`,
          { sim: recs },
        ),
        step(
          "What is the variance of the number of records? (4 decimals)",
          V,
          num(V),
          "The record indicators turn out to be independent of each other. Variance of a sum of independent Bernoullis.",
          `\\(\\sum_{i=1}^{${n}} \\frac{1}{i}\\left(1 - \\frac{1}{i}\\right) \\approx ${num(V)}\\).`,
          { sim: (r) => (recs(r) - H) ** 2, trials: 60_000 },
        ),
      ],
      solution: `Position \\(i\\) is a record with probability \\(\\frac{1}{i}\\), so \\(\\mathbb{E} = H_{${n}} \\approx ${num(H)}\\), growing only like \\(\\ln n\\). Whether \\(i\\) is a record depends only on the relative order of the first \\(i\\), which is independent of how those \\(i\\) were ordered among themselves, so the indicators are independent and the variance is \\(\\sum \\frac{1}{i}(1 - \\frac{1}{i}) \\approx ${num(V)}\\).`,
    };
  },
};

const ordinal = (k: number) => `${k}${k % 10 === 1 && k !== 11 ? "st" : k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th"}`;

const allSixes: Template = {
  id: "all-sixes",
  difficulty: "hard",
  topic: "Expected Value",
  make(rng) {
    const s = pick(rng, [4, 6, 6, 8]);
    const n = int(rng, 2, 5);
    const t = int(rng, 2, 4);
    const q = (s - 1) / s;
    let E = 0;
    for (let k = 0; k < 2000; k++) E += 1 - (1 - q ** k) ** n;
    const rounds = (r: Rng) => {
      let left = n;
      let k = 0;
      while (left > 0) {
        k++;
        for (let i = left; i > 0; i--) if (die(r, s) === s) left--;
      }
      return k;
    };
    const face = s === 6 ? "a six" : s === 8 ? "an 8" : `a ${s}`;
    const kind = s === 6 ? "fair dice" : `fair ${s}-sided dice`;
    return {
      title: pick(rng, ["Keep the Sixes", "Yahtzee Chase", "Lock and Reroll"]),
      category: "Expected Value",
      story: `You roll ${n} ${kind}. Any die showing ${face} is set aside, and you reroll the rest, round after round, until every die shows ${face}. On average, how many rounds does it take (counting the first roll)?`,
      steps: [
        step(
          `What is the probability a particular die still hasn't shown ${face} after ${t} rounds? (4 decimals)`,
          q ** t,
          num(q ** t),
          "Each die is just rolled until it succeeds, independently of the others.",
          `\\(\\left(${texFrac(s - 1, s)}\\right)^{${t}} \\approx ${num(q ** t)}\\).`,
          { sim: (r) => ind(Array.from({ length: t }).every(() => die(r, s) !== s)) },
        ),
        step(
          `What is the probability you're done within ${t} rounds? (4 decimals)`,
          (1 - q ** t) ** n,
          num((1 - q ** t) ** n),
          "Every die has to have succeeded by then.",
          `\\(\\left(1 - ${num(q ** t)}\\right)^{${n}} \\approx ${num((1 - q ** t) ** n)}\\).`,
          { sim: (r) => ind(rounds(r) <= t) },
        ),
        step(
          "What is the expected number of rounds? (4 significant figures)",
          E,
          num(E),
          "The number of rounds is the maximum of the dice's waiting times. Use \\(\\mathbb{E}[T] = \\sum_{k \\ge 0} P(T > k)\\).",
          `\\(\\sum_{k \\ge 0} \\left[1 - \\left(1 - (${texFrac(s - 1, s)})^k\\right)^{${n}}\\right] \\approx ${num(E)}\\).`,
          { sim: rounds },
        ),
      ],
      solution: `Each die needs a geometric number of rounds (mean ${s}), and you finish at the maximum of ${n} of them. With \\(P(T \\le k) = (1 - (${texFrac(s - 1, s)})^k)^{${n}}\\), the tail-sum formula gives \\(\\mathbb{E}[T] \\approx ${num(E)}\\): much less than \\(${n} \\times ${s}\\), because the dice work in parallel.`,
    };
  },
};

const coverCycle: Template = {
  id: "cover-cycle",
  difficulty: "expert",
  topic: "Expected Value",
  make(rng) {
    const n = int(rng, 5, 12);
    const k = int(rng, 2, n - 2);
    const scene = pick(rng, [
      { place: `${n} lily pads arranged in a ring`, mover: "A frog", move: "hops to one of its two neighbouring pads" },
      { place: `${n} rooms arranged in a circle, each with doors to its two neighbours`, mover: "A robot vacuum", move: "rolls through a random door into a neighbouring room" },
      { place: `${n} stalls around a circular market`, mover: "A shopper", move: "wanders to one of the two neighbouring stalls" },
    ]);
    const exitTime = (r: Rng) => {
      // Visited arc is 1..k and you stand at its end 1; unvisited at 0 and k + 1.
      let x = 1;
      let t = 0;
      while (x > 0 && x < k + 1) {
        x += r() < 0.5 ? 1 : -1;
        t++;
      }
      return t;
    };
    const cover = (r: Rng) => {
      const seen = new Set([0]);
      let x = 0;
      let t = 0;
      let last = 0;
      while (seen.size < n) {
        x = (x + (r() < 0.5 ? 1 : n - 1)) % n;
        t++;
        if (!seen.has(x)) {
          seen.add(x);
          last = x;
        }
      }
      return { t, last };
    };
    return {
      title: pick(rng, ["Round the Ring", "Cover Time", "Last One Standing"]),
      category: "Expected Value",
      story: `There are ${scene.place}. ${scene.mover} starts at one of them and each step ${scene.move}, chosen at random. On average, how many steps until it has visited all ${n}? And which one is it likely to reach last?`,
      steps: [
        step(
          `The visited spots always form an unbroken arc, and a new one is found at one of its ends. Once exactly ${k} have been visited and the walker has just arrived at an end of the arc, how many more steps on average until a new one?`,
          k,
          `${k}`,
          `This is a walk on a line between two unvisited spots ${k + 1} apart, starting 1 from an edge. A fair walk from \\(i\\) between \\(0\\) and \\(m\\) exits after \\(i(m - i)\\) steps on average.`,
          `\\(1 \\cdot (${k + 1} - 1) = ${k}\\).`,
          { sim: exitTime },
        ),
        step(
          `What is the expected number of steps to visit all ${n}?`,
          (n * (n - 1)) / 2,
          `${(n * (n - 1)) / 2}`,
          `Add step 1's answer over each stage, from 1 visited up to ${n - 1} visited.`,
          `\\(1 + 2 + \\cdots + ${n - 1} = \\frac{${n} \\cdot ${n - 1}}{2} = ${(n * (n - 1)) / 2}\\).`,
          { sim: (r) => cover(r).t },
        ),
        step(
          "What is the probability the last one visited is the immediate neighbour of the start (say, clockwise)?",
          1 / (n - 1),
          frac(1, n - 1),
          "For a spot to be last, the walker must reach both of its neighbours first. Think about which neighbour is reached first, then a gambler's-ruin race around the rest of the ring.",
          `Every spot other than the start is equally likely to be last: \\(\\frac{1}{${n - 1}}\\), even the one right next door.`,
          { sim: (r) => ind(cover(r).last === 1) },
        ),
      ],
      solution: `The visited set is an arc; with \\(j\\) visited, finding a new spot is a gambler's-ruin exit from an interval of length \\(j + 1\\) starting next to an edge, taking \\(j\\) steps on average. So the cover time is \\(\\sum_{j=1}^{${n - 1}} j = ${(n * (n - 1)) / 2}\\). Surprisingly, every other spot is last with the same probability \\(\\frac{1}{${n - 1}}\\).`,
    };
  },
};

const hypercubeWalk: Template = {
  id: "hypercube-walk",
  difficulty: "expert",
  topic: "Expected Value",
  make(rng) {
    const d = int(rng, 3, 6);
    // T[i] = expected seconds to go from i switches on to i + 1 on.
    const T: number[] = [];
    for (let i = 0; i < d; i++) T.push(i === 0 ? 1 : (d + i * T[i - 1]) / (d - i));
    const E = T.reduce((a, b) => a + b, 0);
    const walk = (r: Rng, stop: (on: number, t: number) => boolean, start = 0) => {
      let on = start;
      let t = 0;
      do {
        on += r() * d < on ? -1 : 1; // a random switch: it's on with probability on/d
        t++;
      } while (!stop(on, t));
      return t;
    };
    const what = pick(rng, [
      [`${d} light switches`, "a switch", "all on"],
      [`${d} coins on a table, all tails up`, "a coin", "all heads"],
    ] as const);
    const coins = what[0].includes("coins");
    return {
      title: pick(rng, ["Flip Them All", "Random Toggles", "Corner to Corner"]),
      category: "Expected Value",
      story: `There are ${what[0]}${coins ? "" : ", all off"}. Every second, someone picks ${what[1]} uniformly at random and ${coins ? "turns it over" : "toggles it"}. On average, how long until they're ${what[2]}? (This is a random walk on the corners of a ${d}-dimensional cube, from one corner to the opposite one.)`,
      steps: [
        step(
          `With exactly 1 ${coins ? "head" : "switch on"}, what is the expected time until there are 2?`,
          T[1],
          frac(d + 1, d - 1),
          `Let \\(T_i\\) be the time to go from \\(i\\) to \\(i + 1\\). From \\(i\\), you step down with probability \\(\\frac{i}{d}\\) and then need \\(T_{i-1} + T_i\\) more.`,
          `\\(T_1 = 1 + \\frac{1}{${d}}(T_0 + T_1)\\) with \\(T_0 = 1\\), so \\(T_1 = ${texFrac(d + 1, d - 1)}\\).`,
          { sim: (r) => walk(r, (on) => on === 2, 1) },
        ),
        step(
          `What is the expected time until all ${d} are ${coins ? "heads" : "on"}? (4 significant figures)`,
          E,
          num(E),
          `Use \\(T_i = \\frac{${d} + i \\, T_{i-1}}{${d} - i}\\) for each stage and add them up.`,
          `\\(${T.map((x) => num(x)).join(" + ")} \\approx ${num(E)}\\).`,
          { sim: (r) => walk(r, (on) => on === d) },
        ),
        step(
          `Starting from all ${coins ? "tails" : "off"}, what is the expected time until it's all ${coins ? "tails" : "off"} again for the first time?`,
          2 ** d,
          `${2 ** d}`,
          "The walk spends equal time at every corner in the long run. Expected return time is 1 over the long-run fraction of time spent there.",
          `Each of the \\(2^{${d}}\\) corners is equally likely in the long run, so the return time is \\(2^{${d}} = ${2 ** d}\\).`,
          { sim: (r) => walk(r, (on) => on === 0), trials: 40_000 },
        ),
      ],
      solution: `Only the number switched on matters, a birth-death chain. Stage times satisfy \\(T_i = \\frac{${d} + i T_{i-1}}{${d} - i}\\), giving \\(\\approx ${num(E)}\\) seconds to reach the far corner. The stationary distribution is uniform over the \\(2^{${d}}\\) corners, so by Kac's lemma the walk returns to its start after \\(2^{${d}}\\) steps on average.`,
    };
  },
};

const firstAce: Template = {
  id: "first-ace",
  difficulty: "expert",
  topic: "Expected Value",
  make(rng) {
    const s = pick(rng, [
      { N: 52, a: 4, deck: "a well-shuffled 52-card deck", special: "ace", specials: "aces" },
      { N: 52, a: 12, deck: "a well-shuffled 52-card deck", special: "face card (J, Q, K)", specials: "face cards" },
      { N: 52, a: 13, deck: "a well-shuffled 52-card deck", special: "heart", specials: "hearts" },
      { N: 30, a: 5, deck: "a shuffled box of 30 bulbs", special: "dud bulb", specials: "duds" },
      { N: 40, a: 3, deck: "a shuffled stack of 40 scratch cards", special: "winning card", specials: "winners" },
    ]);
    const { N, a } = s;
    // Items 0..a-1 are the specials; item a is one particular ordinary item.
    const deal = (r: Rng) => {
      const xs = shuffle(r, Array.from({ length: N }, (_, i) => i));
      const first = xs.findIndex((x) => x < a);
      return { first: first + 1, last: xs.findLastIndex((x) => x < a) + 1, beforeAll: xs.indexOf(a) < first };
    };
    return {
      title: pick(rng, ["First Ace", "Turn Them Over", "How Deep"]),
      category: "Expected Value",
      story: `You turn over ${s.deck} one item at a time. There are ${a} ${s.specials} among the ${N}. On average, at which position does the first ${s.special} appear? And the last?`,
      steps: [
        step(
          `What is the probability that one particular non-${s.special} comes before all ${a} ${s.specials}?`,
          1 / (a + 1),
          frac(1, a + 1),
          `Look only at that item and the ${a} ${s.specials}: their relative order is uniformly random.`,
          `It must be first among ${a + 1} items: \\(\\frac{1}{${a + 1}}\\).`,
          { sim: (r) => ind(deal(r).beforeAll) },
        ),
        step(
          `What is the expected position of the first ${s.special}?`,
          (N + 1) / (a + 1),
          frac(N + 1, a + 1),
          `Position = 1 + the number of non-${s.specials} before it. Use step 1 and linearity.`,
          `\\(1 + \\frac{${N - a}}{${a + 1}} = ${texFrac(N + 1, a + 1)}\\).`,
          { sim: (r) => deal(r).first },
        ),
        step(
          `What is the expected position of the last ${s.special}?`,
          (a * (N + 1)) / (a + 1),
          frac(a * (N + 1), a + 1),
          "By symmetry, the gap after the last special is the same size on average as the gap before the first.",
          `\\(${N} - \\frac{${N - a}}{${a + 1}} = ${texFrac(a * (N + 1), a + 1)}\\).`,
          { sim: (r) => deal(r).last },
        ),
      ],
      solution: `The ${a} ${s.specials} split the other ${N - a} items into ${a + 1} gaps that are equal in expectation, \\(\\frac{${N - a}}{${a + 1}}\\) each. So the first ${s.special} is expected at \\(${texFracApprox(N + 1, a + 1)}\\) and the last at \\(${texFracApprox(a * (N + 1), a + 1)}\\).`,
    };
  },
};

export const EXPECTED_VALUE: Template[] = [reroll, geomWait, adjacentPairs, patterns, distinctFaces, coupon, optimalStopping, records, allSixes, coverCycle, hypercubeWalk, firstAce];
