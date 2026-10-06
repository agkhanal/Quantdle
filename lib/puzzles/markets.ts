/** Markets puzzle templates, easiest first. */

import { pick, int, die, flip, frac, texFrac, texFracApprox, num, choose, step, ind, cap, normal, type Rng, type Template } from "./kit";

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

const volatilityDrag: Template = {
  id: "volatility-drag",
  difficulty: "medium",
  topic: "Markets",
  make(rng) {
    const [up, down] = pick(rng, [
      [50, 40],
      [30, 25],
      [60, 50],
      [25, 20],
      [40, 35],
      [20, 20],
      [80, 50],
    ] as const);
    const n = 2 * int(rng, 2, 6);
    const [u, d] = [1 + up / 100, 1 - down / 100];
    const mean = ((u + d) / 2) ** n;
    const typical = (u * d) ** (n / 2);
    let above = 0;
    for (let k = 0; k <= n; k++) if (u ** k * d ** (n - k) > 1 + 1e-12) above += choose(n, k);
    const path = (r: Rng) => {
      let x = 1;
      for (let i = 0; i < n; i++) x *= r() < 0.5 ? u : d;
      return x;
    };
    const what = pick(rng, ["A volatile stock", "A crypto token", "A leveraged fund"]);
    return {
      title: pick(rng, ["Volatility Drag", "Average vs Typical", "Up Then Down"]),
      category: "Markets",
      story: `${what} either rises ${up}% or falls ${down}% each year, with equal probability, independently. You hold it for ${n} years. How much do you expect to have per $1, and how much do you typically end up with?`,
      steps: [
        step(
          `What is the expected value of $1 after ${n} years? (4 decimals)`,
          mean,
          num(mean),
          "Expected one-year growth factor, compounded over independent years.",
          `\\(\\left(\\frac{${u} + ${d}}{2}\\right)^{${n}} = ${num((u + d) / 2)}^{${n}} \\approx ${num(mean)}\\).`,
          { sim: path, trials: 100_000 },
        ),
        step(
          `What is $1 worth after exactly ${n / 2} up years and ${n / 2} down years? (4 decimals)`,
          typical,
          num(typical),
          "Order doesn't matter; multiply the factors.",
          `\\((${u} \\cdot ${d})^{${n / 2}} = ${num(u * d)}^{${n / 2}} \\approx ${num(typical)}\\).`,
        ),
        step(
          "What is the probability you end with more than you started? (4 decimals)",
          above / 2 ** n,
          frac(above, 2 ** n),
          `Find the fewest up years \\(k\\) with \\(${u}^k \\cdot ${d}^{${n} - k} > 1\\), then add binomial probabilities.`,
          `${above} of the \\(2^{${n}}\\) equally likely paths end above $1: \\(${texFrac(above, 2 ** n)}\\).`,
          { sim: (r) => ind(path(r) > 1 + 1e-12) },
        ),
      ],
      solution: `The mean grows like \\(${num((u + d) / 2)}^n\\), but the typical path grows like \\(\\sqrt{${num(u * d)}}^{\\,n}\\)${u * d < 1 ? ", which shrinks" : ""}: arithmetic and geometric averages differ. The mean is propped up by rare lucky paths, so most investors ${above / 2 ** n < 0.5 ? "lose money" : "do worse than the average"} (here \\(P(\\text{gain}) \\approx ${num(above / 2 ** n)}\\)). That gap is volatility drag.`,
    };
  },
};

