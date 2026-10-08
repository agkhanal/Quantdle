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
| **Daily** | One hand-checked puzzle per day, the same for everyone. Rotates through every topic at every difficulty over 20 days. | One market per day, the same for everyone. Difficulty rotates daily. Can't be skipped, and progress survives a refresh. |
| **Practice** | Endless generated puzzles, Easy to Expert. Pick a topic (Probability, Combinatorics, Expected Value, Statistics, Markets) or a mix. Skip any you don't like. | Endless generated markets, Easy to Expert. Skip any you don't like. |

**Market making:** a contract settles on some hidden dice or coins (sum of dice, product, highest, range, heads squared, ...). Each round you quote a bid and an ask, counterparties trade with you, and one draw is revealed. Finish with the best P&L. Each round's tile is green/yellow/grey by how close your mid was to fair value.

Who trades with you: a **sharp** trader who has peeked at the next draw (adverse selection), an **arb** who trades against any mispricing, and **noise** traders who pay your spread, more often when your market is tight.

Markets are procedural too: contract families with random parameters, grouped by difficulty. The daily market draws from its own set of 12 families (medians, streaks, matches, ...), separate from the 18 practice families, so the daily is never a contract you just practised. Harder levels have trickier payoffs (products, squares, order statistics) and narrower markets relative to the contract's volatility. Fair value is computed exactly by enumerating every outcome.

### Past dailies (the archive)

