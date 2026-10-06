/** Statistics puzzle templates, easiest first. */

import { pick, int, die, flip, frac, texFrac, texFracApprox, num, choose, step, ind, shuffle, normal, Phi, type Rng, type Template } from "./kit";

const bayes: Template = {
  id: "bayes",
  difficulty: "medium",
  topic: "Statistics",
  make(rng) {
    const prev = pick(rng, [0.001, 0.005, 0.01, 0.02, 0.05]);
    const sens = pick(rng, [0.9, 0.95, 0.99]);
    const fpr = pick(rng, [0.01, 0.02, 0.05, 0.1]);
    const joint = prev * sens;
    const pos = joint + (1 - prev) * fpr;
    const post = joint / pos;
    const pct = (x: number) => `${+(x * 100).toFixed(1)}%`;
    const pctTex = (x: number) => `${+(x * 100).toFixed(1)}\\%`;
    const sample = (r: Rng) => {
      const sick = flip(r, prev);
      return [sick, flip(r, sick ? sens : fpr)] as const;
    };
    const thing = pick(rng, [
      ["A disease affects", "a person", "has the disease"],
      ["A fraud scheme hits", "a transaction", "is fraudulent"],
      ["A defect affects", "a chip", "is defective"],
    ] as const);
    return {
      title: pick(rng, ["False Alarm", "Base Rates", "Positive Thinking"]),
      category: "Statistics",
      story: `${thing[0]} ${pct(prev)} of cases. A screen flags ${pct(sens)} of true cases, but also wrongly flags ${pct(fpr)} of clean ones. ${thing[1][0].toUpperCase() + thing[1].slice(1)} gets flagged. What is the probability it really ${thing[2]}?`,
      steps: [
        step("What is \\(P(\\text{true case and flagged})\\)? (4 significant figures)",
          joint,
          num(joint),
          "\\(P(\\text{case}) \\times P(\\text{flagged} \\mid \\text{case})\\).",
          `\\(${prev} \\times ${sens} = ${num(joint)}\\).`, {
          sim: (r) => {
            const [a, b] = sample(r);
            return ind(a && b);
          },
          trials: 200_000,
        }),
        step(
          "What is the overall \\(P(\\text{flagged})\\)? (4 significant figures)",
          pos,
          num(pos),
          `Add true flags and false flags: \\(${prev} \\cdot ${sens} + ${num(1 - prev)} \\cdot ${fpr}\\).`,
          `\\(${num(joint)} + ${num((1 - prev) * fpr)} = ${num(pos)}\\).`,
          { sim: (r) => ind(sample(r)[1]), trials: 200_000 },
        ),
        step("What is \\(P(\\text{true case} \\mid \\text{flagged})\\)? (4 decimals)",
          post,
          num(post),
          "Bayes: divide step 1 by step 2.",
          `\\(\\frac{${num(joint)}}{${num(pos)}} \\approx ${num(post)}\\).`, {
          sim: (r) => {
            const [a, b] = sample(r);
            return b ? ind(a) : NaN;
          },
          trials: 400_000,
        }),
      ],
      solution: `Bayes: \\(P(\\text{case} \\mid \\text{flag}) = \\frac{${num(joint)}}{${num(pos)}} \\approx ${pctTex(post)}\\). When the base rate is low, false flags from the large clean population can swamp the true ones.`,
    };
  },
};