const portfolio: Template = {
  id: "portfolio-risk",
  difficulty: "medium",
  topic: "Markets",
  make(rng) {
    const s1 = pick(rng, [10, 15, 20]);
    const s2 = pick(rng, [20, 25, 30, 40]);
    const rho = pick(rng, [-0.5, -0.2, 0, 0.3, 0.5]);
    const w = pick(rng, [0.5, 0.6, 0.7, 0.8]);
    const [a, b] = [s1 / 100, s2 / 100];
    const v = w * w * a * a + (1 - w) ** 2 * b * b + 2 * w * (1 - w) * rho * a * b;
    const wMin = (b * b - rho * a * b) / (a * a + b * b - 2 * rho * a * b);
    const ret = (r: Rng) => {
      const z1 = normal(r);
      const z2 = rho * z1 + Math.sqrt(1 - rho * rho) * normal(r);
      return w * a * z1 + (1 - w) * b * z2;
    };
    const [A, B] = pick(rng, [
      ["a bond fund", "a stock index"],
      ["gold", "tech stocks"],
      ["a utilities ETF", "an emerging-markets ETF"],
    ] as const);
    return {
      title: pick(rng, ["Diversify", "Two-Asset Portfolio", "Minimum Variance"]),
      category: "Markets",
      story: `${cap(A)} has annual volatility ${s1}% and ${B} ${s2}%, with correlation ${rho}. You put ${Math.round(w * 100)}% in ${A} and the rest in ${B}. How risky is the mix, and what mix is least risky?`,
      steps: [
        step(
          "What is the portfolio's annual variance? (as a decimal, 4 significant figures)",
          v,
          num(v),
          "\\(w^2\\sigma_1^2 + (1 - w)^2\\sigma_2^2 + 2w(1 - w)\\rho\\sigma_1\\sigma_2\\).",
          `\\(${w}^2 \\cdot ${a}^2 + ${num(1 - w)}^2 \\cdot ${b}^2 + 2 \\cdot ${w} \\cdot ${num(1 - w)} \\cdot (${rho}) \\cdot ${a} \\cdot ${b} \\approx ${num(v)}\\).`,
          { sim: (r) => ret(r) ** 2, trials: 60_000 },
        ),
        step("What is its volatility, in percent? (2 decimals)", 100 * Math.sqrt(v), num(100 * Math.sqrt(v)), "Square root of the variance.", `\\(\\sqrt{${num(v)}} \\approx ${num(100 * Math.sqrt(v))}\\%\\).`),
        step(
          `What weight in ${A} gives the lowest possible variance? (4 decimals)`,
          wMin,
          num(wMin),
          "Differentiate the variance in \\(w\\) and set it to zero.",
          `\\(w^* = \\frac{\\sigma_2^2 - \\rho\\sigma_1\\sigma_2}{\\sigma_1^2 + \\sigma_2^2 - 2\\rho\\sigma_1\\sigma_2} \\approx ${num(wMin)}\\).`,
        ),
      ],
      solution: `Portfolio variance is \\(${num(v)}\\), so volatility \\(\\approx ${num(100 * Math.sqrt(v))}\\%\\)${100 * Math.sqrt(v) < w * s1 + (1 - w) * s2 - 0.01 ? `, below the weighted average of ${num(w * s1 + (1 - w) * s2)}% because the assets aren't perfectly correlated` : ""}. The minimum-variance mix holds ${num(wMin * 100)}% in ${A}.`,
    };
  },
};

