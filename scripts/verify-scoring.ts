/**
 * Sanity-check the scoring rules: print the points table, check monotonicity (fewer guesses
 * never scores less, harder never scores less), and check the Elo and calendar helpers.
 *
 *   npx tsx scripts/verify-scoring.ts
 */
import { DIFFICULTIES } from "../lib/types";
import { PUZZLE_RATING, START_ELO, eloAfter, efficiency, periodEnd, tierFor, weekIndex, winPoints } from "../lib/scoring";

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

console.log("\nElo: a 1200 player with 20 games");
for (const d of DIFFICULTIES) {
  const win = eloAfter(START_ELO, 20, d, { win: true, efficiency: 1 }) - START_ELO;
  const slow = eloAfter(START_ELO, 20, d, { win: true, efficiency: 0.5 }) - START_ELO;
  const loss = eloAfter(START_ELO, 20, d, { win: false, efficiency: 0 }) - START_ELO;
  console.log(`  ${d.padEnd(7)} (puzzle ${PUZZLE_RATING[d]}): clean win ${fmt(win)}, slow win ${fmt(slow)}, loss ${fmt(loss)}`);
  check(win > slow && slow > loss, `${d}: clean win > slow win > loss`);
}
check(eloAfter(100, 50, "expert", { win: false, efficiency: 0 }) === 100, "rating never drops below the floor");
check(eloAfter(START_ELO, 0, "easy", { win: true, efficiency: 1 }) - START_ELO > eloAfter(START_ELO, 50, "easy", { win: true, efficiency: 1 }) - START_ELO, "new players move faster");
check(tierFor(1199) === "Analyst" && tierFor(1200) === "Associate", "tier boundaries");

// 2026-01-01 is a Thursday: days 1-4 are week 0 (Thu-Sun), day 5 (Mon Jan 5) starts week 1.
check(weekIndex(1) === 0 && weekIndex(4) === 0 && weekIndex(5) === 1 && weekIndex(11) === 1 && weekIndex(12) === 2, "weeks start on Monday");
const mon = new Date(periodEnd("weekly", Date.UTC(2026, 0, 1, 12)));
check(mon.toISOString() === "2026-01-05T00:00:00.000Z", `weekly reset is Monday 00:00 UTC (got ${mon.toISOString()})`);
const nextDay = new Date(periodEnd("daily", Date.UTC(2026, 0, 1, 12)));
check(nextDay.toISOString() === "2026-01-02T00:00:00.000Z", "daily reset is midnight UTC");
const wk2 = new Date(periodEnd("weekly", Date.UTC(2026, 0, 7, 12)));
check(wk2.toISOString() === "2026-01-12T00:00:00.000Z", "weekly reset from mid-week");

function fmt(n: number) {
  return (n >= 0 ? "+" : "") + n;
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll scoring checks passed");
process.exit(failures ? 1 : 0);
