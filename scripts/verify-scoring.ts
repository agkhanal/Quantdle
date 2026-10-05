/**
 * Sanity-check the scoring rules: print the points table, check monotonicity (fewer guesses
 * never scores less, harder never scores less), and check the calendar helpers.
 *
 *   npx tsx scripts/verify-scoring.ts
 */
import { DIFFICULTIES } from "../lib/types";
import { efficiency, periodEnd, weekIndex, winPoints } from "../lib/scoring";

let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    failures++;
    console.error("FAIL:", msg);
  }
};

for (const steps of [3, 4, 5]) {
  console.log(`\n${steps}-step puzzle: points by guesses used (practice / daily, no streak)`);
  for (const d of DIFFICULTIES) {
    const row: string[] = [];
    let prev = Infinity;
    for (let g = steps; g <= 6; g++) {
      const p = winPoints({ difficulty: d, steps, guesses: g, daily: false, streak: 0 }).points;
      const dp = winPoints({ difficulty: d, steps, guesses: g, daily: true, streak: 1 }).points;
      row.push(`${g}:${p}/${dp}`);
      check(p <= prev, `${d} ${steps}-step: more guesses must not score more (${g})`);
      prev = p;
    }
    console.log(`  ${d.padEnd(7)} ${row.join("  ")}`);
  }
}
check(winPoints({ difficulty: "hard", steps: 3, guesses: 3, daily: false, streak: 0 }).points > winPoints({ difficulty: "easy", steps: 3, guesses: 3, daily: false, streak: 0 }).points, "harder scores more");
const s1 = winPoints({ difficulty: "medium", steps: 3, guesses: 3, daily: true, streak: 1 }).points;
const s11 = winPoints({ difficulty: "medium", steps: 3, guesses: 3, daily: true, streak: 11 }).points;
const s30 = winPoints({ difficulty: "medium", steps: 3, guesses: 3, daily: true, streak: 30 }).points;
check(s11 > s1 && s30 === s11, "streak bonus grows then caps at 10 days");
check(winPoints({ difficulty: "easy", steps: 3, guesses: 4, daily: true, streak: 3 }).breakdown.reduce((a, b) => a + b.value, 0) === winPoints({ difficulty: "easy", steps: 3, guesses: 4, daily: true, streak: 3 }).points, "breakdown sums to total");
check(efficiency(6, 6) === 1 && efficiency(3, 3) === 1 && efficiency(6, 3) === 0.5, "efficiency endpoints");

// 2026-01-01 is a Thursday: days 1-4 are week 0 (Thu-Sun), day 5 (Mon Jan 5) starts week 1.
check(weekIndex(1) === 0 && weekIndex(4) === 0 && weekIndex(5) === 1 && weekIndex(11) === 1 && weekIndex(12) === 2, "weeks start on Monday");
const mon = new Date(periodEnd("weekly", Date.UTC(2026, 0, 1, 12)));
check(mon.toISOString() === "2026-01-05T00:00:00.000Z", `weekly reset is Monday 00:00 UTC (got ${mon.toISOString()})`);
const nextDay = new Date(periodEnd("daily", Date.UTC(2026, 0, 1, 12)));
check(nextDay.toISOString() === "2026-01-02T00:00:00.000Z", "daily reset is midnight UTC");
const wk2 = new Date(periodEnd("weekly", Date.UTC(2026, 0, 7, 12)));
check(wk2.toISOString() === "2026-01-12T00:00:00.000Z", "weekly reset from mid-week");

console.log(failures ? `\n${failures} check(s) failed` : "\nAll scoring checks passed");
process.exit(failures ? 1 : 0);