const dieOptions: Template = {
  id: "die-options",
  difficulty: "medium",
  topic: "Markets",
  make(rng) {
    const two = rng() < 0.5;
    const s = two ? 6 : pick(rng, [6, 10, 12, 20]);
    const outcomes: number[] = two ? Array.from({ length: 36 }, (_, i) => (i % 6) + 1 + Math.floor(i / 6) + 1) : Array.from({ length: s }, (_, i) => i + 1);
    const mean = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
    const K = two ? int(rng, 5, 9) : int(rng, 2, s - 1) + pick(rng, [0, 0.5]);
    const avg = (f: (x: number) => number) => outcomes.reduce((a, x) => a + f(x), 0) / outcomes.length;
    const call = avg((x) => Math.max(x - K, 0));
    const put = avg((x) => Math.max(K - x, 0));
    const draw = (r: Rng) => (two ? die(r, 6) + die(r, 6) : die(r, s));
    const under = two ? "the sum of two fair dice" : `one roll of a fair ${s}-sided die`;
    return {
      title: pick(rng, ["Options on a Die", "Dice Derivatives", "Strike It"]),
      category: "Markets",
      story: `A contract settles at ${under}. A call struck at ${K} pays \\(\\max(X - ${K}, 0)\\) and a put struck at ${K} pays \\(\\max(${K} - X, 0)\\). What are they worth (no discounting)?`,
      steps: [
        step("What is the fair price of the call? (4 decimals)", call, num(call), `Average the payoff over the ${outcomes.length} equally likely outcomes.`, `\\(\\mathbb{E}[\\max(X - ${K}, 0)] \\approx ${num(call)}\\).`, {
          sim: (r) => Math.max(draw(r) - K, 0),
        }),
        step("What is the fair price of the put? (4 decimals)", put, num(put), "Same, for outcomes below the strike.", `\\(\\mathbb{E}[\\max(${K} - X, 0)] \\approx ${num(put)}\\).`, {
          sim: (r) => Math.max(K - draw(r), 0),
        }),
        step(
          "What is call minus put?",
          call - put,
          num(call - put),
          "Long call + short put pays \\(X - K\\) whatever happens.",
          `\\(\\mathbb{E}[X] - K = ${num(mean)} - ${K} = ${num(call - put)}\\): put-call parity.`,
        ),
      ],
      solution: `Call \\(\\approx ${num(call)}\\), put \\(\\approx ${num(put)}\\). Their difference is \\(\\mathbb{E}[X] - K = ${num(call - put)}\\) because \\(\\max(X - K, 0) - \\max(K - X, 0) = X - K\\) for every outcome: parity holds for any distribution, dice included.`,
    };
  },
};

const doubling: Template = {
  id: "doubling",
  difficulty: "hard",
  topic: "Markets",
  make(rng) {
    const n = int(rng, 4, 8);
    const game = pick(rng, [
      { p: 1 / 2, pDisp: "1/2", what: "a fair coin flip" },
      { p: 18 / 38, pDisp: "18/38", what: "red on an American roulette wheel (18 of 38 pockets)" },
      { p: 18 / 37, pDisp: "18/37", what: "red on a European roulette wheel (18 of 37 pockets)" },
    ]);
    const q = 1 - game.p;
    const bust = q ** n;
    const loss = 2 ** n - 1;
    const raw = (1 - bust) * 1 - bust * loss;
    const ev = Math.abs(raw) < 1e-12 ? 0 : raw; // exactly 0 for a fair coin (the answer check is relative)
    const session = (r: Rng) => {
      for (let i = 0; i < n; i++) if (r() < game.p) return 1;
      return -loss;
    };
    return {
      title: pick(rng, ["Double Down", "The Martingale", "Can't Lose?"]),
      category: "Markets",
      story: `You bet on ${game.what}, which pays even money. You start with $1 and double your bet after every loss, stopping at the first win. Your bankroll of $${loss} covers ${n} bets ($1 + $2 + ... + $${2 ** (n - 1)}). If you lose all ${n}, you're broke. Is this a sure thing?`,
      steps: [
        step(
          "If you win on some bet before running out, what is your total profit?",
          1,
          "1",
          "Add up the earlier losses and the final win.",
          `Losses \\(1 + 2 + \\cdots + 2^{k-1} = 2^k - 1\\), then a win of \\(2^k\\): profit $1.`,
        ),
        step(
          `What is the probability you lose all ${n} bets? (4 significant figures)`,
          bust,
          num(bust),
          "Consecutive independent losses.",
          `\\((1 - ${game.pDisp})^{${n}} \\approx ${num(bust)}\\).`,
          { sim: (r) => ind(session(r) < 0), trials: 100_000 },
        ),
        step(
          "What is the expected profit of one session? (4 decimals)",
          ev,
          num(ev),
          `Win $1 with probability \\(1 - ${num(bust)}\\), lose $${loss} otherwise.`,
          `\\((1 - ${num(bust)}) \\cdot 1 - ${num(bust)} \\cdot ${loss} ${ev === 0 ? "=" : "\\approx"} ${num(ev)}\\).`,
          { sim: session, trials: 200_000 },
        ),
      ],
      solution: `The martingale wins $1 almost always but loses $${loss} with probability \\(${num(bust)}\\). ${game.p === 0.5 ? "With a fair coin these exactly cancel: expected profit 0. No betting system can turn fair bets into an edge (the optional stopping theorem)." : `With a house edge the expectation is negative, \\(\\approx ${num(ev)}\\) per session: the system just trades many small wins for a rare large loss, and can't beat the edge.`}`,
    };
  },
};

