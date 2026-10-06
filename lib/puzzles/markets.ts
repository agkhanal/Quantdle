/** Markets puzzle templates, easiest first. */

import { pick, int, flip, frac, texFrac, num, choose, step, ind, type Rng, type Template } from "./kit";

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

export const MARKETS: Template[] = [gamblersRuin, binomialTree, kelly];
