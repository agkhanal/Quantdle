/** Markets puzzle templates, easiest first. */

import { pick, int, die, flip, frac, texFrac, texFracApprox, num, choose, step, ind, type Rng, type Template } from "./kit";

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

const fairOdds: Template = {
  id: "fair-odds",
  difficulty: "easy",
  topic: "Markets",
  make(rng) {
    const ev = pick(rng, [
      { what: "a fair die shows a 6", n: 1, d: 6, sim: (r: Rng) => die(r, 6) === 6 },
      { what: "two fair coins both land heads", n: 1, d: 4, sim: (r: Rng) => r() < 0.5 && r() < 0.5 },
      { what: "two fair dice sum to 7", n: 1, d: 6, sim: (r: Rng) => die(r, 6) + die(r, 6) === 7 },
      { what: "a fair die shows 5 or 6", n: 1, d: 3, sim: (r: Rng) => die(r, 6) >= 5 },
      { what: "a card drawn from a deck is a face card (J, Q, K)", n: 3, d: 13, sim: (r: Rng) => die(r, 13) > 10 },
    ]);
    const p = ev.n / ev.d;
    const fair = (ev.d - ev.n) / ev.n;
    const b = pick(rng, [Math.floor(fair) - 1, Math.floor(fair), Math.ceil(fair) + 1].filter((x) => x >= 1 && x !== fair));
    const edge = p * b - (1 - p);
    const stake = pick(rng, [5, 10, 20]);
    const N = pick(rng, [50, 100, 200]);
    return {
      title: pick(rng, ["Fair Odds", "Take the Bet?", "Price the Payout"]),
      category: "Markets",
      story: `A friend offers you ${b}-to-1 that ${ev.what}: you win $${b} per $1 staked if it happens, and lose your $1 if it doesn't. Should you take it?`,
      steps: [
        step(
          "What is your expected profit per $1 staked?",
          edge,
          frac(ev.n * b - (ev.d - ev.n), ev.d),
          `\\(P(\\text{win}) = ${texFrac(ev.n, ev.d)}\\). Weigh the win and the loss.`,
          `\\(${texFrac(ev.n, ev.d)} \\cdot ${b} - ${texFrac(ev.d - ev.n, ev.d)} = ${texFrac(ev.n * b - (ev.d - ev.n), ev.d)}\\).`,
          { sim: (r) => (ev.sim(r) ? b : -1) },
        ),
        step(
          "At what odds (x-to-1) would the bet be exactly fair?",
          fair,
          frac(ev.d - ev.n, ev.n),
          "Fair odds are the ratio of losing chances to winning chances.",
          `\\(\\frac{1 - p}{p} = ${texFrac(ev.d - ev.n, ev.n)}\\).`,
        ),
        step(
          `If you made this bet ${N} times at $${stake} each, what is your expected total profit?`,
          N * stake * edge,
          frac(N * stake * (ev.n * b - (ev.d - ev.n)), ev.d),
          "Expectation scales with the number of bets and the stake.",
          `\\(${N} \\cdot ${stake} \\cdot ${texFrac(ev.n * b - (ev.d - ev.n), ev.d)} = ${texFrac(N * stake * (ev.n * b - (ev.d - ev.n)), ev.d)}\\).`,
          { sim: (r) => {
            let t = 0;
            for (let i = 0; i < N; i++) t += ev.sim(r) ? stake * b : -stake;
            return t;
          } },
        ),
      ],
      solution: `Fair odds are \\(${texFracApprox(ev.d - ev.n, ev.n)}\\)-to-1. At ${b}-to-1 you ${edge > 0 ? "get paid more than fair, so the bet has positive expectation" : "get paid less than fair, so decline"}: \\(${texFracApprox(ev.n * b - (ev.d - ev.n), ev.d)}\\) per $1.`,
    };
  },
};