const winnersCurse: Template = {
  id: "winners-curse",
  difficulty: "hard",
  topic: "Markets",
  make(rng) {
    const M = pick(rng, [100, 200, 1000]);
    const k = pick(rng, [1.5, 1.8, 2.5, 3]);
    const b = Math.round((M * pick(rng, [0.4, 0.5, 0.6, 0.8])) / 10) * 10;
    const accept = b / M;
    const profit = accept * (k * (b / 2) - b);
    const best = k < 2 ? 0 : M;
    const value = (r: Rng) => r() * M;
    return {
      title: pick(rng, ["Winner's Curse", "Acquire the Firm", "Adverse Selection"]),
      category: "Markets",
      story: `You're bidding to buy a company. Its current owner knows its true value \\(V\\); to you it's uniform between $0 and $${M}M. In your hands it would be worth \\(${k}V\\). You make one take-it-or-leave-it offer \\(b\\), and the owner sells only if \\(b \\ge V\\). Suppose you offer $${b}M.`,
      steps: [
        step("What is the probability the owner accepts?", accept, num(accept), "They accept when the value is below your offer.", `\\(P(V \\le ${b}) = \\frac{${b}}{${M}} = ${num(accept)}\\).`, {
          sim: (r) => ind(value(r) <= b),
        }),
        step(
          "Given they accept, what is the expected value of the company to its owner (in $M)?",
          b / 2,
          num(b / 2),
          "Condition the uniform on \\(V \\le b\\).",
          `\\(V \\mid V \\le ${b}\\) is uniform on \\([0, ${b}]\\): mean ${num(b / 2)}.`,
          { sim: (r) => {
            const v = value(r);
            return v <= b ? v : NaN;
          } },
        ),
        step(
          "What is your expected profit from making this offer (in $M, counting zero when refused)?",
          profit,
          num(profit),
          "P(accept) × (your value of what you get − what you pay).",
          `\\(${num(accept)} \\cdot (${k} \\cdot ${num(b / 2)} - ${b}) = ${num(profit)}\\).`,
          { sim: (r) => {
            const v = value(r);
            return v <= b ? k * v - b : 0;
          } },
        ),
        step(
          `Which offer between $0M and $${M}M maximizes your expected profit?`,
          best,
          `${best}`,
          `Profit is \\(\\frac{b}{${M}}\\left(\\frac{${k}}{2} - 1\\right)b\\). What's its sign?`,
          k < 2
            ? `\\(\\frac{${k}}{2} - 1 < 0\\): every positive offer loses money on average, so offer 0.`
            : `\\(\\frac{${k}}{2} - 1 > 0\\): profit rises with \\(b\\), so offer the maximum, ${M}.`,
        ),
      ],
      solution: `An accepted offer tells you \\(V \\le b\\), so you only win the deals worth \\(\\frac{b}{2}\\) on average, worth \\(${k} \\cdot \\frac{b}{2}\\) to you. ${k < 2 ? `Since \\(${k} < 2\\) you always overpay: the best offer is nothing, even though the firm is worth ${k} times more to you than to the owner.` : `Since \\(${k} > 2\\) the synergy beats the adverse selection, and bidding the maximum is best.`} That's the winner's curse.`,
    };
  },
};

