import type { Difficulty, Puzzle } from "./types";

/**
 * Hand-checked puzzles. They power the Daily puzzle (same for everyone) and
 * act as the fallback for Practice when no ANTHROPIC_API_KEY is configured.
 */
export const BANK: Puzzle[] = [
  // ───────────── EASY ─────────────
  {
    id: "bank-dice-seven",
    title: "Lucky Seven",
    category: "Probability",
    difficulty: "easy",
    story: "You roll two fair six-sided dice. What is the probability that they sum to 7?",
    steps: [
      {
        question: "How many equally likely outcomes are there when rolling two distinguishable dice?",
        answer: 36,
        answerDisplay: "36",
        tolerance: 0,
        hint: "Each die has 6 faces, and the dice are independent.",
        explanation: "6 × 6 = 36 ordered outcomes.",
      },
      {
        question: "How many of those outcomes sum to 7?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0,
        hint: "Whatever the first die shows, how many values of the second die complete the 7?",
        explanation: "(1,6), (2,5), (3,4), (4,3), (5,2), (6,1): exactly one partner for each first roll.",
      },
      {
        question: "So what is P(sum = 7)?",
        answer: 1 / 6,
        answerDisplay: "1/6 ≈ 0.1667",
        tolerance: 0.01,
        hint: "Favourable over total.",
        explanation: "6 / 36 = 1/6.",
      },
    ],
    solution:
      "There are 36 equally likely ordered outcomes. For any value of the first die there's exactly one value of the second die that makes 7, giving 6 favourable outcomes, so P = 6/36 = 1/6. Fun fact: 7 is the most likely sum of two dice.",
  },
  {
    id: "bank-three-flips",
    title: "At Least One Head",
    category: "Probability",
    difficulty: "easy",
    story: "You flip a fair coin three times. What is the probability of getting at least one head?",
    steps: [
      {
        question: "How many equally likely sequences of three flips are there?",
        answer: 8,
        answerDisplay: "8",
        tolerance: 0,
        hint: "Two choices per flip.",
        explanation: "2³ = 8 sequences.",
      },
      {
        question: "What is the probability of getting no heads at all?",
        answer: 1 / 8,
        answerDisplay: "1/8 = 0.125",
        tolerance: 0.01,
        hint: "Only one sequence has zero heads.",
        explanation: "Only TTT, so 1/8.",
      },
      {
        question: "What is P(at least one head)?",
        answer: 7 / 8,
        answerDisplay: "7/8 = 0.875",
        tolerance: 0.01,
        hint: "'At least one' problems are usually easiest via the complement.",
        explanation: "1 − 1/8 = 7/8.",
      },
    ],
    solution:
      "Use the complement: the only way to get no heads is TTT, which has probability (1/2)³ = 1/8. So P(at least one head) = 1 − 1/8 = 7/8. The complement trick is a quant-interview staple.",
  },
  {
    id: "bank-die-reroll",
    title: "Roll It Back",
    category: "Expected Value",
    difficulty: "easy",
    story:
      "A game pays you the face value of one roll of a fair die, in dollars. After seeing your first roll you may choose to re-roll once, but then you must keep the second roll. With optimal play, what is the game worth?",
    steps: [
      {
        question: "What is the expected value of a single roll?",
        answer: 3.5,
        answerDisplay: "3.5",
        tolerance: 0.01,
        hint: "Average the faces 1 through 6.",
        explanation: "(1+2+3+4+5+6)/6 = 21/6 = 3.5.",
      },
      {
        question: "What is the smallest first roll you should keep rather than re-roll?",
        answer: 4,
        answerDisplay: "4",
        tolerance: 0,
        hint: "Re-rolling is worth exactly the answer to step 1. Keep anything that beats it.",
        explanation: "A re-roll is worth 3.5, so keep 4, 5 or 6 and re-roll 1, 2 or 3.",
      },
      {
        question: "What is the expected value of the game with optimal play?",
        answer: 4.25,
        answerDisplay: "4.25",
        tolerance: 0.01,
        hint: "Half the time you keep a 4, 5 or 6; the other half you get a fresh roll worth 3.5.",
        explanation: "(4+5+6)/6 + (3/6)·3.5 = 2.5 + 1.75 = 4.25.",
      },
    ],
    solution:
      "A fresh roll is worth 3.5, so keep the first roll only if it's 4 or more. EV = P(keep)·E[roll | keep] + P(re-roll)·3.5 = (1/2)(5) + (1/2)(3.5) = 4.25. This is backward induction: value the last decision first.",
  },

  // ───────────── MEDIUM ─────────────
  {
    id: "bank-hh-vs-ht",
    title: "HH vs HT",
    category: "Expected Value",
    difficulty: "medium",
    story:
      "You flip a fair coin repeatedly. On average, how many flips does it take to see two heads in a row (HH)?",
    steps: [
      {
        question: "Warm-up: what is the expected number of flips to see the first H?",
        answer: 2,
        answerDisplay: "2",
        tolerance: 0.01,
        hint: "Geometric distribution with success probability 1/2.",
        explanation: "Geometric with p = 1/2 has mean 1/p = 2.",
      },
      {
        question: "What is the expected number of flips to see the pattern HT?",
        answer: 4,
        answerDisplay: "4",
        tolerance: 0.01,
        hint: "Wait for an H. After that, any T completes the pattern, and an H doesn't set you back.",
        explanation: "Wait for H (2 flips on average), then wait for T (2 more): 4.",
      },
      {
        question: "Now the real question: expected number of flips to see HH?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0.01,
        hint: "Let E be the answer. After an H, a T sends you all the way back to the start. Set up E in terms of itself.",
        explanation:
          "E = E_H + 1 + (1/2)·E, where E_H = 2 is the wait for the first H. Solving: E/2 = 3, so E = 6.",
      },
    ],
    solution:
      "HT takes 4 flips but HH takes 6, even though both have probability 1/4 at any given position. The difference: when you're chasing HH and flip T after an H, you lose all progress. Chasing HT, an extra H keeps you right where you were. Solve E = (E_H + 1) + ½E with E_H = 2 to get E = 6.",
  },
  {
    id: "bank-two-reds",
    title: "Seeing Red",
    category: "Probability",
    difficulty: "medium",
    story:
      "You draw two cards without replacement from a well-shuffled standard 52-card deck. What is the probability that both are red?",
    steps: [
      {
        question: "What is the probability the first card is red?",
        answer: 0.5,
        answerDisplay: "1/2",
        tolerance: 0.01,
        hint: "26 of the 52 cards are red.",
        explanation: "26/52 = 1/2.",
      },
      {
        question: "Given the first card is red, what is the probability the second is red?",
        answer: 25 / 51,
        answerDisplay: "25/51 ≈ 0.4902",
        tolerance: 0.005,
        hint: "One red card is gone. How many reds, and how many cards, are left?",
        explanation: "25 reds remain among 51 cards: 25/51.",
      },
      {
        question: "What is P(both red)?",
        answer: 25 / 102,
        answerDisplay: "25/102 ≈ 0.2451",
        tolerance: 0.005,
        hint: "Chain rule: multiply the two previous answers.",
        explanation: "(1/2)·(25/51) = 25/102 ≈ 0.245.",
      },
    ],
    solution:
      "P(both red) = P(1st red)·P(2nd red | 1st red) = (26/52)(25/51) = 25/102 ≈ 0.245. That's slightly less than 1/4, because drawing without replacement makes a second red a bit less likely.",
  },
  {
    id: "bank-bayes-test",
    title: "False Alarm",
    category: "Statistics",
    difficulty: "medium",
    story:
      "A disease affects 1% of a population. A test detects it 99% of the time when present, but also returns a false positive 5% of the time for healthy people. You test positive. What is the probability you actually have the disease?",
    steps: [
      {
        question: "What is P(sick AND positive)?",
        answer: 0.0099,
        answerDisplay: "0.0099",
        tolerance: 0.01,
        hint: "P(sick) × P(positive | sick).",
        explanation: "0.01 × 0.99 = 0.0099.",
      },
      {
        question: "What is the overall P(positive)?",
        answer: 0.0594,
        answerDisplay: "0.0594",
        tolerance: 0.01,
        hint: "Add true positives and false positives: 0.99 × 0.01 + 0.05 × 0.99.",
        explanation: "0.0099 + 0.05·0.99 = 0.0099 + 0.0495 = 0.0594.",
      },
      {
        question: "What is P(sick | positive)?",
        answer: 1 / 6,
        answerDisplay: "1/6 ≈ 0.1667",
        tolerance: 0.01,
        hint: "Bayes: divide step 1 by step 2.",
        explanation: "0.0099 / 0.0594 = 1/6 ≈ 16.7%.",
      },
    ],
    solution:
      "By Bayes' rule, P(sick | +) = 0.0099 / 0.0594 = 1/6 ≈ 16.7%. Because the disease is rare, false positives from the large healthy population far outnumber true positives. Base rates matter.",
  },

  // ───────────── HARD ─────────────
  {
    id: "bank-gamblers-ruin",
    title: "Gambler's Ruin",
    category: "Markets",
    difficulty: "hard",
    story:
      "You start with $3 and repeatedly bet $1 on a coin flip, winning or losing $1 each time. You stop when you reach $10 or go broke. Explore the fair game, then a game with an edge.",
    steps: [
      {
        question: "With a fair coin, what is the probability you reach $10 before going broke?",
        answer: 0.3,
        answerDisplay: "0.3",
        tolerance: 0.01,
        hint: "A fair game is a martingale: your expected wealth at the end equals what you started with.",
        explanation: "E[final] = 10·p + 0·(1−p) = 3, so p = 3/10.",
      },
      {
        question: "With a fair coin, what is the expected number of bets until the game ends?",
        answer: 21,
        answerDisplay: "21",
        tolerance: 0.01,
        hint: "For symmetric random walk between 0 and N started at i, the expected duration is i·(N − i).",
        explanation: "3 × (10 − 3) = 21.",
      },
      {
        question:
          "Now you win each bet with probability 0.6. What is the probability you reach $10 before going broke? (4 decimals)",
        answer: (1 - Math.pow(2 / 3, 3)) / (1 - Math.pow(2 / 3, 10)),
        answerDisplay: "≈ 0.7161",
        tolerance: 0.005,
        hint: "With r = q/p, P = (1 − r^i) / (1 − r^N).",
        explanation: "r = 0.4/0.6 = 2/3. P = (1 − (2/3)³)/(1 − (2/3)¹⁰) ≈ 0.7037/0.9827 ≈ 0.7161.",
      },
    ],
    solution:
      "Fair game: wealth is a martingale, so P(win) = 3/10, and the duration is i(N−i) = 21 bets. With a 60% edge, use r = q/p = 2/3 and P = (1 − r³)/(1 − r¹⁰) ≈ 0.716. A small edge more than doubles your chances of hitting the target.",
  },
  {
    id: "bank-two-uniforms",
    title: "Two Points on a Line",
    category: "Probability",
    difficulty: "hard",
    story:
      "X and Y are independent Uniform(0,1) random variables. What is the probability they land within 1/2 of each other?",
    steps: [
      {
        question: "What is E[max(X, Y)]?",
        answer: 2 / 3,
        answerDisplay: "2/3",
        tolerance: 0.01,
        hint: "P(max ≤ t) = t², so the density of the max is 2t.",
        explanation: "∫₀¹ t·2t dt = 2/3.",
      },
      {
        question: "What is E[min(X, Y)]?",
        answer: 1 / 3,
        answerDisplay: "1/3",
        tolerance: 0.01,
        hint: "min + max = X + Y.",
        explanation: "E[min] = E[X+Y] − E[max] = 1 − 2/3 = 1/3.",
      },
      {
        question: "What is P(|X − Y| < 1/2)?",
        answer: 0.75,
        answerDisplay: "3/4",
        tolerance: 0.01,
        hint: "Draw the unit square. The region |x − y| ≥ 1/2 is two corner triangles.",
        explanation: "Each corner triangle has legs 1/2, area 1/8. Two of them: 1/4. So P = 1 − 1/4 = 3/4.",
      },
    ],
    solution:
      "Geometric probability: (X, Y) is uniform on the unit square. The points with |x − y| ≥ 1/2 form two right triangles with legs 1/2, total area 1/4. So P(|X − Y| < 1/2) = 3/4. Along the way, the max and min split [0,1] into three equal expected pieces: 1/3, 2/3.",
  },
  {
    id: "bank-coupon-dice",
    title: "Collect All Six",
    category: "Expected Value",
    difficulty: "hard",
    story: "You roll a fair die repeatedly. On average, how many rolls until you've seen every face at least once?",
    steps: [
      {
        question: "Having seen exactly 1 distinct face, what is the expected number of rolls to see a new one?",
        answer: 1.2,
        answerDisplay: "6/5 = 1.2",
        tolerance: 0.01,
        hint: "5 of the 6 faces are new. That's a geometric wait.",
        explanation: "Success probability 5/6, so the expected wait is 6/5.",
      },
      {
        question: "Having seen 5 distinct faces, what is the expected number of rolls to see the last one?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0.01,
        hint: "Only one face is new now.",
        explanation: "Success probability 1/6, so wait 6 rolls on average.",
      },
      {
        question: "What is the total expected number of rolls to see all six faces?",
        answer: 14.7,
        answerDisplay: "14.7",
        tolerance: 0.005,
        hint: "Add the geometric waits: 6/6 + 6/5 + 6/4 + 6/3 + 6/2 + 6/1.",
        explanation: "6·(1 + 1/2 + 1/3 + 1/4 + 1/5 + 1/6) = 6 × 2.45 = 14.7.",
      },
    ],
    solution:
      "Coupon collector: break the process into stages. With k faces seen, a new face appears with probability (6−k)/6, so the stage takes 6/(6−k) rolls on average. Summing: 6·H₆ = 6 × 49/20 = 14.7 rolls.",
  },

  // ───────────── EXPERT ─────────────
  {
    id: "bank-binomial-call",
    title: "Two-Step Tree",
    category: "Markets",
    difficulty: "expert",
    story:
      "A stock trades at $100. Each period it moves up ×1.2 or down ×0.9. Interest rates are zero. Price a European call with strike $100 expiring after two periods.",
    steps: [
      {
        question: "What is the risk-neutral probability of an up move?",
        answer: 1 / 3,
        answerDisplay: "1/3",
        tolerance: 0.01,
        hint: "With r = 0 the stock must be a martingale: 100 = q·120 + (1−q)·90.",
        explanation: "30q = 10, so q = 1/3.",
      },
      {
        question: "What is the call worth at the node after one up move (stock at $120)?",
        answer: 20,
        answerDisplay: "20",
        tolerance: 0.01,
        hint: "From $120 the stock goes to $144 or $108. Payoffs are 44 and 8.",
        explanation: "(1/3)·44 + (2/3)·8 = 44/3 + 16/3 = 20.",
      },
      {
        question: "What is the call worth today?",
        answer: 76 / 9,
        answerDisplay: "76/9 ≈ 8.444",
        tolerance: 0.005,
        hint: "You also need the down node ($90 → $108 or $81). Then discount one more step with q.",
        explanation: "Down node: (1/3)·8 + (2/3)·0 = 8/3. Today: (1/3)·20 + (2/3)·(8/3) = 20/3 + 16/9 = 76/9 ≈ 8.44.",
      },
    ],
    solution:
      "Risk-neutral q = 1/3 from 100 = 120q + 90(1−q). Terminal payoffs: 44 (uu), 8 (ud/du), 0 (dd). Rolling back: V_up = 20, V_down = 8/3, V_0 = (1/3)(20) + (2/3)(8/3) = 76/9 ≈ $8.44. Note the real-world probabilities never enter.",
  },
  {
    id: "bank-kelly",
    title: "Bet Like Kelly",
    category: "Markets",
    difficulty: "expert",
    story:
      "You're offered a repeated even-money bet that you win with probability 0.6. You bet a fixed fraction f of your bankroll each round. What fraction maximizes long-run growth, and how fast do you grow?",
    steps: [
      {
        question: "What is your expected profit per $1 wagered?",
        answer: 0.2,
        answerDisplay: "0.2",
        tolerance: 0.01,
        hint: "Win $1 with probability 0.6, lose $1 with probability 0.4.",
        explanation: "0.6 − 0.4 = 0.2.",
      },
      {
        question: "What fraction f maximizes E[log wealth growth] per round?",
        answer: 0.2,
        answerDisplay: "0.2 (20%)",
        tolerance: 0.01,
        hint: "Maximize g(f) = 0.6·ln(1+f) + 0.4·ln(1−f). Set g′(f) = 0.",
        explanation: "0.6/(1+f) = 0.4/(1−f) gives f = 0.6 − 0.4 = 0.2. For even-money bets, Kelly = p − q.",
      },
      {
        question: "At that fraction, what is the expected log growth rate per round? (4 decimals)",
        answer: 0.6 * Math.log(1.2) + 0.4 * Math.log(0.8),
        answerDisplay: "≈ 0.0201",
        tolerance: 0.01,
        hint: "Plug f = 0.2 into g(f) = 0.6·ln(1.2) + 0.4·ln(0.8).",
        explanation: "0.6·0.1823 + 0.4·(−0.2231) ≈ 0.1094 − 0.0893 ≈ 0.0201.",
      },
    ],
    solution:
      "Kelly maximizes g(f) = p·ln(1+f) + q·ln(1−f). For an even-money bet that gives f* = p − q = 0.2, and growth g ≈ 0.0201 per round, about 2% compounded. Bet more than 2f* = 40% and your long-run growth turns negative even with an edge.",
  },
  {
    id: "bank-uniform-sum",
    title: "Over the Line",
    category: "Probability",
    difficulty: "expert",
    story:
      "You keep drawing independent Uniform(0,1) numbers and adding them up. Let N be the number of draws needed for the running sum to exceed 1. What is E[N]?",
    steps: [
      {
        question: "What is P(U₁ + U₂ < 1)?",
        answer: 0.5,
        answerDisplay: "1/2",
        tolerance: 0.01,
        hint: "Area under the line x + y = 1 inside the unit square.",
        explanation: "A triangle with area 1/2.",
      },
      {
        question: "What is P(U₁ + U₂ + U₃ < 1)?",
        answer: 1 / 6,
        answerDisplay: "1/6",
        tolerance: 0.01,
        hint: "The volume of the corner simplex of the unit cube. In general it's 1/n!.",
        explanation: "The simplex x+y+z<1 has volume 1/3! = 1/6.",
      },
      {
        question: "What is E[N]?",
        answer: Math.E,
        answerDisplay: "e ≈ 2.718",
        tolerance: 0.005,
        hint: "E[N] = Σ P(N > n) for n ≥ 0, and N > n exactly when the first n draws sum to less than 1.",
        explanation: "E[N] = Σₙ≥₀ P(N > n) = Σₙ≥₀ 1/n! = e.",
      },
    ],
    solution:
      "P(N > n) = P(U₁ + … + Uₙ < 1) = 1/n!, the volume of a simplex. Using the tail-sum formula, E[N] = Σₙ≥₀ 1/n! = e ≈ 2.718. Euler's number shows up in a coin-free random process.",
  },
];

export function bankByDifficulty(d: Difficulty): Puzzle[] {
  return BANK.filter((p) => p.difficulty === d);
}

/** Daily puzzles cycle through the bank. Day 1 = 2026-01-01 (UTC). */
const EPOCH = Date.UTC(2026, 0, 1);

export function dailyNumber(now = Date.now()): number {
  return Math.floor((now - EPOCH) / 86_400_000) + 1;
}

export function dailyPuzzle(n: number): Puzzle {
  // Interleave difficulties so the week has variety rather than 3 easy days in a row.
  const order = [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11];
  const idx = order[((n - 1) % order.length + order.length) % order.length];
  return BANK[idx];
}