const diceVariance: Template = {
  id: "dice-variance",
  difficulty: "easy",
  topic: "Statistics",
  make(rng) {
    const s = pick(rng, [4, 6, 8, 10, 12, 20]);
    const n = pick(rng, [2, 3, 4, 5, 10, 25]);
    const v = (s * s - 1) / 12;
    const mean = (s + 1) / 2;
    const dice = s === 6 ? "fair dice" : `fair ${s}-sided dice`;
    const roll = (r: Rng) => Array.from({ length: n }, () => die(r, s)).reduce((a, b) => a + b, 0);
    return {
      title: pick(rng, ["Spread of the Dice", "Averaging Out", "Square Root of n"]),
      category: "Statistics",
      story: `You roll ${n} ${dice} and take their average. How spread out is that average?`,
      steps: [
        step(
          `What is the variance of a single die?`,
          v,
          frac(s * s - 1, 12),
          `\\(\\mathbb{E}[X] = ${num(mean)}\\). Use \\(\\operatorname{Var}(X) = \\mathbb{E}[X^2] - \\mathbb{E}[X]^2\\), or the formula for a discrete uniform.`,
          `\\(\\frac{${s}^2 - 1}{12} = ${texFrac(s * s - 1, 12)}\\).`,
          { sim: (r) => (die(r, s) - mean) ** 2 },
        ),
        step(
          `What is the variance of the sum of ${n} dice?`,
          n * v,
          frac(n * (s * s - 1), 12),
          "Variances of independent variables add.",
          `\\(${n} \\cdot ${texFrac(s * s - 1, 12)} = ${texFrac(n * (s * s - 1), 12)}\\).`,
          { sim: (r) => (roll(r) - n * mean) ** 2 },
        ),
        step(
          `What is the standard deviation of the average of the ${n} dice? (4 decimals)`,
          Math.sqrt(v / n),
          num(Math.sqrt(v / n)),
          `Dividing by ${n} divides the variance by \\(${n}^2\\).`,
          `\\(\\sqrt{${texFrac(n * (s * s - 1), 12)} / ${n * n}} = \\sqrt{${texFrac(s * s - 1, 12 * n)}} \\approx ${num(Math.sqrt(v / n))}\\).`,
        ),
      ],
      solution: `One die has variance \\(\\frac{s^2 - 1}{12} = ${texFrac(s * s - 1, 12)}\\). The sum of ${n} has ${n} times that, and the average has \\(\\frac{1}{${n}}\\) of it, so its SD is \\(\\frac{\\sigma}{\\sqrt{${n}}} \\approx ${num(Math.sqrt(v / n))}\\). Averaging shrinks noise only like \\(\\sqrt{n}\\).`,
    };
  },
};

const tableMoments: Template = {
  id: "table-moments",
  difficulty: "easy",
  topic: "Statistics",
  make(rng) {
    const [p1, p2] = pick(rng, [
      [5, 3],
      [6, 3],
      [7, 2],
      [6, 2],
      [5, 4],
      [8, 1],
    ] as const);
    const ps = [p1 / 10, p2 / 10, (10 - p1 - p2) / 10];
    const vs = [0, pick(rng, [2, 4, 5, 10]), pick(rng, [20, 25, 40, 50])];
    const mean = ps.reduce((a, p, i) => a + p * vs[i], 0);
    const sq = ps.reduce((a, p, i) => a + p * vs[i] ** 2, 0);
    const v = sq - mean ** 2;
    const draw = (r: Rng) => {
      const u = r();
      return u < ps[0] ? vs[0] : u < ps[0] + ps[1] ? vs[1] : vs[2];
    };
    const what = pick(rng, ["A scratch card pays", "A carnival spinner pays", "A trading signal's payoff is"]);
    const pct = (p: number) => `${Math.round(p * 100)}%`;
    return {
      title: pick(rng, ["Mean and Spread", "Know Your Payoff", "Moments"]),
      category: "Statistics",
      story: `${what} $${vs[0]} with probability ${pct(ps[0])}, $${vs[1]} with probability ${pct(ps[1])}, and $${vs[2]} with probability ${pct(ps[2])}. What are its mean and standard deviation?`,
      steps: [
        step("What is the expected payout?", mean, num(mean), "Weight each payout by its probability.", `\\(${ps.map((p, i) => `${p} \\cdot ${vs[i]}`).join(" + ")} = ${num(mean)}\\).`, { sim: draw }),
        step(
          "What is \\(\\mathbb{E}[X^2]\\)?",
          sq,
          num(sq),
          "Square the payouts first, then weight.",
          `\\(${ps.map((p, i) => `${p} \\cdot ${vs[i]}^2`).join(" + ")} = ${num(sq)}\\).`,
          { sim: (r) => draw(r) ** 2 },
        ),
        step("What is the variance?", v, num(v), "\\(\\mathbb{E}[X^2] - \\mathbb{E}[X]^2\\).", `\\(${num(sq)} - ${num(mean)}^2 = ${num(v)}\\).`, {
          sim: (r) => (draw(r) - mean) ** 2,
        }),
        step("What is the standard deviation? (4 decimals)", Math.sqrt(v), num(Math.sqrt(v)), "Square root of the variance.", `\\(\\sqrt{${num(v)}} \\approx ${num(Math.sqrt(v))}\\).`),
      ],
      solution: `\\(\\mathbb{E}[X] = ${num(mean)}\\), \\(\\mathbb{E}[X^2] = ${num(sq)}\\), so \\(\\operatorname{Var} = ${num(v)}\\) and \\(\\sigma \\approx ${num(Math.sqrt(v))}\\). The rare big payout drives most of the spread.`,
    };
  },
};

