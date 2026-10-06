import { DIFFICULTIES, TOPICS, type Difficulty, type Puzzle } from "./types";

/**
 * Hand-checked puzzles for the Daily (the same for everyone), one per topic and difficulty.
 * They're deliberately on different ideas from the Practice templates in `lib/puzzles/`,
 * so the daily is never a re-skin of something you just practised.
 */
export const BANK: Puzzle[] = [
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
        explanation: "\\(\\frac{1+2+3+4+5+6}{6} = \\frac{21}{6} = 3.5\\).",
      },
      {
        question: "What is the smallest first roll you should keep rather than re-roll?",
        answer: 4,
        answerDisplay: "4",
        tolerance: 0,
        hint: "Re-rolling is worth exactly the answer to step 1. Keep anything that beats it.",
        explanation: "A re-roll is worth \\(3.5\\), so keep 4, 5 or 6 and re-roll 1, 2 or 3.",
      },
      {
        question: "What is the expected value of the game with optimal play?",
        answer: 4.25,
        answerDisplay: "4.25",
        tolerance: 0.01,
        hint: "Half the time you keep a 4, 5 or 6; the other half you get a fresh roll worth \\(3.5\\).",
        explanation: "\\(\\frac{4+5+6}{6} + \\frac{3}{6} \\cdot 3.5 = 2.5 + 1.75 = 4.25\\).",
      },
    ],
    solution:
      "A fresh roll is worth \\(3.5\\), so keep the first roll only if it's 4 or more. \\(\\text{EV} = P(\\text{keep}) \\cdot \\mathbb{E}[\\text{roll} \\mid \\text{keep}] + P(\\text{re-roll}) \\cdot 3.5 = \\tfrac{1}{2}(5) + \\tfrac{1}{2}(3.5) = 4.25\\). This is backward induction: value the last decision first.",
  },
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
        hint: "Geometric distribution with success probability \\(\\tfrac{1}{2}\\).",
        explanation: "Geometric with \\(p = \\tfrac{1}{2}\\) has mean \\(1/p = 2\\).",
      },
      {
        question: "What is the expected number of flips to see the pattern HT?",
        answer: 4,
        answerDisplay: "4",
        tolerance: 0.01,
        hint: "Wait for an H. After that, any T completes the pattern, and an H doesn't set you back.",
        explanation: "Wait for H (2 flips on average), then wait for T (2 more): \\(4\\).",
      },
      {
        question: "Now the real question: expected number of flips to see HH?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0.01,
        hint: "Let \\(E\\) be the answer. After an H, a T sends you all the way back to the start. Set up \\(E\\) in terms of itself.",
        explanation:
          "\\(E = E_H + 1 + \\tfrac{1}{2}E\\), where \\(E_H = 2\\) is the wait for the first H. Solving: \\(E/2 = 3\\), so \\(E = 6\\).",
      },
    ],
    solution:
      "HT takes 4 flips but HH takes 6, even though both have probability \\(\\tfrac{1}{4}\\) at any given position. The difference: when you're chasing HH and flip T after an H, you lose all progress. Chasing HT, an extra H keeps you right where you were. Solve \\(E = (E_H + 1) + \\tfrac{1}{2}E\\) with \\(E_H = 2\\) to get \\(E = 6\\).",
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
        question: "What is \\(P(\\text{sick AND positive})\\)?",
        answer: 0.0099,
        answerDisplay: "0.0099",
        tolerance: 0.01,
        hint: "\\(P(\\text{sick}) \\times P(\\text{positive} \\mid \\text{sick})\\).",
        explanation: "\\(0.01 \\times 0.99 = 0.0099\\).",
      },
      {
        question: "What is the overall \\(P(\\text{positive})\\)?",
        answer: 0.0594,
        answerDisplay: "0.0594",
        tolerance: 0.01,
        hint: "Add true positives and false positives: \\(0.99 \\times 0.01 + 0.05 \\times 0.99\\).",
        explanation: "\\(0.0099 + 0.05 \\cdot 0.99 = 0.0099 + 0.0495 = 0.0594\\).",
      },
      {
        question: "What is \\(P(\\text{sick} \\mid \\text{positive})\\)?",
        answer: 1 / 6,
        answerDisplay: "1/6 ≈ 0.1667",
        tolerance: 0.01,
        hint: "Bayes: divide step 1 by step 2.",
        explanation: "\\(0.0099 / 0.0594 = \\tfrac{1}{6} \\approx 16.7\\%\\).",
      },
    ],
    solution:
      "By Bayes' rule, \\(P(\\text{sick} \\mid +) = 0.0099 / 0.0594 = \\tfrac{1}{6} \\approx 16.7\\%\\). Because the disease is rare, false positives from the large healthy population far outnumber true positives. Base rates matter.",
  },
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
        explanation: "\\(\\mathbb{E}[\\text{final}] = 10p + 0 \\cdot (1-p) = 3\\), so \\(p = \\tfrac{3}{10}\\).",
      },
      {
        question: "With a fair coin, what is the expected number of bets until the game ends?",
        answer: 21,
        answerDisplay: "21",
        tolerance: 0.01,
        hint: "For symmetric random walk between \\(0\\) and \\(N\\) started at \\(i\\), the expected duration is \\(i(N - i)\\).",
        explanation: "\\(3 \\times (10 - 3) = 21\\).",
      },
      {
        question:
          "Now you win each bet with probability \\(0.6\\). What is the probability you reach $10 before going broke? (4 decimals)",
        answer: (1 - Math.pow(2 / 3, 3)) / (1 - Math.pow(2 / 3, 10)),
        answerDisplay: "≈ 0.7161",
        tolerance: 0.005,
        hint: "With \\(r = q/p\\), \\(P = \\dfrac{1 - r^i}{1 - r^N}\\).",
        explanation: "\\(r = 0.4/0.6 = \\tfrac{2}{3}\\). \\(P = \\dfrac{1 - (2/3)^3}{1 - (2/3)^{10}} \\approx \\dfrac{0.7037}{0.9827} \\approx 0.7161\\).",
      },
    ],
    solution:
      "Fair game: wealth is a martingale, so \\(P(\\text{win}) = \\tfrac{3}{10}\\), and the duration is \\(i(N-i) = 21\\) bets. With a 60% edge, use \\(r = q/p = \\tfrac{2}{3}\\) and \\(P = \\dfrac{1 - r^3}{1 - r^{10}} \\approx 0.716\\). A small edge more than doubles your chances of hitting the target.",
  },
  {
    id: "bank-two-uniforms",
    title: "Two Points on a Line",
    category: "Probability",
    difficulty: "hard",
    story:
      "\\(X\\) and \\(Y\\) are independent \\(\\text{Uniform}(0,1)\\) random variables. What is the probability they land within \\(\\tfrac{1}{2}\\) of each other?",
    steps: [
      {
        question: "What is \\(\\mathbb{E}[\\max(X, Y)]\\)?",
        answer: 2 / 3,
        answerDisplay: "2/3",
        tolerance: 0.01,
        hint: "\\(P(\\max \\leq t) = t^2\\), so the density of the max is \\(2t\\).",
        explanation: "\\(\\int_0^1 t \\cdot 2t \\, dt = \\tfrac{2}{3}\\).",
      },
      {
        question: "What is \\(\\mathbb{E}[\\min(X, Y)]\\)?",
        answer: 1 / 3,
        answerDisplay: "1/3",
        tolerance: 0.01,
        hint: "\\(\\min + \\max = X + Y\\).",
        explanation: "\\(\\mathbb{E}[\\min] = \\mathbb{E}[X+Y] - \\mathbb{E}[\\max] = 1 - \\tfrac{2}{3} = \\tfrac{1}{3}\\).",
      },
      {
        question: "What is \\(P(|X - Y| < \\tfrac{1}{2})\\)?",
        answer: 0.75,
        answerDisplay: "3/4",
        tolerance: 0.01,
        hint: "Draw the unit square. The region \\(|x - y| \\geq \\tfrac{1}{2}\\) is two corner triangles.",
        explanation: "Each corner triangle has legs \\(\\tfrac{1}{2}\\), area \\(\\tfrac{1}{8}\\). Two of them: \\(\\tfrac{1}{4}\\). So \\(P = 1 - \\tfrac{1}{4} = \\tfrac{3}{4}\\).",
      },
    ],
    solution:
      "Geometric probability: \\((X, Y)\\) is uniform on the unit square. The points with \\(|x - y| \\geq \\tfrac{1}{2}\\) form two right triangles with legs \\(\\tfrac{1}{2}\\), total area \\(\\tfrac{1}{4}\\). So \\(P(|X - Y| < \\tfrac{1}{2}) = \\tfrac{3}{4}\\). Along the way, the max and min split \\([0,1]\\) into three equal expected pieces: \\(\\tfrac{1}{3}, \\tfrac{2}{3}\\).",
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
        explanation: "Success probability \\(\\tfrac{5}{6}\\), so the expected wait is \\(\\tfrac{6}{5}\\).",
      },
      {
        question: "Having seen 5 distinct faces, what is the expected number of rolls to see the last one?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0.01,
        hint: "Only one face is new now.",
        explanation: "Success probability \\(\\tfrac{1}{6}\\), so wait 6 rolls on average.",
      },
      {
        question: "What is the total expected number of rolls to see all six faces?",
        answer: 14.7,
        answerDisplay: "14.7",
        tolerance: 0.005,
        hint: "Add the geometric waits: \\(\\tfrac{6}{6} + \\tfrac{6}{5} + \\tfrac{6}{4} + \\tfrac{6}{3} + \\tfrac{6}{2} + \\tfrac{6}{1}\\).",
        explanation: "\\(6 \\cdot \\left(1 + \\tfrac{1}{2} + \\tfrac{1}{3} + \\tfrac{1}{4} + \\tfrac{1}{5} + \\tfrac{1}{6}\\right) = 6 \\times 2.45 = 14.7\\).",
      },
    ],
    solution:
      "Coupon collector: break the process into stages. With \\(k\\) faces seen, a new face appears with probability \\(\\tfrac{6-k}{6}\\), so the stage takes \\(\\tfrac{6}{6-k}\\) rolls on average. Summing: \\(6 \\cdot H_6 = 6 \\times \\tfrac{49}{20} = 14.7\\) rolls.",
  },
  {
    id: "bank-binomial-call",
    title: "Two-Step Tree",
    category: "Markets",
    difficulty: "expert",
    story:
      "A stock trades at $100. Each period it moves up \\(\\times 1.2\\) or down \\(\\times 0.9\\). Interest rates are zero. Price a European call with strike $100 expiring after two periods.",
    steps: [
      {
        question: "What is the risk-neutral probability of an up move?",
        answer: 1 / 3,
        answerDisplay: "1/3",
        tolerance: 0.01,
        hint: "With \\(r = 0\\) the stock must be a martingale: \\(100 = 120q + 90(1-q)\\).",
        explanation: "\\(30q = 10\\), so \\(q = \\tfrac{1}{3}\\).",
      },
      {
        question: "What is the call worth at the node after one up move (stock at $120)?",
        answer: 20,
        answerDisplay: "20",
        tolerance: 0.01,
        hint: "From $120 the stock goes to $144 or $108. Payoffs are \\(44\\) and \\(8\\).",
        explanation: "\\(\\tfrac{1}{3} \\cdot 44 + \\tfrac{2}{3} \\cdot 8 = \\tfrac{44}{3} + \\tfrac{16}{3} = 20\\).",
      },
      {
        question: "What is the call worth today?",
        answer: 76 / 9,
        answerDisplay: "76/9 ≈ 8.444",
        tolerance: 0.005,
        hint: "You also need the down node ($90 → $108 or $81). Then discount one more step with \\(q\\).",
        explanation: "Down node: \\(\\tfrac{1}{3} \\cdot 8 + \\tfrac{2}{3} \\cdot 0 = \\tfrac{8}{3}\\). Today: \\(\\tfrac{1}{3} \\cdot 20 + \\tfrac{2}{3} \\cdot \\tfrac{8}{3} = \\tfrac{20}{3} + \\tfrac{16}{9} = \\tfrac{76}{9} \\approx 8.44\\).",
      },
    ],
    solution:
      "Risk-neutral \\(q = \\tfrac{1}{3}\\) from \\(100 = 120q + 90(1-q)\\). Terminal payoffs: \\(44\\) (\\(uu\\)), \\(8\\) (\\(ud/du\\)), \\(0\\) (\\(dd\\)). Rolling back: \\(V_{\\text{up}} = 20\\), \\(V_{\\text{down}} = \\tfrac{8}{3}\\), \\(V_0 = \\tfrac{1}{3}(20) + \\tfrac{2}{3}\\left(\\tfrac{8}{3}\\right) = \\tfrac{76}{9}\\), about $8.44. Note the real-world probabilities never enter.",
  },
  {
    id: "bank-kelly",
    title: "Bet Like Kelly",
    category: "Markets",
    difficulty: "expert",
    story:
      "You're offered a repeated even-money bet that you win with probability \\(0.6\\). You bet a fixed fraction \\(f\\) of your bankroll each round. What fraction maximizes long-run growth, and how fast do you grow?",
    steps: [
      {
        question: "What is your expected profit per $1 wagered?",
        answer: 0.2,
        answerDisplay: "0.2",
        tolerance: 0.01,
        hint: "Win $1 with probability \\(0.6\\), lose $1 with probability \\(0.4\\).",
        explanation: "\\(0.6 - 0.4 = 0.2\\).",
      },
      {
        question: "What fraction \\(f\\) maximizes \\(\\mathbb{E}[\\log \\text{wealth growth}]\\) per round?",
        answer: 0.2,
        answerDisplay: "0.2 (20%)",
        tolerance: 0.01,
        hint: "Maximize \\(g(f) = 0.6 \\ln(1+f) + 0.4 \\ln(1-f)\\). Set \\(g'(f) = 0\\).",
        explanation: "\\(\\dfrac{0.6}{1+f} = \\dfrac{0.4}{1-f}\\) gives \\(f = 0.6 - 0.4 = 0.2\\). For even-money bets, Kelly \\(= p - q\\).",
      },
      {
        question: "At that fraction, what is the expected log growth rate per round? (4 decimals)",
        answer: 0.6 * Math.log(1.2) + 0.4 * Math.log(0.8),
        answerDisplay: "≈ 0.0201",
        tolerance: 0.01,
        hint: "Plug \\(f = 0.2\\) into \\(g(f) = 0.6 \\ln(1.2) + 0.4 \\ln(0.8)\\).",
        explanation: "\\(0.6 \\cdot 0.1823 + 0.4 \\cdot (-0.2231) \\approx 0.1094 - 0.0893 \\approx 0.0201\\).",
      },
    ],
    solution:
      "Kelly maximizes \\(g(f) = p \\ln(1+f) + q \\ln(1-f)\\). For an even-money bet that gives \\(f^* = p - q = 0.2\\), and growth \\(g \\approx 0.0201\\) per round, about 2% compounded. Bet more than \\(2f^* = 40\\%\\) and your long-run growth turns negative even with an edge.",
  },
  {
    id: "bank-even-product",
    title: "Even Odds",
    category: "Probability",
    difficulty: "easy",
    story: "You roll two fair six-sided dice and multiply the numbers. What is the probability the product is even?",
    steps: [
      {
        question: "What is the probability the first die shows an odd number?",
        answer: 1 / 2,
        answerDisplay: "1/2",
        tolerance: 0.01,
        hint: "Three of the six faces are odd.",
        explanation: "1, 3 and 5: \\(\\frac{3}{6} = \\frac{1}{2}\\).",
      },
      {
        question: "What is the probability the product is odd?",
        answer: 1 / 4,
        answerDisplay: "1/4",
        tolerance: 0.01,
        hint: "A product is odd only when every factor is odd.",
        explanation: "Both dice must be odd: \\(\\frac{1}{2} \\cdot \\frac{1}{2} = \\frac{1}{4}\\).",
      },
      {
        question: "What is the probability the product is even?",
        answer: 3 / 4,
        answerDisplay: "3/4",
        tolerance: 0.01,
        hint: "Complement of step 2.",
        explanation: "\\(1 - \\frac{1}{4} = \\frac{3}{4}\\).",
      },
    ],
    solution:
      "A product is even as soon as one factor is even, so count the opposite: both dice odd, \\(\\left(\\frac{1}{2}\\right)^2 = \\frac{1}{4}\\). So \\(P(\\text{even}) = \\frac{3}{4}\\). Compare the sum, which is even only half the time.",
  },
  {
    id: "bank-tuesday-boy",
    title: "Tuesday's Child",
    category: "Probability",
    difficulty: "medium",
    story:
      "A family has two children. Each child is equally likely to be a boy or a girl and to be born on any day of the week, independently. You learn that at least one of them is a boy born on a Tuesday. What is the probability both children are boys?",
    steps: [
      {
        question: "Describe one child by (sex, weekday). How many equally likely descriptions are there?",
        answer: 14,
        answerDisplay: "14",
        tolerance: 0,
        hint: "Two sexes, seven days.",
        explanation: "\\(2 \\times 7 = 14\\).",
      },
      {
        question: "Of the \\(14 \\times 14 = 196\\) ordered pairs of children, how many include at least one boy born on a Tuesday?",
        answer: 27,
        answerDisplay: "27",
        tolerance: 0,
        hint: "Count the pairs with no Tuesday boy, and subtract.",
        explanation: "Each child avoids being a Tuesday boy in 13 ways: \\(196 - 13^2 = 27\\).",
      },
      {
        question: "How many of those 27 pairs are two boys?",
        answer: 13,
        answerDisplay: "13",
        tolerance: 0,
        hint: "Same trick, restricted to boys: each boy has 7 possible days.",
        explanation: "Boy-boy pairs: \\(7^2 = 49\\); without a Tuesday boy: \\(6^2 = 36\\). So \\(49 - 36 = 13\\).",
      },
      {
        question: "What is the probability both children are boys?",
        answer: 13 / 27,
        answerDisplay: "13/27 ≈ 0.4815",
        tolerance: 0.01,
        hint: "Every pair is equally likely, so divide.",
        explanation: "\\(\\frac{13}{27} \\approx 0.4815\\).",
      },
    ],
    solution:
      "Of the 196 equally likely (sex, day) pairs, 27 contain a Tuesday boy and 13 of those are two boys, so \\(P = \\frac{13}{27}\\). That's close to \\(\\frac{1}{2}\\), not the \\(\\frac{1}{3}\\) you'd get from \"at least one boy\": the more specific the information, the less it overlaps between the two children, and the closer you get to learning about one particular child.",
  },
  {
    id: "bank-lost-boarding-pass",
    title: "The Last Seat",
    category: "Probability",
    difficulty: "expert",
    story:
      "100 passengers board a 100-seat plane one at a time, each with an assigned seat. The first has lost their boarding pass and sits in a uniformly random seat. Everyone after sits in their own seat if it's free, and otherwise picks a free seat at random. What is the probability the last passenger gets their own seat?",
    steps: [
      {
        question: "Warm-up: with just 2 passengers and 2 seats, what is the probability the second gets their own seat?",
        answer: 1 / 2,
        answerDisplay: "1/2",
        tolerance: 0.01,
        hint: "The first passenger picks one of two seats.",
        explanation: "The first takes their own seat or the second's, each with probability \\(\\frac{1}{2}\\).",
      },
      {
        question: "With 100 passengers, what is the probability passenger 2 gets their own seat?",
        answer: 99 / 100,
        answerDisplay: "99/100",
        tolerance: 0.001,
        hint: "Passenger 2 is displaced only if passenger 1 happened to take seat 2.",
        explanation: "\\(1 - \\frac{1}{100} = \\frac{99}{100}\\).",
      },
      {
        question: "What is the probability passenger 50 gets their own seat?",
        answer: 51 / 52,
        answerDisplay: "51/52 ≈ 0.9808",
        tolerance: 0.001,
        hint: "Whenever someone picks at random, the seats that matter are seat 1, seat 50, and the seats of passengers 51 to 100, which are irrelevant until later. Think about which of seat 1 or seat 50 gets taken first among the decisive picks.",
        explanation: "Each random chooser is equally likely to pick seat 1 (which ends the chain harmlessly) as any of seats 50, 51, ..., 100. Passenger 50 loses only if seat 50 is the first of those 52 seats to be taken: \\(1 - \\frac{1}{52} = \\frac{51}{52}\\).",
      },
      {
        question: "What is the probability the last passenger gets their own seat?",
        answer: 1 / 2,
        answerDisplay: "1/2",
        tolerance: 0.01,
        hint: "By the time the last passenger boards, only one seat is left. Which seats can it be?",
        explanation: "The last free seat is either seat 1 or seat 100: whichever of them a random chooser picks first decides it, and they're equally likely. So \\(\\frac{1}{2}\\).",
      },
    ],
    solution:
      "Every random chooser treats seat 1 and seat 100 symmetrically, and once either is taken the outcome is decided: taking seat 1 restores everyone else to their own seat, taking seat 100 dooms the last passenger. So the last seat is seat 1 or seat 100 with equal chance: \\(\\frac{1}{2}\\). In general passenger \\(k \\ge 2\\) of \\(n\\) gets their seat with probability \\(\\frac{n - k + 1}{n - k + 2}\\).",
  },
  {
    id: "bank-round-table",
    title: "Next to You",
    category: "Combinatorics",
    difficulty: "easy",
    story:
      "Six friends, including Ana and Ben, sit down at random around a round table with six seats. Seatings that differ only by a rotation count as the same. What is the probability Ana and Ben sit next to each other?",
    steps: [
      {
        question: "How many different seatings are there (rotations count as the same)?",
        answer: 120,
        answerDisplay: "120",
        tolerance: 0,
        hint: "Fix one person's seat to remove the rotations, then arrange the rest.",
        explanation: "\\((6 - 1)! = 5! = 120\\).",
      },
      {
        question: "In how many of them are Ana and Ben side by side?",
        answer: 48,
        answerDisplay: "48",
        tolerance: 0,
        hint: "Glue Ana and Ben into one block, seat 5 units around the table, then decide the order inside the block.",
        explanation: "\\(4! \\times 2 = 48\\).",
      },
      {
        question: "What is the probability Ana and Ben sit together?",
        answer: 2 / 5,
        answerDisplay: "2/5",
        tolerance: 0.01,
        hint: "Divide. Then check it a faster way: wherever Ana sits, where can Ben be?",
        explanation: "\\(\\frac{48}{120} = \\frac{2}{5}\\): Ben takes one of 5 other seats, 2 of which are beside Ana.",
      },
    ],
    solution:
      "Counting: \\(\\frac{4! \\cdot 2}{5!} = \\frac{2}{5}\\). The slicker way is to fix Ana's seat: Ben is equally likely to be in any of the other 5 seats, and 2 of them are next to her.",
  },
  {
    id: "bank-sock-drawer",
    title: "Sock Drawer",
    category: "Combinatorics",
    difficulty: "medium",
    story:
      "A drawer holds 5 different pairs of socks (10 socks). In the dark you grab 4 at random. What is the probability you don't get a single matching pair? And how many would you need to grab to be sure of one?",
    steps: [
      {
        question: "How many ways are there to grab 4 of the 10 socks?",
        answer: 210,
        answerDisplay: "210",
        tolerance: 0,
        hint: "Order doesn't matter.",
        explanation: "\\(\\binom{10}{4} = 210\\).",
      },
      {
        question: "How many of those contain no matching pair?",
        answer: 80,
        answerDisplay: "80",
        tolerance: 0,
        hint: "Choose which 4 pairs the socks come from, then one sock from each.",
        explanation: "\\(\\binom{5}{4} \\cdot 2^4 = 5 \\cdot 16 = 80\\).",
      },
      {
        question: "What is the probability of no matching pair?",
        answer: 8 / 21,
        answerDisplay: "8/21 ≈ 0.381",
        tolerance: 0.01,
        hint: "Divide.",
        explanation: "\\(\\frac{80}{210} = \\frac{8}{21}\\).",
      },
      {
        question: "What is the fewest socks you must grab to be certain of a matching pair?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0,
        hint: "How many socks can you hold with every one from a different pair?",
        explanation: "At most 5 socks can all come from different pairs, so the 6th must complete one (pigeonhole).",
      },
    ],
    solution:
      "A pair-free grab picks 4 of the 5 pairs and one sock from each: \\(5 \\cdot 2^4 = 80\\) of the \\(\\binom{10}{4} = 210\\) grabs, so \\(P = \\frac{8}{21} \\approx 0.381\\). With 5 pairs, 6 socks guarantee a match by the pigeonhole principle.",
  },
  {
    id: "bank-making-change",
    title: "Making Change",
    category: "Combinatorics",
    difficulty: "hard",
    story:
      "In how many ways can you make $1 (100 cents) from pennies (1¢), nickels (5¢), dimes (10¢) and quarters (25¢)? Only how many of each coin you use matters.",
    steps: [
      {
        question: "Warm-up: how many ways are there to make 25¢ from pennies, nickels and dimes?",
        answer: 12,
        answerDisplay: "12",
        tolerance: 0,
        hint: "Choose the number of dimes, then the number of nickels; pennies fill the rest.",
        explanation: "0 dimes: 6 choices of nickels; 1 dime: 4; 2 dimes: 2. Total 12.",
      },
      {
        question: "How many ways are there to make 50¢ from all four coins?",
        answer: 49,
        answerDisplay: "49",
        tolerance: 0,
        hint: "Split by the number of quarters, reusing the same counting for the rest.",
        explanation: "No quarters: \\(11 + 9 + 7 + 5 + 3 + 1 = 36\\). One quarter: 12 (step 1). Two quarters: 1. Total 49.",
      },
      {
        question: "How many ways are there to make $1?",
        answer: 242,
        answerDisplay: "242",
        tolerance: 0,
        hint: "Split by quarters (0 to 4). For each remaining amount \\(r\\), count dime and nickel choices: for \\(d\\) dimes there are \\(\\lfloor (r - 10d)/5 \\rfloor + 1\\) nickel choices.",
        explanation: "Without quarters, amounts 100, 75, 50, 25, 0 have 121, 72, 36, 12 and 1 ways. Summing over 0 to 4 quarters: \\(121 + 72 + 36 + 12 + 1 = 242\\).",
      },
    ],
    solution:
      "Count by the number of quarters. With pennies, nickels and dimes only, the remaining 100¢, 75¢, 50¢, 25¢ and 0¢ can be made in 121, 72, 36, 12 and 1 ways. Total: 242. (This is the coefficient of \\(x^{100}\\) in \\(\\frac{1}{(1 - x)(1 - x^5)(1 - x^{10})(1 - x^{25})}\\), and the classic dynamic-programming interview question.)",
  },
  {
    id: "bank-cayley-cities",
    title: "Connect the Cities",
    category: "Combinatorics",
    difficulty: "expert",
    story:
      "Five cities can be linked by roads between any two of them. A planner picks 4 of the possible roads uniformly at random. What is the probability that the roads connect all five cities?",
    steps: [
      {
        question: "How many possible roads are there?",
        answer: 10,
        answerDisplay: "10",
        tolerance: 0,
        hint: "One for each pair of cities.",
        explanation: "\\(\\binom{5}{2} = 10\\).",
      },
      {
        question: "How many ways are there to pick 4 roads?",
        answer: 210,
        answerDisplay: "210",
        tolerance: 0,
        hint: "Choose 4 of the 10.",
        explanation: "\\(\\binom{10}{4} = 210\\).",
      },
      {
        question: "How many of those sets of 4 roads connect all five cities?",
        answer: 125,
        answerDisplay: "125",
        tolerance: 0,
        hint: "4 roads joining 5 cities with no city left out can't contain a loop, so they form a tree. Cayley's formula counts labelled trees on \\(n\\) vertices.",
        explanation: "Cayley: \\(n^{n-2} = 5^3 = 125\\).",
      },
      {
        question: "What is the probability the 4 roads connect every city?",
        answer: 125 / 210,
        answerDisplay: "25/42 ≈ 0.5952",
        tolerance: 0.01,
        hint: "Divide.",
        explanation: "\\(\\frac{125}{210} = \\frac{25}{42} \\approx 0.595\\).",
      },
    ],
    solution:
      "Connecting 5 cities needs at least 4 roads, and 4 that do it form a spanning tree. By Cayley's formula there are \\(5^{3} = 125\\) labelled trees on 5 vertices, out of \\(\\binom{10}{4} = 210\\) road sets, so \\(P = \\frac{25}{42} \\approx 0.595\\).",
  },
];

export function bankByDifficulty(d: Difficulty): Puzzle[] {
  return BANK.filter((p) => p.difficulty === d);
}

export { dailyNumber } from "./day";

/**
 * Day n plays topic n mod 5 at difficulty n mod 4. Because 4 and 5 share no factor, every
 * topic meets every difficulty exactly once in each 20-day cycle, and neither repeats two days running.
 */
export function dailyPuzzle(n: number): Puzzle {
  const i = (((n - 1) % 20) + 20) % 20;
  const topic = TOPICS[i % TOPICS.length];
  const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
  return (
    BANK.find((p) => p.category === topic && p.difficulty === difficulty) ??
    bankByDifficulty(difficulty)[0] ??
    BANK[i % BANK.length]
  );
}
