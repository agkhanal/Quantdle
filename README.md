# Quantdle

Wordle for quant interview prep. Every puzzle is a quant problem split into **steps** that build to a final answer, and you get **6 guesses** for the whole thing.

- 🟩 **Green**: correct. The step's explanation appears and the next step unlocks.
- 🟨 **Yellow**: close (within ~15%), or the AI judge sees the right idea in your work.
- ⬛ **Grey**: off track. An arrow (↑/↓) tells you which way to go.
- 💡 **Hint**: costs one guess.

Answers can be typed in any form: `0.25`, `1/4`, `25%`, `1-(5/6)^4`, `C(52,5)`, `e`, `sqrt(2)/2`.

## Modes

Two tabs, each with two games:

| | 🎲 Puzzle / Probability | 📈 Market making |
| --- | --- | --- |
| **Daily** | One hand-checked puzzle per day, the same for everyone. | One market per day, the same for everyone. Difficulty rotates daily. Can't be skipped, and progress survives a refresh. |
| **Practice** | Endless generated puzzles, Easy to Expert. Skip any you don't like. | Endless generated markets, Easy to Expert. Skip any you don't like. |

**Market making:** a contract settles on some hidden dice or coins (sum of dice, product, highest, range, heads squared, ...). Each round you quote a bid and an ask, counterparties trade with you, and one draw is revealed. Finish with the best P&L. Each round's tile is green/yellow/grey by how close your mid was to fair value.

Who trades with you: a **sharp** trader who has peeked at the next draw (adverse selection), an **arb** who trades against any mispricing, and **noise** traders who pay your spread, more often when your market is tight.

Markets are procedural too: 18 contract families with random parameters, grouped by difficulty. Harder levels have trickier payoffs (products, squares, order statistics) and narrower markets relative to the contract's volatility. Fair value is computed exactly by enumerating every outcome.

## Procedural puzzles

Practice puzzles come from 18 templates in `lib/generators.ts` (dice, cards, Bayes, coupon collector, gambler's ruin, optimal stopping, derangements, binomial option pricing, Kelly betting, the ballot problem, ...). Each template picks random parameters and computes every answer exactly.

Every random quantity also has a simulator. Before a puzzle is served, it's simulated thousands of times (Monte Carlo) and thrown away if any exact answer falls outside 5 standard errors of the simulation. To stress-test all templates across many seeds:

```bash
npx tsx scripts/verify-generators.ts        # puzzles: 60 seeds per template
npx tsx scripts/verify-markets.ts           # markets: fair values vs simulation, and game balance
```

`verify-markets.ts` also plays thousands of markets with simple strategies, to check that quoting around fair value makes money on average at every difficulty and mispricing loses it.

No AI needed. If you'd rather have Claude write Practice puzzles, set `QUANTDLE_AI_PUZZLES=1` along with `ANTHROPIC_API_KEY`.

## Accounts, points and leaderboards

Players sign in with a username and password (no email) or with Google. Signed-in players get a profile with points, games won and a daily streak, an optional photo, school and LinkedIn link.

**Points** (for puzzles solved in order within 6 guesses; a hint costs a guess; each puzzle scores once):

| | Easy | Medium | Hard | Expert |
| --- | --- | --- | --- | --- |
| Base points | 10 | 20 | 35 | 50 |

- **Efficiency:** the base is multiplied from 1.0 (every guess was a step answer) down to 0.5 (all six guesses used).
- **Daily puzzle:** worth double, plus +2 per day of streak (up to +20).
- **Practice:** capped at 100 points per UTC day (wins still count).
- **Streak:** consecutive daily puzzles won. A missed day or a lost daily resets it.

All of this lives in `lib/scoring.ts` (pure functions; `npx tsx scripts/verify-scoring.ts` prints the points table and checks the rules). Days reset at 00:00 UTC and weeks start Monday.

**Leaderboards** rank players, and schools (the sum of their players' points), by points for today, this week, and all time. Schools come from [Hipo's university-domains-list](https://github.com/Hipo/university-domains-list) (MIT licensed, trimmed into `lib/schools-data.json`); logos are fetched from Google's favicon service by the server and cached.

Passwords are hashed with scrypt; sessions are signed cookies. Profile pictures are shrunk to a 192px JPEG in the browser, checked server-side (JPEG/PNG/WebP only, 80 KB max) and served with `nosniff`.

Everything is stored in Upstash Redis. Without it, an in-memory store is used, which is fine locally but resets on restart and doesn't work reliably on Vercel.

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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional. Turns on "Continue with Google". Add `<your origin>/api/auth/google/callback` as an authorized redirect URI in the Google Cloud console. `GOOGLE_REDIRECT_URI` overrides the inferred callback URL. Only the `openid profile` scopes are requested, and only the Google account ID is stored (no email or name). |
| `QUANTDLE_ADMIN_SECRET` | Optional. Turns on `POST /api/admin/points` (`{ "username", "points", "reason" }` with `Authorization: Bearer <secret>`) so an owner can add or remove points; every adjustment is logged in the database. Off when unset. |
| `ANTHROPIC_API_KEY` | Optional. Turns on the AI judge. |
| `QUANTDLE_AI_PUZZLES` | Optional. `1` makes Claude write Practice puzzles instead of the generator. |

## Project layout

```
app/
  page.tsx                   UI entry
  api/puzzle/route.ts        GET a daily or practice puzzle (returns public view + sealed token)
  api/guess/route.ts         POST a guess -> verdict, direction, feedback; scores wins and losses (points, streak)
  api/reveal/route.ts        POST at game end -> full worked solution
  api/auth/route.ts          Sign up, sign in, sign out, who am I
  api/auth/google/           Sign in with Google (redirect + callback)
  api/hint/route.ts          POST a hint request (costs a guess for signed-in players)
  api/profile/route.ts       GET a public profile, POST edits to your own (school, LinkedIn)
  api/avatar/                Upload, remove and serve profile pictures
  api/schools/, school-logo/ School search and cached logos
  api/leaderboard/route.ts   Players and schools boards (daily / weekly / all time)
components/Game.tsx          The game: board, step chain, input, modals, stats
components/MarketGame.tsx    The market-making game (daily and practice)
components/Account.tsx       Sign-in form
components/Profile.tsx       Your profile and public profiles
components/Leaderboard.tsx   Players / schools leaderboard panel
lib/generators.ts            Procedural puzzle templates + Monte Carlo checks
lib/bank.ts                  Hand-checked puzzles for the Daily
lib/market.ts                Market contract generator, fair value, counterparties, P&L
lib/auth.ts                  Password hashing and session cookies
lib/scoring.ts               Points and UTC day/week helpers
lib/profile.ts               Profiles, awards, leaderboards
lib/store.ts                 Upstash Redis client with an in-memory fallback
lib/ai.ts                    Optional Claude judge and puzzle writer
lib/math.ts                  Safe expression parser for answers
lib/token.ts                 Encrypt/decrypt puzzle tokens
scripts/verify-generators.ts Stress-test every puzzle template
scripts/verify-markets.ts    Check market fair values and game balance
```

Built with Next.js. Deploys to Vercel as-is.
Have fun, and try guessing the name of a certain yellow friend. 👀
