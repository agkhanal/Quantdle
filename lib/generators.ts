/**
 * Procedurally generated puzzles: templates with random parameters, one file per
 * topic in `lib/puzzles/`.
 *
 * Every template computes its answers exactly (closed form or a small exact
 * calculation), and every random quantity also has a simulator. Before a puzzle
 * is served, `generatePuzzle` runs a Monte Carlo check on each simulated step and
 * throws the puzzle away if any exact answer disagrees with the simulation.
 * `scripts/verify-generators.ts` runs the same check much harder across many seeds.
 */

import { mulberry32, type Rng } from "./market";
import { DIFFICULTIES, type Difficulty, type Puzzle, type Topic } from "./types";
import { type GenStep, type Generated, type Template } from "./puzzles/kit";
import { PROBABILITY } from "./puzzles/probability";
import { COMBINATORICS } from "./puzzles/combinatorics";
import { EXPECTED_VALUE } from "./puzzles/expected-value";
import { STATISTICS } from "./puzzles/statistics";
import { MARKETS } from "./puzzles/markets";

export const TEMPLATES: Template[] = [...PROBABILITY, ...COMBINATORICS, ...EXPECTED_VALUE, ...STATISTICS, ...MARKETS];

// ───────────── Monte Carlo check ─────────────

export interface CheckResult {
  step: number;
  exact: number;
  estimate: number;
  stdErr: number;
  ok: boolean;
}

/** Simulate each step that has a simulator; ok when the exact answer is within `z` standard errors. */
export function monteCarloCheck(steps: GenStep[], rng: Rng, trialsScale = 1, z = 5): CheckResult[] {
  const out: CheckResult[] = [];
  steps.forEach((s, i) => {
    if (!s.sim) return;
    const trials = Math.round((s.trials ?? 20_000) * trialsScale);
    let n = 0;
    let mean = 0;
    let m2 = 0;
    for (let t = 0; t < trials; t++) {
      const x = s.sim(rng);
      if (Number.isNaN(x)) continue; // conditional sims skip samples outside the condition
      n++;
      const d = x - mean;
      mean += d / n;
      m2 += d * (x - mean);
    }
    const stdErr = n > 1 ? Math.sqrt(m2 / (n - 1) / n) : Infinity;
    const ok = n > 1 && Math.abs(mean - s.answer) <= z * stdErr + 1e-9 * Math.max(1, Math.abs(s.answer));
    out.push({ step: i, exact: s.answer, estimate: mean, stdErr, ok });
  });
  return out;
}

export function templatesFor(d: Difficulty, topic?: Topic) {
  return TEMPLATES.filter((t) => t.difficulty === d && (!topic || t.topic === topic));
}

/** The difficulties that have at least one template for a topic (all of them when no topic is picked). */
export function levelsFor(topic?: Topic | null): Difficulty[] {
  return DIFFICULTIES.filter((d) => templatesFor(d, topic ?? undefined).length > 0);
}

/** The level closest to `d` that has templates for the topic (`d` itself when it has some). */
export function nearestLevel(d: Difficulty, topic?: Topic | null): Difficulty {
  const levels = levelsFor(topic);
  if (!levels.length || levels.includes(d)) return d;
  const at = DIFFICULTIES.indexOf(d);
  return levels.reduce((best, l) => (Math.abs(DIFFICULTIES.indexOf(l) - at) < Math.abs(DIFFICULTIES.indexOf(best) - at) ? l : best));
}

/** Build a template's puzzle for a given seed, without the Monte Carlo check. */
export function buildFromTemplate(t: Template, seed: number) {
  const g = t.make(mulberry32(seed));
  return { generated: g, id: `gen-${t.id}-${seed}` };
}

function toPuzzle(t: Template, id: string, g: Generated): Puzzle {
  return {
    id,
    title: g.title,
    category: t.topic,
    difficulty: t.difficulty,
    story: g.story,
    // Strip simulators: only plain data goes into the sealed token.
    steps: g.steps.map(({ sim: _sim, trials: _trials, ...rest }) => rest),
    solution: g.solution,
  };
}

/**
 * Generate a verified puzzle. Picks a template for the difficulty (and topic, if given),
 * builds it from the seed, and only returns it if every simulated step agrees with the
 * exact answer. A topic with no template at that difficulty uses its nearest level.
 */
export function generatePuzzle(difficulty: Difficulty, seed: number = Math.floor(Math.random() * 2 ** 31), topic?: Topic): Puzzle {
  const pool = templatesFor(nearestLevel(difficulty, topic), topic);
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = (seed + attempt * 104_729) >>> 0;
    const t = pool[s % pool.length];
    const { generated, id } = buildFromTemplate(t, s);
    const checks = monteCarloCheck(generated.steps, mulberry32(s ^ 0x9e3779b9));
    if (checks.every((c) => c.ok)) return toPuzzle(t, id, generated);
    console.warn(`[quantdle] ${id} failed its Monte Carlo check; trying another`, checks.filter((c) => !c.ok));
  }
  throw new Error("Could not generate a verified puzzle.");
}