const glostenMilgrom: Template = {
  id: "glosten-milgrom",
  difficulty: "expert",
  topic: "Markets",
  make(rng) {
    const [L, H] = pick(rng, [
      [80, 120],
      [90, 110],
      [0, 100],
      [40, 60],
    ] as const);
    const pi = pick(rng, [0.3, 0.4, 0.5, 0.6]);
    const a = pick(rng, [0.1, 0.2, 0.25, 0.4, 0.5]);
    const half = (1 - a) / 2;
    const pBuy = pi * (a + half) + (1 - pi) * half;
    const pHbuy = (pi * (a + half)) / pBuy;
    const pHsell = (pi * half) / (pi * half + (1 - pi) * (a + half));
    const ask = L + (H - L) * pHbuy;
    const bid = L + (H - L) * pHsell;
    const trade = (r: Rng) => {
      const high = r() < pi;
      const informed = r() < a;
      const buy = informed ? high : r() < 0.5;
      return { v: high ? H : L, buy };
    };
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    return {
      title: pick(rng, ["Glosten–Milgrom", "Who's on the Other Side?", "The Informed Spread"]),
      category: "Markets",
      story: `A stock is worth either $${H} (probability ${pct(pi)}) or $${L}. You make markets in it. Each trader who arrives is informed with probability ${pct(a)}: informed traders buy if it's worth $${H} and sell if it's worth $${L}. Everyone else buys or sells with equal chance. Where should you quote so you break even against each kind of order?`,
      steps: [
        step(
          "What is the probability the next trader buys? (4 decimals)",
          pBuy,
          num(pBuy),
          `Condition on the value: \\(P(\\text{buy} \\mid ${H}) = ${a} + ${num(half)}\\), \\(P(\\text{buy} \\mid ${L}) = ${num(half)}\\).`,
          `\\(${pi} \\cdot ${num(a + half)} + ${num(1 - pi)} \\cdot ${num(half)} = ${num(pBuy)}\\).`,
          { sim: (r) => ind(trade(r).buy) },
        ),
        step(
          `Given the trader buys, what is the probability the stock is worth $${H}? (4 decimals)`,
          pHbuy,
          num(pHbuy),
          "Bayes: a buy is more likely to come from an informed trader in the high state.",
          `\\(\\frac{${pi} \\cdot ${num(a + half)}}{${num(pBuy)}} \\approx ${num(pHbuy)}\\).`,
          { sim: (r) => {
            const t = trade(r);
            return t.buy ? ind(t.v === H) : NaN;
          } },
        ),
        step(
          "What ask price breaks even against buyers? (4 decimals)",
          ask,
          num(ask),
          "Set the ask to the expected value given that someone buys.",
          `\\(${L} + ${H - L} \\cdot ${num(pHbuy)} \\approx ${num(ask)}\\).`,
          { sim: (r) => {
            const t = trade(r);
            return t.buy ? t.v : NaN;
          } },
        ),
        step(
          "What is the bid-ask spread? (4 decimals)",
          ask - bid,
          num(ask - bid),
          "Do the same for sellers to get the bid: \\(\\mathbb{E}[V \\mid \\text{sell}]\\).",
          `Bid \\(= ${num(bid)}\\), so the spread is \\(${num(ask)} - ${num(bid)} \\approx ${num(ask - bid)}\\).`,
          // Reweighted so the mean is E[V | buy] - E[V | sell].
          { sim: (r) => {
            const t = trade(r);
            return t.buy ? t.v / pBuy : -t.v / (1 - pBuy);
          }, trials: 100_000 },
        ),
      ],
      solution: `Quotes must be regret-free: ask \\(= \\mathbb{E}[V \\mid \\text{buy}] \\approx ${num(ask)}\\), bid \\(= \\mathbb{E}[V \\mid \\text{sell}] \\approx ${num(bid)}\\). The spread of ${num(ask - bid)} exists purely because of adverse selection: you lose to informed traders and recover it from the uninformed, and it widens as the informed share (${pct(a)}) grows.`,
    };
  },
};

export const MARKETS: Template[] = [fairOdds, putCallParity, bookmaker, volatilityDrag, portfolio, dieOptions, gamblersRuin, doubling, winnersCurse, binomialTree, kelly, glostenMilgrom];
