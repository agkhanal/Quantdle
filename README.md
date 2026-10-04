# Quantdle

Wordle for quant interview prep. Every puzzle is a quant problem split into **steps** that build to a final answer, and you get **6 guesses** for the whole thing.

- 🟩 **Green**: correct. The step's explanation appears and the next step unlocks.
- 🟨 **Yellow**: close (within ~15%), or the AI judge sees the right idea in your work.
- ⬛ **Grey**: off track. An arrow (↑/↓) tells you which way to go.
- 💡 **Hint**: costs one guess.

Answers can be typed in any form: `0.25`, `1/4`, `25%`, `1-(5/6)^4`, `C(52,5)`, `e`, `sqrt(2)/2`.

## Modes

- **Daily**: one puzzle per day, the same for everyone, taken from a hand-checked bank. Progress survives a refresh.
- **Practice**: pick Easy / Medium / Hard / Expert and get a fresh puzzle written by Claude. Without an API key it falls back to the built-in bank.
- **Markets**: a market-making game. A contract settles on some dice (sum of 3 dice, product of 2, highest of 3, ...). Each round you quote a bid and an ask, counterparties trade with you, and one die is revealed. Finish with the best P&L. Each round's tile is green/yellow/grey by how close your mid was to fair value. Runs entirely in the browser, no API key needed.

  Who trades with you: a **sharp** trader who has peeked at the next die (adverse selection), an **arb** who trades against any mispricing, and **noise** traders who pay your spread, more often when your market is tight.

## How the judging works

1. **Numbers first.** Every step has a single numeric answer. The server parses your expression and checks it against the answer and tolerance. A match is green with no AI call.
2. **AI judge for misses.** On a miss, Claude reads the step, your number, your earlier tries, and any "Show your work" reasoning. It can raise a grey to a yellow if your approach is right (an arithmetic slip, forgetting the complement, a factor of 2), and writes a short hint that doesn't give the answer away. It can never award a green.
3. **Answers stay on the server.** Puzzles are encrypted (AES-256-GCM) into an opaque token, so the browser never sees an answer until the game is over.

## Running locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Turns on AI puzzle generation and AI judging. Optional: without it the app uses the puzzle bank and rule-based judging. |
| `QUANTDLE_SECRET` | Key for encrypting puzzle tokens. Set it in production so tokens survive restarts and work across instances. |

## Project layout

```
app/
  page.tsx                   UI entry
  api/puzzle/route.ts        GET a daily or practice puzzle (returns public view + sealed token)
  api/guess/route.ts         POST a guess -> verdict, direction, feedback
  api/reveal/route.ts        POST at game end -> full worked solution
components/Game.tsx          The game: board, step chain, input, modals, stats
components/MarketGame.tsx    The Markets tab UI
lib/ai.ts                    Claude puzzle generator + judge (structured outputs)
lib/bank.ts                  Hand-checked puzzles (Daily + offline fallback)
lib/market.ts                Market-making game: contracts, fair value, counterparties, P&L
lib/math.ts                  Safe expression parser for answers
lib/token.ts                 Encrypt/decrypt puzzle tokens
```

Built with Next.js and the Anthropic TypeScript SDK (`claude-opus-5-5`). Deploys to Vercel as-is. Set the two env vars in the project settings.
