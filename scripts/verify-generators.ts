/**
 * Stress-test every puzzle template: for many seeds, build the puzzle and check each
 * simulated step against its exact answer with a large Monte Carlo run.
 *
 *   npx tsx scripts/verify-generators.ts            # 60 seeds per template
 *   npx tsx scripts/verify-generators.ts 300        # more seeds
 */
import { TEMPLATES, buildFromTemplate, levelsFor, monteCarloCheck } from "../lib/generators";
import { mulberry32 } from "../lib/market";
import { evaluate } from "../lib/math";
import { TOPICS } from "../lib/types";

const seeds = Number(process.argv[2] ?? 60);
let failures = 0;
const variety = new Map<string, Set<string>>();

for (const t of TEMPLATES) {
  const stories = new Set<string>();
  let worstZ = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const { generated: g, id } = buildFromTemplate(t, seed * 7919);
    stories.add(g.story);

    if (g.steps.length < 3) fail(id, "fewer than 3 steps");
    if (g.category !== t.topic) fail(id, `labelled "${g.category}" but filed under the "${t.topic}" topic`);
    g.steps.forEach((s, i) => {
      if (!Number.isFinite(s.answer)) fail(id, `step ${i + 1} answer is not finite`);
      // The displayed answer should evaluate to the real answer (within display rounding).
      const shown = evaluate(s.answerDisplay.split("≈").pop()!.replace("$", "").trim());
      if (shown === null || Math.abs(shown - s.answer) > Math.max(1e-9, Math.abs(s.answer) * Math.max(s.tolerance, 0.001))) {
        fail(id, `step ${i + 1} display "${s.answerDisplay}" doesn't match ${s.answer}`);
      }
    });

    // 5x the trials the live check uses, and a stricter-looking threshold report.
    for (const c of monteCarloCheck(g.steps, mulberry32(seed ^ 0x5bd1e995), 5, 5)) {
      const z = Math.abs(c.estimate - c.exact) / (c.stdErr || 1e-12);
      if (c.stdErr > 0) worstZ = Math.max(worstZ, z);
      if (!c.ok) fail(id, `step ${c.step + 1}: exact ${c.exact}, simulated ${c.estimate.toFixed(5)} ± ${c.stdErr.toFixed(5)}`);
    }
  }
  variety.set(t.id, stories);
  console.log(`${t.difficulty.padEnd(6)} ${t.id.padEnd(17)} ${String(stories.size).padStart(4)} distinct stories   worst |z| = ${worstZ.toFixed(2)}`);
}

// Every practice topic needs puzzles, and the topic picker shows which levels have them.
console.log("\nTopics:");
for (const topic of TOPICS) {
  const levels = levelsFor(topic);
  if (!levels.length) fail(topic, "no templates for this topic");
  console.log(`  ${topic.padEnd(15)} ${levels.join(", ") || "(none)"}`);
}

function fail(id: string, msg: string) {
  failures++;
  console.log(`  ✗ ${id}: ${msg}`);
}

console.log(failures ? `\n${failures} problem(s) found.` : `\nAll ${TEMPLATES.length} templates passed across ${seeds} seeds each.`);
process.exit(failures ? 1 : 0);