const normalZ: Template = {
  id: "normal-z",
  difficulty: "easy",
  topic: "Statistics",
  make(rng) {
    const setting = pick(rng, [
      { what: "Exam scores", mu: 70, sigma: pick(rng, [8, 10, 12]), unit: "" },
      { what: "Adult heights in a city", mu: 170, sigma: pick(rng, [6, 8, 10]), unit: " cm" },
      { what: "A fund's annual returns", mu: 8, sigma: pick(rng, [4, 10, 16]), unit: "%" },
    ]);
    const { mu, sigma } = setting;
    const z = pick(rng, [-1.5, -1, -0.5, 0.5, 1, 1.5, 2]);
    const x = mu + z * sigma;
    const k = pick(rng, [1, 2]);
    const above = 1 - Phi(z);
    const within = Phi(k) - Phi(-k);
    const sample = (r: Rng) => mu + sigma * normal(r);
    return {
      title: pick(rng, ["Bell Curve", "How Unusual?", "Z-Score"]),
      category: "Statistics",
      story: `${setting.what} are normally distributed with mean ${mu}${setting.unit} and standard deviation ${sigma}${setting.unit}. How unusual is a value of ${x}${setting.unit}?`,
      steps: [
        step(`What is the z-score of ${x}${setting.unit}?`, z, `${z}`, "How many standard deviations from the mean?", `\\(\\frac{${x} - ${mu}}{${sigma}} = ${z}\\).`),
        step(
          `What fraction of values are above ${x}${setting.unit}? (4 decimals)`,
          above,
          num(above),
          "Look up \\(1 - \\Phi(z)\\) in a normal table.",
          `\\(1 - \\Phi(${z}) \\approx ${num(above)}\\).`,
          { sim: (r) => ind(sample(r) > x) },
        ),
        step(
          `What fraction are within ${k} standard deviation${k > 1 ? "s" : ""} of the mean? (4 decimals)`,
          within,
          num(within),
          `\\(\\Phi(${k}) - \\Phi(-${k})\\). You may know the rule of thumb.`,
          `\\(\\Phi(${k}) - \\Phi(-${k}) \\approx ${num(within)}\\) (the ${k === 1 ? "68" : "95"} in 68-95-99.7).`,
          { sim: (r) => ind(Math.abs(sample(r) - mu) < k * sigma) },
        ),
      ],
      solution: `Standardize: \\(z = \\frac{x - \\mu}{\\sigma} = ${z}\\), so a fraction \\(1 - \\Phi(${z}) \\approx ${num(above)}\\) lies above it. Within ${k} SD of the mean is \\(\\approx ${num(within)}\\).`,
    };
  },
};

