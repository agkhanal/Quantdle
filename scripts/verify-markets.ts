/**
 * Check the market-making generator:
 *  1. Exact fair values (by enumeration) agree with Monte Carlo simulation.
 *  2. The game is fair to good play: quoting around fair value makes money on average,
 *     and quoting off-centre loses it, at every difficulty.
 *
 *   npx tsx scripts/verify-markets.ts          # 400 markets per difficulty
 *   npx tsx scripts/verify-markets.ts 2000
 */
import { familyIds, fairValue, isOver, mulberry32, newMarket, playRound, revealedDraws, book, sampleDraws, type MarketGameState } from "../lib/market";
import { DIFFICULTIES } from "../lib/types";

const N = Number(process.argv[2] ?? 400);
let failures = 0;

type Strategy = (fair: number, sd: number, maxWidth: number) => [number, number];
const STRATEGIES: Record<string, Strategy> = {
  "fair, max width": (f, _sd, w) => [f - w / 2, f + w / 2],
  "fair, half width": (f, _sd, w) => [f - w / 4, f + w / 4],
  "off by 1 sd": (f, sd, w) => [f + sd - w / 2, f + sd + w / 2],
};

for (const d of DIFFICULTIES) {
  const families = new Map<string, number>();
  const pnl: Record<string, number[]> = Object.fromEntries(Object.keys(STRATEGIES).map((k) => [k, []]));

  for (let seed = 1; seed <= N; seed++) {
    const start = newMarket(seed * 104_729, d);
    const c = start.contract;
    families.set(c.family, (families.get(c.family) ?? 0) + 1);

    // 1. Monte Carlo check of the opening fair value (first 40 markets per difficulty).
    if (seed <= 40) {
      const { mean, sd } = fairValue(c, []);
      const rng = mulberry32(seed);
      const T = 40_000;
      let s = 0;
      for (let t = 0; t < T; t++) s += c.settle(sampleDraws(c, rng));
      const z = Math.abs(s / T - mean) / (sd / Math.sqrt(T) || 1e-12);
      if (z > 5) {
        failures++;
        console.log(`  ✗ ${d} ${c.name}: exact ${mean}, simulated ${(s / T).toFixed(4)} (z = ${z.toFixed(1)})`);
      }
    }

    // 2. Play the same market with each strategy.
    for (const [name, strat] of Object.entries(STRATEGIES)) {
      let g: MarketGameState = start;
      while (!isOver(g)) {
        const { mean, sd } = fairValue(c, revealedDraws(g));
        const [b, a] = strat(mean, sd, c.maxWidth);
        g = playRound(g, b, a);
      }
      pnl[name].push(book(g).pnl!);
    }
  }

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const fam = [...families.entries()].map(([k, v]) => `${k}×${v}`).join(" ");
  console.log(`\n${d.toUpperCase()}  (${fam})`);
  for (const [name, xs] of Object.entries(pnl)) {
    const wins = xs.filter((x) => x > 0).length / xs.length;
    console.log(`  ${name.padEnd(17)} avg P&L ${avg(xs).toFixed(2).padStart(7)}   profitable ${(wins * 100).toFixed(0)}%`);
  }
  if (avg(pnl["fair, max width"]) <= 0) {
    failures++;
    console.log(`  ✗ quoting around fair value should be profitable on ${d}`);
  }
  if (avg(pnl["off by 1 sd"]) >= avg(pnl["fair, max width"])) {
    failures++;
    console.log(`  ✗ mispricing should cost money on ${d}`);
  }
}

// The daily market has its own contracts: none may also appear in practice.
const practice = new Set(familyIds("practice"));
for (const f of familyIds("daily")) {
  if (practice.has(f)) {
    console.log(`  ✗ contract family "${f}" is in both the daily and practice pools`);
    failures++;
  }
}

console.log(failures ? `\n${failures} problem(s) found.` : `\nAll checks passed.`);
process.exit(failures ? 1 : 0);