The **Past dailies** button on the Daily tab lists every daily since launch (#277, 2026-10-04), newest first, for both the puzzle and the market game. Pick one to replay it: your progress on each day is saved separately, so you can start one and come back, and each row shows whether you solved it, lost it, are partway through, or haven't touched it. For puzzles the result comes from your account, so it follows you across devices; markets are kept in the browser.

A past daily pays **half points** (rounded), never counts toward the streak, and a lost one never resets it. Its points share the 100-a-day cap with practice, so the archive can't be farmed. A puzzle can only score once, so one you already won on its day pays nothing again. Days outside the archive (before launch, or still in the future) are refused by `/api/puzzle?mode=daily&day=N`. `LAUNCH_DAY` in `lib/day.ts` sets where the archive starts.

## Your stats

The chart button opens your win record and guess distribution, and links to **`/stats`**: a page of donut charts showing which topics you solve and which you miss, with each puzzle topic and the market game ranked by win rate. Your strongest topic and the one that needs work are labelled, and every row has a **Practice →** link that opens practice on that topic. Filter by Daily or Practice.

A puzzle counts as solved when every step is cracked within six guesses, and its misses are wrong guesses. A market counts as won when it finishes in profit, and its misses are rounds where your mid wasn't close to fair. Results are kept in your browser (`lib/history.ts`), so the page works signed out and covers the market game too.

## Procedural puzzles

Practice puzzles come from 60 templates in `lib/puzzles/`, one file per topic, with at least three different problems for every topic at every level: from anagrams, z-scores and fair odds up to Penney's game, Burnside's lemma, regression dilution and Glosten–Milgrom spreads. Each template is a distinct idea, not a re-skin of another, picks random parameters and computes every answer exactly.

The Daily uses a separate bank of 20 hand-written puzzles in `lib/bank.ts`, one per topic and difficulty, on ideas the practice templates never use (the Tuesday-boy problem, the lost boarding pass, Simpson's paradox, Cayley's formula, ...). `verify-generators.ts` checks the coverage and that no daily puzzle duplicates a practice one.

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
- **Past daily (archive):** half of a normal win, no streak bonus, and it never affects the streak.
- **Practice and archive:** capped at 100 points per UTC day combined (wins still count).
- **Streak:** consecutive daily puzzles won. A missed day or a lost daily resets it.

All of this lives in `lib/scoring.ts` (pure functions; `npx tsx scripts/verify-scoring.ts` prints the points table and checks the rules). Days reset at 00:00 UTC and weeks start Monday.

**Leaderboards** rank players, and schools (the sum of their players' points), by points for today, this week, and all time. Schools come from [Hipo's university-domains-list](https://github.com/Hipo/university-domains-list) (MIT licensed, trimmed into `lib/schools-data.json`); logos are fetched from Google's favicon service by the server and cached. If a player changes school, their points move with them: their score for today, this week and all time leaves the old school's total and joins the new one's (a school left with nothing drops off the board). A one-time repair (`lib/migrations.ts`, run at server start from `instrumentation.ts`) fixed school totals from changes made before that rule existed; it runs once per database.

Passwords are hashed with scrypt; sessions are signed cookies. Profile pictures are shrunk to a 192px JPEG in the browser, checked server-side (JPEG/PNG/WebP only, 80 KB max) and served with `nosniff`.

Everything is stored in Upstash Redis. Without it, an in-memory store is used, which is fine locally but resets on restart and doesn't work reliably on Vercel.

## Global chat

A chat button sits bottom right; everyone can read, signed-in players can write (280 characters, rate-limited, no repeats). Messages are an ordered log in the store (`lib/chat.ts`), polled every few seconds while the panel is open and cached for two seconds at the edge, so many readers cost the database very little.

- **Reactions:** four icon reactions (like, love, funny, fire). Hover a message (or tap, on a phone) for the add-reaction button; click a chip to give or take back your reaction. They update live for everyone with the chat open.
- **@mentions:** type `@` and pick a player from the suggestions. Only real accounts become mentions: they show as links to the player's profile, the message is highlighted for the person mentioned, and a badge with a count appears on the chat button while the chat is closed (a tiny private check every 45 seconds while the tab is visible).
- **Moderation (admins):** each message has **mute** and **delete**. Mute opens a menu of 10 minutes, 1 hour, 1 day or a permanent **Ban**, and offers **Unmute** for someone already muted. Muted players can't post or react and are told how long is left. Admins can't be muted, and every action is in the activity log.

## Analytics

With `NEXT_PUBLIC_POSTHOG_KEY` set, the site reports to [PostHog](https://posthog.com): pageviews, live visitors, session replays and game events. Signed-in players are identified by username (with their points and admin flag), so you can look someone up and watch their games. Everything is viewed in the PostHog dashboard, not in the app.

Events go through `/ingest` on the site's own domain (rewritten to PostHog in `next.config.ts`) so ad blockers don't drop them. Replays show what players type into the game, but password fields are always masked.

| Event | Properties |
| --- | --- |
| `puzzle_started` | `mode`, `topic`, `difficulty`, `puzzle_id`, `daily_number` |
| `puzzle_guess` | `mode`, `step`, `verdict`, `judged_by`, `attempt`, `showed_work` (never the answer itself) |
| `puzzle_hint` | `mode`, `step` |
| `puzzle_skipped` | `topic`, `difficulty`, `puzzle_id`, `attempts` |
| `puzzle_completed` | `mode`, `won`, `topic`, `difficulty`, `puzzle_id`, `guesses`, `hints`, `steps_solved` |
| `market_started` | `mode`, `difficulty`, `contract`, `daily_number`, `resumed_at_round` |
| `market_round` | `mode`, `difficulty`, `round`, `verdict` |
| `market_skipped` | `difficulty`, `contract`, `round` |
| `market_completed` | `mode`, `difficulty`, `contract`, `won`, `pnl`, `rounds` |
| `tab_switched` | `mode`, `track` |
| `result_shared` | `game`, `mode` |

Session replay itself is switched on in the PostHog project settings (Session replay → Record user sessions). The helpers live in `lib/analytics.ts` and the setup in `app/providers.tsx`.

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
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional. Turns on PostHog analytics (see [Analytics](#analytics)). Off when unset. |

## Project layout

```
app/
  page.tsx                   UI entry
  stats/page.tsx             Your stats: topic breakdown charts
  api/puzzle/route.ts        GET a daily or practice puzzle, optionally by ?topic= (returns public view + sealed token)
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
components/StatsPage.tsx     The /stats page: solved and missed problems by topic
components/DonutChart.tsx    Ring chart used on the stats page
lib/generators.ts            Picks and verifies practice puzzles (Monte Carlo checks)
lib/puzzles/                 Practice puzzle templates, one file per topic, plus shared helpers (kit.ts)
lib/history.ts               Local log of finished games and per-topic summaries
lib/bank.ts                  Hand-checked puzzles for the Daily (server only)
lib/day.ts                   Daily numbering, safe to use in the browser
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

---

Have fun, and try guessing the name of a certain yellow friend. 👀