const correlation: Template = {
  id: "correlation",
  difficulty: "medium",
  topic: "Statistics",
  make(rng) {
    const s = pick(rng, [6, 6, 8, 10]);
    const a = int(rng, 1, 4);
    const b = int(rng, 1, 5);
    const v = (s * s - 1) / 12;
    const mu = (s + 1) / 2;
    const dice = s === 6 ? "fair dice" : `fair ${s}-sided dice`;
    const roll = (r: Rng) => {
      let x = 0;
      for (let i = 0; i < a; i++) x += die(r, s);
      let y = 0;
      for (let i = 0; i < b; i++) y += die(r, s);
      return [x, x + y];
    };
    const rho = Math.sqrt(a / (a + b));
    return {
      title: pick(rng, ["Shared Dice", "Overlap", "Partly Related"]),
      category: "Statistics",
      story: `You roll ${a + b} ${dice}. Let \\(X\\) be the total of the first ${a} and \\(S\\) the total of all ${a + b}. How strongly are \\(X\\) and \\(S\\) correlated?`,
      steps: [
        step(
          "What is \\(\\operatorname{Var}(X)\\)?",
          a * v,
          frac(a * (s * s - 1), 12),
          `One die has variance \\(${texFrac(s * s - 1, 12)}\\).`,
          `\\(${a} \\cdot ${texFrac(s * s - 1, 12)} = ${texFrac(a * (s * s - 1), 12)}\\).`,
          { sim: (r) => (roll(r)[0] - a * mu) ** 2 },
        ),
        step(
          "What is \\(\\operatorname{Cov}(X, S)\\)?",
          a * v,
          frac(a * (s * s - 1), 12),
          "Write \\(S = X + Y\\) with \\(Y\\) independent of \\(X\\), and expand.",
          `\\(\\operatorname{Cov}(X, X + Y) = \\operatorname{Var}(X) + 0 = ${texFrac(a * (s * s - 1), 12)}\\).`,
          { sim: (r) => {
            const [x, t] = roll(r);
            return (x - a * mu) * (t - (a + b) * mu);
          } },
        ),
        step(
          "What is the correlation of \\(X\\) and \\(S\\)? (4 decimals)",
          rho,
          num(rho),
          "\\(\\rho = \\frac{\\operatorname{Cov}(X, S)}{\\sigma_X \\sigma_S}\\).",
          `\\(\\frac{${a}\\sigma^2}{\\sqrt{${a}\\sigma^2 \\cdot ${a + b}\\sigma^2}} = \\sqrt{\\tfrac{${a}}{${a + b}}} \\approx ${num(rho)}\\).`,
        ),
      ],
      solution: `\\(\\operatorname{Cov}(X, X + Y) = \\operatorname{Var}(X)\\), so \\(\\rho = \\sqrt{\\frac{${a}}{${a + b}}} \\approx ${num(rho)}\\): the square root of the share of the total that \\(X\\) contributes. The die size cancels out.`,
    };
  },
};

