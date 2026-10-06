/**
 * Shared building blocks for the puzzle templates in this folder: random picks,
 * exact-fraction formatting, small combinatorics, and the `step` constructor.
 */

import type { Rng } from "../market";
import type { Difficulty, Step, Topic } from "../types";

export type { Rng };

export const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
export const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
export const die = (rng: Rng, s: number) => 1 + Math.floor(rng() * s);
export const flip = (rng: Rng, p: number) => rng() < p;

export const NAMES = ["Alex", "Priya", "Diego", "Mei", "Omar", "Sofia", "Kenji", "Amara", "Luca", "Zoe", "Ravi", "Noor"];

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** "3/8 = 0.375" style display for exact fractions. */
export function frac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return b === 1 ? `${a}` : `${a}/${b} ≈ ${num(a / b)}`;
}

/** LaTeX stacked fraction (reduced like `frac`), for display text only. */
export function texFrac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return b === 1 ? `${a}` : `\\frac{${a}}{${b}}`;
}

/** LaTeX version of `frac`: reduced fraction plus decimal approximation. Display text only. */
export function texFracApprox(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [a, b] = [n / g, d / g];
  return b === 1 ? `${a}` : `\\frac{${a}}{${b}} \\approx ${num(a / b)}`;
}

/** Up to 4 decimals, or 4 significant figures for small numbers. */
export function num(x: number): string {
  if (Number.isInteger(x)) return x.toLocaleString("en-US");
  const abs = Math.abs(x);
  if (abs >= 1) return String(+x.toFixed(4));
  return String(+x.toPrecision(4));
}

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** A step plus an optional simulator: one random sample whose mean should equal `answer`. */
export interface GenStep extends Step {
  sim?: (rng: Rng) => number;
  /** Override the number of Monte Carlo trials for this step. */
  trials?: number;
}

export function step(
  question: string,
  answer: number,
  answerDisplay: string,
  hint: string,
  explanation: string,
  extra: { sim?: (rng: Rng) => number; tolerance?: number; trials?: number } = {},
): GenStep {
  return {
    question,
    answer,
    answerDisplay,
    hint,
    explanation,
    tolerance: extra.tolerance ?? (Number.isInteger(answer) ? 0 : 0.01),
    sim: extra.sim,
    trials: extra.trials,
  };
}

export interface Generated {
  title: string;
  category: string;
  story: string;
  steps: GenStep[];
  solution: string;
}

export interface Template {
  id: string;
  difficulty: Difficulty;
  topic: Topic;
  make: (rng: Rng) => Generated;
}

export const ind = (b: boolean) => (b ? 1 : 0);

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(rng: Rng, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** A standard normal sample (Box–Muller). */
export function normal(rng: Rng): number {
  return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
}

/** Standard normal CDF, accurate to about 1e-7 (Abramowitz & Stegun 7.1.26). */
export function Phi(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}