const putCallParity: Template = {
  id: "put-call-parity",
  difficulty: "easy",
  topic: "Markets",
  make(rng) {
    const S = pick(rng, [40, 50, 80, 100, 120]);
    const K = S + pick(rng, [-10, -5, 0, 5, 10]);
    const C = Math.max(S - K, 0) + pick(rng, [1.5, 2, 2.5, 3, 4, 5.5]);
    const P = C - S + K;
    const x = K + pick(rng, [-15, -8, 6, 12]);
    const quote = P + pick(rng, [-1, -0.5, 0.5, 1, 1.5]);
    const name = pick(rng, ["XYZ", "ACME", "Globex", "Initech"]);
    const usd = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
    return {
      title: pick(rng, ["Put-Call Parity", "Synthetic Stock", "Parity Check"]),
      category: "Markets",
      story: `${name} trades at $${S}. A European call with strike $${K} costs ${usd(C)}. Interest rates are zero and there are no dividends. What should the matching put (same strike and expiry) cost, and what if it's mispriced?`,
      steps: [
        step(
          `At expiry, if ${name} is at $${x}, what is the payoff of owning the call and selling the put?`,
          x - K,
          `${x - K}`,
          `Call pays \\(\\max(S_T - K, 0)\\), a short put pays \\(-\\max(K - S_T, 0)\\).`,
          `\\(\\max(${x} - ${K}, 0) - \\max(${K} - ${x}, 0) = ${x - K}\\): always \\(S_T - K\\).`,
        ),
        step(
          "What is the fair price of the put?",
          P,
          `${P}`,
          "Long call + short put pays exactly what (stock − $K cash) pays, so they cost the same today.",
          `\\(C - P = S - K \\Rightarrow P = ${C} - ${S} + ${K} = ${P}\\).`,
        ),
        step(
          `The put is actually quoted at ${usd(quote)}. What riskless profit per option can you lock in?`,
          Math.abs(quote - P),
          `${+Math.abs(quote - P).toFixed(2)}`,
          `${quote > P ? "Sell the expensive put and build it synthetically." : "Buy the cheap put and sell a synthetic one."}`,
          `${quote > P ? `Sell the put, buy the call, short the stock, hold $${K}` : `Buy the put, sell the call, buy the stock, borrow $${K}`}: lock in \\(|${quote} - ${P}| = ${+Math.abs(quote - P).toFixed(2)}\\).`,
        ),
      ],
      solution: `Long call and short put always pay \\(S_T - K\\), the same as holding the stock and owing $${K}. With zero rates, \\(C - P = S - K\\), so \\(P = ${P}\\). Any other price can be arbitraged by trading the put against its synthetic copy.`,
    };
  },
};

const bookmaker: Template = {
  id: "bookmaker",
  difficulty: "easy",
  topic: "Markets",
  make(rng) {
    const pTrue = pick(rng, [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7]);
    const margin = pick(rng, [0.04, 0.05, 0.06, 0.08, 0.1]);
    const o1 = Math.round(100 / (pTrue * (1 + margin))) / 100;
    const o2 = Math.round(100 / ((1 - pTrue) * (1 + margin))) / 100;
    const book = 1 / o1 + 1 / o2;
    const fairA = 1 / o1 / book;
    const ret = fairA * o1 - 1;
    const [A, B] = pick(rng, [
      ["the home team", "the away team"],
      ["the challenger", "the champion"],
      ["Yes", "No"],
    ] as const);
    return {
      title: pick(rng, ["Read the Odds", "The Overround", "Bookie's Edge"]),
      category: "Markets",
      story: `A bookmaker offers decimal odds of ${o1.toFixed(2)} on ${A} and ${o2.toFixed(2)} on ${B} (a $1 winning bet returns the odds, stake included). Exactly one will happen. What probabilities are baked in, and what's the bookmaker's cut?`,
      steps: [
        step(`What probability do the odds of ${o1.toFixed(2)} imply for ${A}? (4 decimals)`, 1 / o1, num(1 / o1), "Implied probability is 1 over the decimal odds.", `\\(\\frac{1}{${o1}} \\approx ${num(1 / o1)}\\).`),
        step(
          "What do the two implied probabilities add up to? (4 decimals)",
          book,
          num(book),
          "A fair book would total exactly 1. The excess is the margin.",
          `\\(\\frac{1}{${o1}} + \\frac{1}{${o2}} \\approx ${num(book)}\\), a margin of about ${num((book - 1) * 100)}%.`,
        ),
        step(
          `Scaling the implied probabilities to sum to 1, what is the fair probability of ${A}? (4 decimals)`,
          fairA,
          num(fairA),
          "Divide by the total from step 2.",
          `\\(${num(1 / o1)} / ${num(book)} \\approx ${num(fairA)}\\).`,
        ),
        step(
          `If that's the true probability, what is your expected profit per $1 bet on ${A}? (4 decimals)`,
          ret,
          num(ret),
          "Win: get the odds back (stake included). Lose: get nothing.",
          `\\(${num(fairA)} \\cdot ${o1} - 1 \\approx ${num(ret)}\\).`,
          { sim: (r) => (r() < fairA ? o1 - 1 : -1) },
        ),
      ],
      solution: `Implied probabilities \\(1/\\text{odds}\\) sum to ${num(book)}; the ${num((book - 1) * 100)}% overround is the bookmaker's margin. Normalizing gives ${num(fairA)} for ${A}, and a bettor loses about \\(1 - 1/${num(book)} \\approx ${num(-ret)}\\) per $1 on either side.`,
    };
  },
};

export const MARKETS: Template[] = [fairOdds, putCallParity, bookmaker, gamblersRuin, binomialTree, kelly];