const pooledTesting: Template = {
  id: "pooled-testing",
  difficulty: "medium",
  topic: "Statistics",
  make(rng) {
    const p = pick(rng, [0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1]);
    const k = int(rng, 3, 12);
    const q = 1 - p;
    const perPerson = (g: number) => 1 / g + 1 - q ** g;
    let best = 2;
    for (let g = 3; g <= 40; g++) if (perPerson(g) < perPerson(best)) best = g;
    const pool = (r: Rng) => Array.from({ length: k }, () => r() < p).some(Boolean);
    const what = pick(rng, [
      ["A lab screens blood samples for an infection", "people"],
      ["A factory screens batches of water samples for a contaminant", "samples"],
      ["A data team checks records for corruption", "records"],
    ] as const);
    const pct = `${+(p * 100).toFixed(1)}%`;
    return {
      title: pick(rng, ["Pool the Samples", "Group Testing", "Test Smarter"]),
      category: "Statistics",
      story: `${what[0]} that affects ${pct} of ${what[1]}, independently. Instead of testing each one, it mixes ${k} together and tests the pool once; only if the pool is positive does it test those ${k} individually. How many tests does that cost per ${what[1].slice(0, -1)}?`,
      steps: [
        step(`What is the probability a pool of ${k} tests positive? (4 decimals)`, 1 - q ** k, num(1 - q ** k), "Complement of everyone in it being clean.", `\\(1 - ${num(q)}^{${k}} \\approx ${num(1 - q ** k)}\\).`, {
          sim: (r) => ind(pool(r)),
        }),
        step(
          "What is the expected number of tests per pool? (4 decimals)",
          1 + k * (1 - q ** k),
          num(1 + k * (1 - q ** k)),
          `One pooled test always, plus ${k} more when it's positive.`,
          `\\(1 + ${k} \\cdot ${num(1 - q ** k)} \\approx ${num(1 + k * (1 - q ** k))}\\).`,
          { sim: (r) => 1 + (pool(r) ? k : 0) },
        ),
        step(
          `What is the expected number of tests per ${what[1].slice(0, -1)}? (4 decimals)`,
          perPerson(k),
          num(perPerson(k)),
          `Divide by ${k}.`,
          `\\(\\frac{1}{${k}} + ${num(1 - q ** k)} \\approx ${num(perPerson(k))}\\).`,
        ),
        step(
          "Which pool size from 2 to 40 needs the fewest tests per item?",
          best,
          `${best}`,
          `Minimize \\(\\frac{1}{g} + 1 - ${num(q)}^g\\) over whole numbers \\(g\\).`,
          `\\(g = ${best}\\) gives \\(\\approx ${num(perPerson(best))}\\) tests each.`,
        ),
      ],
      solution: `Dorfman pooling costs \\(\\frac{1}{g} + 1 - (1 - p)^g\\) tests per item: ${num(perPerson(k))} with pools of ${k}, and as low as ${num(perPerson(best))} with the best size, ${best}. When the condition is rare, almost every pool comes back clean and you save most of the tests.`,
    };
  },
};

const germanTank: Template = {
  id: "german-tank",
  difficulty: "hard",
  topic: "Statistics",
  make(rng) {
    const N = int(rng, 6, 30) * 10;
    const k = int(rng, 3, 8);
    const t = Math.round((N * pick(rng, [0.6, 0.7, 0.8])) / 10) * 10;
    const m = int(rng, Math.round(N * 0.7), N);
    const est = m * (1 + 1 / k) - 1;
    const sample = (r: Rng) => shuffle(r, Array.from({ length: N }, (_, i) => i + 1)).slice(0, k);
    const scene = pick(rng, [
      ["An enemy numbers its tanks", "tanks", "serial numbers"],
      ["A city numbers its taxis", "taxis", "licence numbers"],
      ["A raffle numbers its tickets", "tickets", "ticket numbers"],
    ] as const);
    return {
      title: pick(rng, ["German Tank Problem", "Count from the Max", "How Many Are There?"]),
      category: "Statistics",
      story: `${scene[0]} 1, 2, ..., \\(N\\). You see ${k} different ${scene[1]} at random. First, suppose \\(N = ${N}\\) and ask what you'd expect to see. Then estimate \\(N\\) from an actual sighting.`,
      steps: [
        step(
          `If \\(N = ${N}\\), what is the probability that all ${k} ${scene[2]} you see are at most ${t}? (4 decimals)`,
          choose(t, k) / choose(N, k),
          num(choose(t, k) / choose(N, k)),
          "Every set of k numbers is equally likely.",
          `\\(\\binom{${t}}{${k}} \\big/ \\binom{${N}}{${k}} \\approx ${num(choose(t, k) / choose(N, k))}\\).`,
          { sim: (r) => ind(Math.max(...sample(r)) <= t) },
        ),
        step(
          `If \\(N = ${N}\\), what is the expected largest number you see? (4 significant figures)`,
          (k * (N + 1)) / (k + 1),
          num((k * (N + 1)) / (k + 1)),
          `The ${k} numbers cut 1..N into ${k + 1} gaps of equal expected size.`,
          `\\(\\frac{${k}(N + 1)}{${k + 1}} = \\frac{${k} \\cdot ${N + 1}}{${k + 1}} \\approx ${num((k * (N + 1)) / (k + 1))}\\).`,
          { sim: (r) => Math.max(...sample(r)) },
        ),
        step(
          `Now \\(N\\) is unknown and the largest of the ${k} you see is ${m}. What is the unbiased estimate of \\(N\\)? (2 decimals)`,
          est,
          num(est),
          "Invert step 2: solve \\(\\mathbb{E}[\\max] = \\frac{k(N + 1)}{k + 1}\\) for \\(N\\), with the observed max in place of its expectation.",
          `\\(\\hat N = m\\left(1 + \\frac{1}{k}\\right) - 1 = ${m} \\cdot ${texFrac(k + 1, k)} - 1 \\approx ${num(est)}\\).`,
        ),
      ],
      solution: `The sample maximum averages \\(\\frac{k(N + 1)}{k + 1}\\), so \\(\\hat N = m(1 + \\frac{1}{k}) - 1\\) is unbiased: the max plus the average gap between observed numbers. In WWII this beat intelligence estimates of German tank production by a wide margin.`,
    };
  },
};

