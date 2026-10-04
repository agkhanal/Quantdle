"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/math";
import {
  book,
  dailyMarketDifficulty,
  dailyMarketSeed,
  fairValue,
  isOver,
  newMarket,
  playRound,
  replay,
  revealedDraws,
  validateQuote,
  type Draw,
  type MarketGameState,
  type Trade,
} from "@/lib/market";
import { loadJSON, saveJSON } from "@/lib/stats";
import type { Difficulty, Verdict } from "@/lib/types";

const PIPS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const EMOJI: Record<Verdict, string> = { green: "🟩", yellow: "🟨", grey: "⬛" };
const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };

type Props =
  | { daily: true; dailyNumber: number; onPractice: () => void }
  | { daily: false; difficulty: Difficulty };

/**
 * The market-making game. The daily market is the same for everyone, can't be skipped,
 * and survives a refresh. Practice markets are random and skippable.
 */
export default function MarketGame(props: Props) {
  const dailyKey = props.daily ? `quantdle-market-daily-${props.dailyNumber}` : null;
  const [game, setGame] = useState<MarketGameState | null>(null);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const bidRef = useRef<HTMLInputElement>(null);

  const difficulty = props.daily ? dailyMarketDifficulty(props.dailyNumber) : props.difficulty;

  function fresh() {
    setGame(newMarket(Math.floor(Math.random() * 2 ** 31), difficulty));
    setBid("");
    setAsk("");
    setError("");
  }

  // Built on mount (and when the practice difficulty changes) so the daily number
  // uses the player's clock, not the server's.
  useEffect(() => {
    if (props.daily) {
      const saved = loadJSON<[number, number][]>(dailyKey!) ?? [];
      setGame(replay(dailyMarketSeed(props.dailyNumber), difficulty, saved));
    } else {
      fresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.daily, difficulty]);

  const openingSd = useMemo(() => (game ? fairValue(game.contract, []).sd : 1), [game?.contract]);

  if (!game) return null;

  const c = game.contract;
  const over = isOver(game);
  const round = game.rounds.length;
  const total = c.draws.length;
  const known = revealedDraws(game);
  const { position, cash, settlement, pnl } = book(game);
  const last = game.rounds[game.rounds.length - 1];
  const unit = c.draws.every((d) => d.kind === "coin") ? "coin" : c.draws.every((d) => d.kind === "die") ? "die" : "draw";

  function quote(e: React.FormEvent) {
    e.preventDefault();
    if (!game || over) return;
    const b = parseFloat(bid);
    const a = parseFloat(ask);
    const problem = validateQuote(c, b, a);
    if (problem) return setError(problem);
    setError("");
    const next = playRound(game, b, a);
    setGame(next);
    if (dailyKey) saveJSON(dailyKey, next.rounds.map((r) => [r.bid, r.ask]));
    bidRef.current?.focus();
  }

  function shareText() {
    const head = props.daily ? `Quantdle Markets #${props.dailyNumber}` : "Quantdle Markets";
    const tiles = game!.rounds.map((r) => EMOJI[r.verdict]).join("");
    const p = pnl ?? 0;
    return `${head} · ${DIFF_LABEL[difficulty]} · ${c.name}\n${tiles} P&L ${p >= 0 ? "+" : ""}${fmt(p)}`;
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const width = parseFloat(ask) - parseFloat(bid);

  return (
    <>
      <section className="card puzzle">
        <div className="meta">
          <span className={`chip diff-${difficulty}`}>{DIFF_LABEL[difficulty]}</span>
          <span className="chip">Market making</span>
          {props.daily && <span className="chip ghost">#{props.dailyNumber}</span>}
          <span className="chip ghost">Max width {c.maxWidth}</span>
        </div>
        <h1>{c.name}</h1>
        <p className="story">
          {c.blurb} Quote a bid and an ask each round. A trader who has seen the <b>next</b> {unit} will pick off a bad
          quote, an arbitrageur trades against any mispricing, and noise traders sometimes trade just because. One {unit} is
          revealed per round.
        </p>
      </section>

      <div className="dice-row" aria-label="Hidden draws">
        {c.draws.map((d, i) => (
          <span key={i} className={`die ${d.kind === "coin" ? "coin" : ""} ${i < known.length ? "shown" : ""} ${showsNumber(d) ? "num" : ""}`}>
            {i < known.length ? face(d, game.draws[i]) : "?"}
          </span>
        ))}
      </div>

      <div className="book-strip">
        <div>
          <span>Position</span>
          <b className={position > 0 ? "pos" : position < 0 ? "neg" : ""}>{position > 0 ? `+${position}` : position}</b>
        </div>
        <div>
          <span>Cash</span>
          <b>
            {cash >= 0 ? "+" : ""}
            {fmt(cash)}
          </b>
        </div>
        <div>
          <span>{over ? "Settled at" : "Round"}</span>
          <b>{over ? settlement : `${round + 1}/${total}`}</b>
        </div>
      </div>

      <section className="board" aria-label="Your quotes">
        {Array.from({ length: total }).map((_, i) => {
          const r = game.rounds[i];
          if (!r) return <div key={i} className="row empty" />;
          return (
            <div key={i} className={`row flip ${r.verdict}`}>
              <span className="row-step">R{i + 1}</span>
              <span className="row-text">
                {fmt(r.bid)} @ {fmt(r.ask)}
              </span>
              <span className="row-trades">{r.trades.length ? r.trades.map(tradeShort).join(" ") : "no trade"}</span>
            </div>
          );
        })}
      </section>

      {last && (
        <div key={round} className={`feedback fb-${last.verdict}`} role="status">
          <span className="fb-dot" />
          <span>
            {summarizeTrades(last.trades)} {revealText(c.draws[round - 1], round, last.revealed)}
          </span>
        </div>
      )}

      {!over && (
        <form className="card active-step" onSubmit={quote}>
          <div className="step-label">
            Round {round + 1} of {total}
            <span className="rows-left">{total - known.length} hidden</span>
          </div>
          <p className="question">Where&apos;s your market?</p>
          <div className="quote">
            <label>
              <span>Bid</span>
              <input ref={bidRef} value={bid} onChange={(e) => setBid(e.target.value)} inputMode="decimal" placeholder="buy at" autoFocus />
            </label>
            <span className="quote-at">@</span>
            <label>
              <span>Ask</span>
              <input value={ask} onChange={(e) => setAsk(e.target.value)} inputMode="decimal" placeholder="sell at" />
            </label>
            <button className="btn primary">Quote</button>
          </div>
          <p className={`quote-note ${error ? "bad" : ""}`}>
            {error ||
              (Number.isFinite(width)
                ? `Width ${fmt(width)} / max ${c.maxWidth}`
                : `Max width ${c.maxWidth}. Tighter markets attract more noise trades.`)}
          </p>
          {!props.daily && (
            <div className="tools">
              <span />
              <button className="link" type="button" onClick={fresh}>
                Skip this market →
              </button>
            </div>
          )}
        </form>
      )}

      {over && pnl !== null && (
        <section className="card settle">
          <div className="settle-head">
            <span className="muted">Final P&amp;L</span>
            <b className={pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}>
              {pnl >= 0 ? "+" : ""}
              {fmt(pnl)}
            </b>
            <span className="muted small">
              {position === 0 ? "You ended flat." : `${position > 0 ? "Long" : "Short"} ${Math.abs(position)} settled at ${settlement}.`}{" "}
              {verdictLine(pnl, openingSd)}
            </span>
          </div>

          <h3>Recap: where was fair?</h3>
          <div className="recap">
            {game.rounds.map((r, i) => (
              <div key={i} className="recap-row">
                <span className={`recap-tile ${r.verdict}`}>R{i + 1}</span>
                <span>
                  You: {fmt(r.bid)} @ {fmt(r.ask)}
                </span>
                <span>
                  Fair: <b>{fmt(r.fair)}</b>
                </span>
                <span className="recap-trades">{r.trades.length ? r.trades.map((t) => `${tradeShort(t)} ${t.who}`).join(", ") : "no trade"}</span>
              </div>
            ))}
          </div>
          <p className="muted small">
            Fair = the expected settlement given what was showing when you quoted. 🟩 your mid was close to fair, 🟨 a bit off,
            ⬛ far off. A big trade from the sharp trader is a hint about which way the next {unit} leans.
          </p>

          <pre className="share-preview">{shareText()}</pre>
          <div className="end-actions">
            <button className="btn" onClick={share}>
              {copied ? "Copied!" : "Share"}
            </button>
            {props.daily ? (
              <button className="btn primary" onClick={props.onPractice}>
                Practice markets →
              </button>
            ) : (
              <button className="btn primary" onClick={fresh}>
                New market →
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}

const showsNumber = (d: Draw) => d.kind === "die" && d.sides > 6;

function face(d: Draw, x: number) {
  if (d.kind === "coin") return x === 1 ? "H" : "T";
  return d.sides <= 6 ? PIPS[x] : x;
}

function revealText(d: Draw, n: number, x: number) {
  if (d.kind === "coin") return <>Flip {n} came up <b>{x === 1 ? "heads" : "tails"}</b>.</>;
  return (
    <>
      Draw {n} came up <b>{x}</b>.
    </>
  );
}

function tradeShort(t: Trade) {
  return `${t.side === "buy" ? "+" : "−"}${t.size}`;
}

// During play you don't know who traded with you (just like real life). The recap tells you.
function summarizeTrades(trades: Trade[]) {
  if (!trades.length) return "Nobody traded.";
  const parts: string[] = [];
  for (const side of ["buy", "sell"] as const) {
    const ts = trades.filter((t) => t.side === side);
    if (!ts.length) continue;
    const lots = ts.reduce((n, t) => n + t.size, 0);
    const times = ts.length > 1 ? ` ${ts.length} times` : "";
    parts.push(
      side === "buy"
        ? `Your bid got hit${times}: you bought ${lots} @ ${fmt(ts[0].price)}.`
        : `Your offer got lifted${times}: you sold ${lots} @ ${fmt(ts[0].price)}.`,
    );
  }
  return parts.join(" ");
}

/** Judge the result relative to how volatile the contract is. */
function verdictLine(pnl: number, sd: number) {
  if (pnl >= 1.5 * sd) return "Desk head wants a word. In a good way.";
  if (pnl > 0) return "Profitable. Nice market making.";
  if (pnl === 0) return "Broke even.";
  if (pnl > -1.5 * sd) return "Small loss. Watch who's trading with you.";
  return "Picked off. Remember: when sharp money trades, it knows something.";
}