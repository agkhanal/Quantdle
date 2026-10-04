# Quantdle

Wordle for quant interview prep. Every puzzle is a quant problem split into **steps** that build to a final answer, and you get **6 guesses** for the whole thing.

- 🟩 **Green**: correct. The step's explanation appears and the next step unlocks.
- 🟨 **Yellow**: close (within ~15%), or the AI judge sees the right idea in your work.
- ⬛ **Grey**: off track. An arrow (↑/↓) tells you which way to go.
- 💡 **Hint**: costs one guess.

Answers can be typed in any form: `0.25`, `1/4`, `25%`, `1-(5/6)^4`, `C(52,5)`, `e`, `sqrt(2)/2`.

## Modes

- **Daily**: one puzzle per day, the same for everyone, taken from a hand-checked bank. Progress survives a refresh.
- **Practice**: endless puzzles from Easy to Expert, built by the procedural generator (below). Skip any you don't like.
- **Markets**: a market-making game. A contract settles on some dice (sum of 3 dice, product of 2, highest of 3, ...). Each round you quote a bid and an ask, counterparties trade with you, and one die is revealed. Finish with the best P&L. Each round's tile is green/yellow/grey by how close your mid was to fair value. Skip to a new market any time.

  Who trades with you: a **sharp** trader who has peeked at the next die (adverse selection), an **arb** who trades against any mispricing, and **noise** traders who pay your spread, more often when your market is tight.

## Procedural puzzles

Practice puzzles come from 18 templates in `lib/generators.ts` (dice, cards, Bayes, coupon collector, gambler's ruin, optimal stopping, derangements, binomial option pricing, Kelly betting, the ballot problem, ...). Each template picks random parameters and computes every answer exactly.

Every random quantity also has a simulator. Before a puzzle is served, it's simulated thousands of times (Monte Carlo) and thrown away if any exact answer falls outside 5 standard errors of the simulation. To stress-test all templates across many seeds:

```bash
npx tsx scripts/verify-generators.ts        # 60 seeds per template
npx tsx scripts/verify-generators.ts 300    # more
```

No AI needed. If you'd rather have Claude write Practice puzzles, set `QUANTDLE_AI_PUZZLES=1` along with `ANTHROPIC_API_KEY`.

## Accounts and leaderboard

Players can create an account (username + password, no email) and climb a leaderboard of **most problems solved**. A puzzle earns a point when its steps are solved in order within 6 guesses, and each puzzle counts once. Passwords are hashed with scrypt; sessions are signed cookies.

Scores are stored in Upstash Redis. Without it, an in-memory store is used, which is fine locally but resets on restart and doesn't work reliably on Vercel.

## How the judging works

1. **Numbers first.** Every step has a single numeric answer. The server parses your expression and checks it against the answer and tolerance. A match is green with no AI call.
2. **AI judge for misses (optional).** With `ANTHROPIC_API_KEY` set, Claude reads the step, your number, your earlier tries, and any "Show your work" reasoning. It can raise a grey to a yellow if your approach is right, and writes a short hint that doesn't give the answer away. It can never award a green.
3. **Answers stay on the server.** Puzzles are encrypted (AES-256-GCM) into an opaque token, so the browser never sees an answer until the game is over.

## Running locally

```bash
npm install
cp .env.example .env.local   # everything in it is optional locally
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `QUANTDLE_SECRET` | Encrypts puzzle tokens and signs login sessions. Set it in production. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Leaderboard and accounts database. On Vercel, add Upstash Redis from the Storage tab and these are set for you (`KV_REST_API_URL`/`KV_REST_API_TOKEN` also work). |
| `ANTHROPIC_API_KEY` | Optional. Turns on the AI judge. |
| `QUANTDLE_AI_PUZZLES` | Optional. `1` makes Claude write Practice puzzles instead of the generator. |

## Project layout

```
app/
  page.tsx                   UI entry
  api/puzzle/route.ts        GET a daily or practice puzzle (returns public view + sealed token)
  api/guess/route.ts         POST a guess -> verdict, direction, feedback; credits leaderboard solves
  api/reveal/route.ts        POST at game end -> full worked solution
  api/auth/route.ts          Sign up, sign in, sign out, who am I
  api/leaderboard/route.ts   Top solvers
components/Game.tsx          The game: board, step chain, input, modals, stats
components/MarketGame.tsx    The Markets tab
components/Account.tsx       Sign-in form and leaderboard panels
lib/generators.ts            Procedural puzzle templates + Monte Carlo checks
lib/bank.ts                  Hand-checked puzzles for the Daily
lib/market.ts                Market-making game: contracts, fair value, counterparties, P&L
lib/auth.ts                  Password hashing and session cookies
lib/store.ts                 Upstash Redis client with an in-memory fallback
lib/ai.ts                    Optional Claude judge and puzzle writer
lib/math.ts                  Safe expression parser for answers
lib/token.ts                 Encrypt/decrypt puzzle tokens
scripts/verify-generators.ts Stress-test every template
```

Built with Next.js. Deploys to Vercel as-is.