const bivariateNormal: Template = {
  id: "bivariate-normal",
  difficulty: "hard",
  topic: "Statistics",
  make(rng) {
    const rho = pick(rng, [0.3, 0.5, 0.6, 0.7, 0.8, -0.5]);
    const x = pick(rng, [1, 1.5, 2, 2.5]);
    const both = 0.25 + Math.asin(rho) / (2 * Math.PI);
    const pair = (r: Rng) => {
      const a = normal(r);
      return [a, rho * a + Math.sqrt(1 - rho * rho) * normal(r)];
    };
    const scene = pick(rng, [
      ["a student's standardized maths score", "their physics score"],
      ["a stock's standardized return today", "its sector's return"],
      ["a parent's standardized height", "their adult child's"],
    ] as const);
    return {
      title: pick(rng, ["Regression to the Mean", "Both Above Average", "Correlated Normals"]),
      category: "Statistics",
      story: `Let \\(X\\) be ${scene[0]} and \\(Y\\) ${scene[1]}. Both are standard normal (mean 0, SD 1) with correlation \\(\\rho = ${rho}\\), jointly normal. How much does knowing \\(X\\) tell you about \\(Y\\)?`,
      steps: [
        step(`If \\(X = ${x}\\), what is \\(\\mathbb{E}[Y \\mid X]\\)?`, rho * x, num(rho * x), "For standardized jointly normal variables, the regression line has slope \\(\\rho\\).", `\\(\\rho x = ${rho} \\cdot ${x} = ${num(rho * x)}\\).`),
        step(
          "What is \\(P(X > 0 \\text{ and } Y > 0)\\)? (4 decimals)",
          both,
          num(both),
          "Write \\(Y = \\rho X + \\sqrt{1 - \\rho^2} Z\\). The event is a wedge in the plane of \\((X, Z)\\), and that plane is rotationally symmetric.",
          `\\(\\frac{1}{4} + \\frac{\\arcsin \\rho}{2\\pi} = \\frac{1}{4} + \\frac{\\arcsin(${rho})}{2\\pi} \\approx ${num(both)}\\).`,
          { sim: (r) => {
            const [a, b] = pair(r);
            return ind(a > 0 && b > 0);
          } },
        ),
        step(
          "What is \\(P(Y > 0 \\mid X > 0)\\)? (4 decimals)",
          2 * both,
          num(2 * both),
          "Divide by \\(P(X > 0)\\).",
          `\\(${num(both)} / 0.5 = ${num(2 * both)}\\).`,
          { sim: (r) => {
            const [a, b] = pair(r);
            return a > 0 ? ind(b > 0) : NaN;
          } },
        ),
      ],
      solution: `The best guess for \\(Y\\) is \\(\\rho X = ${num(rho * x)}\\), pulled toward the mean: regression to the mean. For signs, \\(P(X > 0, Y > 0) = \\frac{1}{4} + \\frac{\\arcsin \\rho}{2\\pi}\\) (Sheppard's formula), so \\(P(Y > 0 \\mid X > 0) \\approx ${num(2 * both)}\\).`,
    };
  },
};

