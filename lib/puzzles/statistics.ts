/** Statistics puzzle templates, easiest first. */

import { pick, flip, frac, num, step, ind, type Rng, type Template } from "./kit";

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

export const STATISTICS: Template[] = [bayes];
