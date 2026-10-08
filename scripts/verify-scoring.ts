/**
 * Sanity-check the scoring rules: print the points table, check monotonicity (fewer guesses
 * never scores less, harder never scores less), and check the calendar helpers.
 *
 *   npx tsx scripts/verify-scoring.ts
 */
import { DIFFICULTIES } from "../lib/types";
import { ARCHIVE_MULTIPLIER, efficiency, periodEnd, weekIndex, winPoints } from "../lib/scoring";
import { LAUNCH_DAY, dailyNumber, dayStart } from "../lib/day";

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

// Past dailies (the archive): half of a normal win, never more than practice, no streak, never negative.
console.log("\nArchive (past daily) vs practice vs today's daily, medium 3-step, 3 guesses");
for (const d of DIFFICULTIES) {
  const a = winPoints({ difficulty: d, steps: 3, guesses: 3, daily: false, archive: true, streak: 9 });
  const p = winPoints({ difficulty: d, steps: 3, guesses: 3, daily: false, streak: 0 });
  const t = winPoints({ difficulty: d, steps: 3, guesses: 3, daily: true, streak: 1 });
  console.log(`  ${d.padEnd(7)} archive ${a.points}  practice ${p.points}  daily ${t.points}`);
  check(a.points === Math.round(p.points * ARCHIVE_MULTIPLIER), `${d}: archive pays ${ARCHIVE_MULTIPLIER} of a normal win`);
  check(a.points < p.points && a.points < t.points, `${d}: archive pays less than practice and the daily`);
  check(a.breakdown.reduce((x, y) => x + y.value, 0) === a.points, `${d}: archive breakdown sums to total`);
  check(!a.breakdown.some((b) => /streak/i.test(b.label)), `${d}: archive has no streak bonus`);
}
check(winPoints({ difficulty: "easy", steps: 3, guesses: 6, daily: false, archive: true, streak: 0 }).points >= 0, "archive points never negative");
check(dailyNumber(dayStart(LAUNCH_DAY)) === LAUNCH_DAY && dailyNumber(dayStart(LAUNCH_DAY) - 1) === LAUNCH_DAY - 1, "dayStart/dailyNumber agree");
check(new Date(dayStart(LAUNCH_DAY)).toISOString() === "2026-10-04T00:00:00.000Z", "launch day is 2026-10-04");

console.log(failures ? `\n${failures} check(s) failed` : "\nAll scoring checks passed");
process.exit(failures ? 1 : 0);
