import { DIFFICULTIES, TOPICS, type Difficulty, type Puzzle } from "./types";

/**
 * Hand-checked puzzles for the Daily (the same for everyone), one per topic and difficulty.
 * They're deliberately on different ideas from the Practice templates in `lib/puzzles/`,
 * so the daily is never a re-skin of something you just practised.
 */
export const BANK: Puzzle[] = [
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
  {
    id: "bank-max-two-dice",
    title: "Higher Roll",
    category: "Expected Value",
    difficulty: "easy",
    story: "You roll two fair six-sided dice and keep the higher number. What do you expect to keep?",
    steps: [
      {
        question: "What is the probability the higher die is at most 3?",
        answer: 1 / 4,
        answerDisplay: "1/4",
        tolerance: 0.01,
        hint: "The max is at most 3 exactly when both dice are.",
        explanation: "\\(\\left(\\frac{3}{6}\\right)^2 = \\frac{9}{36} = \\frac{1}{4}\\).",
      },
      {
        question: "What is the probability the higher die is a 6?",
        answer: 11 / 36,
        answerDisplay: "11/36 ≈ 0.3056",
        tolerance: 0.01,
        hint: "Complement: neither die is a 6.",
        explanation: "\\(1 - \\left(\\frac{5}{6}\\right)^2 = \\frac{11}{36}\\).",
      },
      {
        question: "What is the expected value of the higher die?",
        answer: 161 / 36,
        answerDisplay: "161/36 ≈ 4.472",
        tolerance: 0.01,
        hint: "\\(P(\\max = k) = \\frac{k^2 - (k - 1)^2}{36} = \\frac{2k - 1}{36}\\).",
        explanation: "\\(\\sum_{k=1}^{6} k \\cdot \\frac{2k - 1}{36} = \\frac{1 + 6 + 15 + 28 + 45 + 66}{36} = \\frac{161}{36}\\).",
      },
    ],
    solution:
      "\\(P(\\max \\le k) = \\left(\\frac{k}{6}\\right)^2\\), so \\(P(\\max = k) = \\frac{2k - 1}{36}\\) and \\(\\mathbb{E}[\\max] = \\frac{161}{36} \\approx 4.47\\), nearly a full pip above a single die's 3.5. The lower die averages \\(7 - 4.47 \\approx 2.53\\), since the two add up to the sum.",
  },
  {
    id: "bank-snap-stick",
    title: "Snap the Stick",
    category: "Expected Value",
    difficulty: "medium",
    story: "A 1-metre stick snaps at a uniformly random point. On average, how long are the two pieces, and how lopsided is the break?",
    steps: [
      {
        question: "What is the expected length of the shorter piece?",
        answer: 1 / 4,
        answerDisplay: "1/4",
        tolerance: 0.01,
        hint: "The shorter piece is uniform on \\([0, \\tfrac{1}{2}]\\).",
        explanation: "Its mean is \\(\\frac{1}{4}\\) metre.",
      },
      {
        question: "What is the expected length of the longer piece?",
        answer: 3 / 4,
        answerDisplay: "3/4",
        tolerance: 0.01,
        hint: "The two lengths add up to 1.",
        explanation: "\\(1 - \\frac{1}{4} = \\frac{3}{4}\\).",
      },
      {
        question: "What is the expected ratio of the shorter piece to the longer one? (4 decimals)",
        answer: 2 * Math.LN2 - 1,
        answerDisplay: "2 ln 2 − 1 ≈ 0.3863",
        tolerance: 0.005,
        hint: "Not \\(\\frac{1/4}{3/4}\\): average the ratio itself. With \\(S \\sim U(0, \\tfrac{1}{2})\\), compute \\(2\\int_0^{1/2} \\frac{s}{1 - s} \\, ds\\).",
        explanation: "\\(2\\left[-s - \\ln(1 - s)\\right]_0^{1/2} = 2\\left(\\ln 2 - \\tfrac{1}{2}\\right) = 2\\ln 2 - 1 \\approx 0.3863\\).",
      },
    ],
    solution:
      "The shorter piece \\(S\\) is uniform on \\([0, \\tfrac{1}{2}]\\), so the pieces average \\(\\frac{1}{4}\\) and \\(\\frac{3}{4}\\). But \\(\\mathbb{E}\\left[\\frac{S}{1 - S}\\right] = 2\\ln 2 - 1 \\approx 0.386\\), not \\(\\frac{1}{3}\\): the expectation of a ratio isn't the ratio of expectations.",
  },
  {
    id: "bank-ants-stick",
    title: "Ants on a Stick",
    category: "Expected Value",
    difficulty: "hard",
    story:
      "Ten ants are placed at independent uniformly random points on a 1-metre stick, each facing left or right at random. They all walk at 1 metre per minute. When two ants meet, both instantly turn around. An ant falls off when it reaches an end. On average, how long until the stick is empty?",
    steps: [
      {
        question: "A single ant sits 0.3 m from the left end, facing right. How many minutes until it falls off?",
        answer: 0.7,
        answerDisplay: "0.7",
        tolerance: 0.01,
        hint: "It walks to the right end.",
        explanation: "\\(1 - 0.3 = 0.7\\) metres at 1 m/min.",
      },
      {
        question: "Collisions only swap which ant is which: the set of positions moves as if the ants walked through each other. For one 'ghost' ant at a random spot and direction, what is the expected time to fall off?",
        answer: 1 / 2,
        answerDisplay: "1/2",
        tolerance: 0.01,
        hint: "Its distance to the end it's facing is uniform on \\([0, 1]\\).",
        explanation: "\\(\\mathbb{E}[U] = \\frac{1}{2}\\) minute.",
      },
      {
        question: "What is the probability the stick still has an ant on it after 0.9 minutes? (4 decimals)",
        answer: 1 - 0.9 ** 10,
        answerDisplay: "0.6513",
        tolerance: 0.005,
        hint: "The stick is empty by time \\(t\\) exactly when all ten ghosts have fallen off by then.",
        explanation: "\\(1 - 0.9^{10} \\approx 0.6513\\).",
      },
      {
        question: "What is the expected time until the stick is empty?",
        answer: 10 / 11,
        answerDisplay: "10/11 ≈ 0.9091",
        tolerance: 0.01,
        hint: "It's the maximum of ten independent uniform times.",
        explanation: "\\(\\mathbb{E}[\\max(U_1, \\ldots, U_{10})] = \\frac{10}{11}\\) minute.",
      },
    ],
    solution:
      "Two ants bouncing off each other look exactly like two ants walking through each other with their labels swapped. So the stick empties when the last ghost ant falls off, and each ghost's time is its distance to the end it faces, uniform on \\([0, 1]\\). The expected maximum of ten uniforms is \\(\\frac{10}{11} \\approx 0.909\\) minute.",
  },
  {
    id: "bank-even-rolls",
    title: "Only Even Rolls",
    category: "Expected Value",
    difficulty: "expert",
    story:
      "You roll a fair die until you get a 6. Given that every roll you made was even, what is the expected number of rolls?",
    steps: [
      {
        question: "Without any condition, what is the expected number of rolls until a 6?",
        answer: 6,
        answerDisplay: "6",
        tolerance: 0,
        hint: "A geometric wait with \\(p = \\frac{1}{6}\\).",
        explanation: "\\(\\frac{1}{p} = 6\\).",
      },
      {
        question: "What is the probability that every roll, up to and including the 6, is even?",
        answer: 1 / 4,
        answerDisplay: "1/4",
        tolerance: 0.01,
        hint: "Taking \\(n\\) rolls with all of them even means \\(n - 1\\) rolls of 2 or 4, then a 6.",
        explanation: "\\(\\sum_{n \\ge 1} \\left(\\frac{2}{6}\\right)^{n-1} \\frac{1}{6} = \\frac{1/6}{1 - 1/3} = \\frac{1}{4}\\).",
      },
      {
        question: "Given every roll was even, what is the probability the very first roll was the 6?",
        answer: 2 / 3,
        answerDisplay: "2/3",
        tolerance: 0.01,
        hint: "Divide \\(P(\\text{first roll is } 6)\\) by step 2.",
        explanation: "\\(\\frac{1/6}{1/4} = \\frac{2}{3}\\).",
      },
      {
        question: "Given every roll was even, what is the expected number of rolls?",
        answer: 3 / 2,
        answerDisplay: "3/2",
        tolerance: 0.01,
        hint: "Conditioned, \\(P(N = n) \\propto (1/3)^{n-1}\\): another geometric distribution.",
        explanation: "\\(P(N = n \\mid \\text{all even}) = \\frac{2}{3} \\left(\\frac{1}{3}\\right)^{n-1}\\), geometric with \\(p = \\frac{2}{3}\\), mean \\(\\frac{3}{2}\\).",
      },
    ],
    solution:
      "The tempting answer is 3 (\"just ignore the odd rolls, so it's a three-sided die\"), but that answers a different question. Conditioning on no odd rolls throws away every long sequence, since long runs are likely to contain an odd number. What's left is geometric with success probability \\(\\frac{2}{3}\\), so \\(\\mathbb{E}[N \\mid \\text{all even}] = \\frac{3}{2}\\).",
  },
  {
    id: "bank-simpson",
    title: "Simpson's Stones",
    category: "Statistics",
    difficulty: "easy",
    story:
      "A classic kidney-stone study compared two treatments. Treatment A worked for 81 of 87 patients with small stones and 192 of 263 with large stones. Treatment B worked for 234 of 270 with small stones and 55 of 80 with large stones. Which treatment is better?",
    steps: [
      {
        question: "What is A's success rate for small stones? (4 decimals)",
        answer: 81 / 87,
        answerDisplay: "0.931",
        tolerance: 0.005,
        hint: "Successes over patients.",
        explanation: "\\(\\frac{81}{87} \\approx 0.931\\), versus B's \\(\\frac{234}{270} \\approx 0.867\\).",
      },
      {
        question: "What is A's success rate for large stones? (4 decimals)",
        answer: 192 / 263,
        answerDisplay: "0.730",
        tolerance: 0.005,
        hint: "Successes over patients.",
        explanation: "\\(\\frac{192}{263} \\approx 0.730\\), versus B's \\(\\frac{55}{80} = 0.6875\\). A wins in both groups.",
      },
      {
        question: "What is A's overall success rate?",
        answer: 273 / 350,
        answerDisplay: "0.78",
        tolerance: 0.005,
        hint: "Pool both groups: total successes over total patients.",
        explanation: "\\(\\frac{81 + 192}{87 + 263} = \\frac{273}{350} = 0.78\\).",
      },
      {
        question: "What is B's overall success rate? (4 decimals)",
        answer: 289 / 350,
        answerDisplay: "0.8257",
        tolerance: 0.005,
        hint: "Pool B's groups the same way.",
        explanation: "\\(\\frac{234 + 55}{270 + 80} = \\frac{289}{350} \\approx 0.826\\): B looks better overall.",
      },
    ],
    solution:
      "A beats B for small stones (93% vs 87%) and for large stones (73% vs 69%), yet B wins overall (83% vs 78%). That's Simpson's paradox: A was given mostly to the hard, large-stone cases, and B mostly to easy ones. Stone size confounds the comparison, so the within-group numbers are the ones to trust: A is better.",
  },
  {
    id: "bank-poll-margin",
    title: "Margin of Error",
    category: "Statistics",
    difficulty: "medium",
    story:
      "A poll asks 1,000 randomly chosen voters a yes/no question, and exactly half say yes. How precise is that 50%, and how many people would you need for a tighter margin?",
    steps: [
      {
        question: "What is the standard error of the sample proportion? (4 decimals)",
        answer: Math.sqrt(0.25 / 1000),
        answerDisplay: "0.01581",
        tolerance: 0.01,
        hint: "\\(\\sqrt{\\hat p(1 - \\hat p)/n}\\).",
        explanation: "\\(\\sqrt{0.5 \\cdot 0.5 / 1000} \\approx 0.0158\\).",
      },
      {
        question: "What is the 95% margin of error? (4 decimals)",
        answer: 1.96 * Math.sqrt(0.25 / 1000),
        answerDisplay: "0.03099",
        tolerance: 0.01,
        hint: "About 1.96 standard errors either side.",
        explanation: "\\(1.96 \\times 0.0158 \\approx 0.031\\): the familiar \"±3 points\".",
      },
      {
        question: "How many voters would you need for a 95% margin of ±2 points (at 50% support)?",
        answer: 2401,
        answerDisplay: "2401",
        tolerance: 0.001,
        hint: "Solve \\(1.96\\sqrt{0.25/n} = 0.02\\) for \\(n\\).",
        explanation: "\\(n = \\left(\\frac{1.96 \\times 0.5}{0.02}\\right)^2 = 49^2 = 2401\\).",
      },
    ],
    solution:
      "The standard error is \\(\\sqrt{0.25/1000} \\approx 1.6\\) points, so the 95% margin is about ±3.1 points. Precision grows only like \\(\\sqrt{n}\\): shrinking the margin from 3 to 2 points takes 2,401 people, and halving it would take four times the sample.",
  },
  {
    id: "bank-fair-coin-test",
    title: "Is the Coin Fair?",
    category: "Statistics",
    difficulty: "hard",
    story:
      "You flip a coin 100 times and get 60 heads. Using the normal approximation, how surprising is that if the coin is fair?",
    steps: [
      {
        question: "If the coin is fair, what is the standard deviation of the number of heads?",
        answer: 5,
        answerDisplay: "5",
        tolerance: 0.01,
        hint: "Binomial variance \\(np(1 - p)\\).",
        explanation: "\\(\\sqrt{100 \\cdot 0.5 \\cdot 0.5} = 5\\).",
      },
      {
        question: "What is the z-score of 60 heads?",
        answer: 2,
        answerDisplay: "2",
        tolerance: 0.01,
        hint: "(observed − expected) / SD.",
        explanation: "\\(\\frac{60 - 50}{5} = 2\\).",
      },
      {
        question: "What is the two-sided p-value from the normal approximation? (4 decimals)",
        answer: 0.0455,
        answerDisplay: "0.0455",
        tolerance: 0.02,
        hint: "\\(2(1 - \\Phi(z))\\).",
        explanation: "\\(2(1 - \\Phi(2)) \\approx 2 \\times 0.02275 = 0.0455\\): just under 5%.",
      },
      {
        question: "With a continuity correction (use 59.5 heads), what is the two-sided p-value? (4 decimals)",
        answer: 0.0574,
        answerDisplay: "0.0574",
        tolerance: 0.02,
        hint: "The count is discrete; \"60 or more\" covers the area from 59.5 up.",
        explanation: "\\(z = \\frac{59.5 - 50}{5} = 1.9\\), and \\(2(1 - \\Phi(1.9)) \\approx 0.0574\\). The exact binomial answer is about 0.057.",
      },
    ],
    solution:
      "Under a fair coin, heads ~ \\(N(50, 5^2)\\) approximately, so 60 heads is \\(z = 2\\) and a two-sided p-value of about 0.046. But the continuity correction (z = 1.9) gives 0.057, much closer to the exact 0.057: the verdict \"significant at 5%\" hinges on an approximation detail, which is a good reason not to treat 0.05 as a bright line.",
  },
  {
    id: "bank-bessel",
    title: "Bessel's Correction",
    category: "Statistics",
    difficulty: "expert",
    story:
      "You roll three fair dice and estimate the variance of a die from them. Why do statisticians divide by \\(n - 1\\) rather than \\(n\\)?",
    steps: [
      {
        question: "What is the true variance \\(\\sigma^2\\) of one die roll? (4 decimals)",
        answer: 35 / 12,
        answerDisplay: "35/12 ≈ 2.9167",
        tolerance: 0.01,
        hint: "\\(\\mathbb{E}[X^2] - \\mathbb{E}[X]^2 = \\frac{91}{6} - \\frac{49}{4}\\).",
        explanation: "\\(\\frac{91}{6} - \\frac{49}{4} = \\frac{35}{12}\\).",
      },
      {
        question: "If you knew the true mean 3.5, what is \\(\\mathbb{E}\\left[\\frac{1}{3}\\sum_i (X_i - 3.5)^2\\right]\\)? (4 decimals)",
        answer: 35 / 12,
        answerDisplay: "35/12 ≈ 2.9167",
        tolerance: 0.01,
        hint: "Each term has expectation \\(\\sigma^2\\).",
        explanation: "\\(\\frac{1}{3} \\cdot 3\\sigma^2 = \\sigma^2 = \\frac{35}{12}\\): unbiased.",
      },
      {
        question: "Using the sample mean \\(\\bar X\\) instead, what is \\(\\mathbb{E}\\left[\\frac{1}{3}\\sum_i (X_i - \\bar X)^2\\right]\\)? (4 decimals)",
        answer: 35 / 18,
        answerDisplay: "35/18 ≈ 1.9444",
        tolerance: 0.01,
        hint: "\\(\\sum (X_i - \\bar X)^2 = \\sum (X_i - \\mu)^2 - n(\\bar X - \\mu)^2\\), and \\(\\operatorname{Var}(\\bar X) = \\sigma^2/n\\).",
        explanation: "\\(\\frac{1}{3}\\left(3\\sigma^2 - \\sigma^2\\right) = \\frac{2}{3}\\sigma^2 = \\frac{35}{18}\\).",
      },
      {
        question: "What factor must you multiply that estimate by to make it unbiased?",
        answer: 3 / 2,
        answerDisplay: "3/2",
        tolerance: 0.01,
        hint: "Undo the \\(\\frac{n - 1}{n}\\).",
        explanation: "\\(\\frac{n}{n - 1} = \\frac{3}{2}\\): divide by \\(n - 1 = 2\\) instead of 3.",
      },
    ],
    solution:
      "The sample mean is fitted to the data, so deviations from it are smaller than deviations from the true mean: \\(\\mathbb{E}\\left[\\sum (X_i - \\bar X)^2\\right] = (n - 1)\\sigma^2\\). Dividing by \\(n\\) underestimates \\(\\sigma^2 = \\frac{35}{12}\\) as \\(\\frac{35}{18}\\); dividing by \\(n - 1\\) fixes it. One degree of freedom was spent estimating the mean.",
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
