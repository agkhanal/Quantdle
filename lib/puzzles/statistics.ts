/** Statistics puzzle templates, easiest first. */

import { pick, die, flip, frac, texFrac, num, step, ind, normal, Phi, type Rng, type Template } from "./kit";

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

export const STATISTICS: Template[] = [diceVariance, tableMoments, normalZ, bayes];