const laplace: Template = {
  id: "laplace-succession",
  difficulty: "hard",
  topic: "Statistics",
  make(rng) {
    const n = int(rng, 3, 10);
    const h = int(rng, 0, n);
    const thing = pick(rng, [
      ["a coin from a novelty shop", "flip", "heads", "flips"],
      ["a new trading strategy", "trade", "winners", "trades"],
      ["a bent thumbtack", "toss", "point-up landings", "tosses"],
    ] as const);
    const trial = (r: Rng) => {
      const p = r();
      let k = 0;
      for (let i = 0; i < n; i++) if (r() < p) k++;
      return { p, k, next: () => r() < p };
    };
    return {
      title: pick(rng, ["Rule of Succession", "Unknown Bias", "Bayes Your Coin"]),
      category: "Statistics",
      story: `You know nothing about ${thing[0]}: its chance \\(p\\) of a success is equally likely to be anything from 0 to 1. Each ${thing[1]} succeeds independently with probability \\(p\\). You see ${h} ${thing[2]} in ${n} ${thing[3]}. What should you believe now?`,
      steps: [
        step(
          `Before looking, what was the probability of exactly ${h} successes in ${n}?`,
          1 / (n + 1),
          frac(1, n + 1),
          "Average the binomial probability over \\(p\\), or picture \\(n + 1\\) uniform points and ask where the one for \\(p\\) lands.",
          `\\(\\int_0^1 \\binom{${n}}{${h}} p^{${h}}(1 - p)^{${n - h}} \\, dp = \\frac{1}{${n + 1}}\\), the same for every count.`,
          { sim: (r) => ind(trial(r).k === h) },
        ),
        step(
          "What is your posterior mean for \\(p\\)? This is also the chance the next one succeeds.",
          (h + 1) / (n + 2),
          frac(h + 1, n + 2),
          "The posterior is Beta(h + 1, n − h + 1).",
          `\\(\\frac{h + 1}{n + 2} = ${texFrac(h + 1, n + 2)}\\) (Laplace's rule of succession).`,
          { sim: (r) => {
            const t = trial(r);
            return t.k === h ? t.p : NaN;
          }, trials: 60_000 },
        ),
        step(
          "What is the probability the next two both succeed?",
          ((h + 1) * (h + 2)) / ((n + 2) * (n + 3)),
          frac((h + 1) * (h + 2), (n + 2) * (n + 3)),
          "Not the square of step 2: after one more success you update again.",
          `\\(\\frac{${h + 1}}{${n + 2}} \\cdot \\frac{${h + 2}}{${n + 3}} = ${texFrac((h + 1) * (h + 2), (n + 2) * (n + 3))}\\).`,
          { sim: (r) => {
            const t = trial(r);
            return t.k === h ? ind(t.next() && t.next()) : NaN;
          }, trials: 60_000 },
        ),
      ],
      solution: `With a uniform prior, seeing ${h} of ${n} gives a Beta(${h + 1}, ${n - h + 1}) posterior, mean \\(\\frac{${h + 1}}{${n + 2}}\\). It's like adding one imaginary success and one failure, so ${h === n ? "even a perfect record doesn't make you certain" : h === 0 ? "even zero successes doesn't make you rule it out" : "small samples get pulled toward \\(\\tfrac{1}{2}\\)"}. Two more successes: \\(${texFracApprox((h + 1) * (h + 2), (n + 2) * (n + 3))}\\).`,
    };
  },
};

export const STATISTICS: Template[] = [diceVariance, tableMoments, normalZ, bayes, correlation, pooledTesting, germanTank, bivariateNormal, laplace];
