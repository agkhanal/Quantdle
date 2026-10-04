"use client";

import { useEffect, useRef, useState } from "react";
import { dailyNumber } from "@/lib/bank";
import { fmt } from "@/lib/math";
import {
  book,
  isOver,
  newMarket,
  playRound,
  revealedDice,
  validateQuote,
  type MarketGameState,
  type Trade,
} from "@/lib/market";
import type { Verdict } from "@/lib/types";

const PIPS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const EMOJI: Record<Verdict, string> = { green: "🟩", yellow: "🟨", grey: "⬛" };

export default function MarketGame() {
  const [daily, setDaily] = useState(true);
  const [game, setGame] = useState<MarketGameState | null>(null);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const bidRef = useRef<HTMLInputElement>(null);

  // Built on mount so the daily number uses the player's clock, not the server's.
  useEffect(() => {
    setGame(newMarket(dailyNumber() * 7919 + 13));
  }, []);

  if (!game) return null;

  const c = game.contract;
  const over = isOver(game);
  const round = game.rounds.length;
  const known = revealedDice(game);
  const { position, cash, settlement, pnl } = book(game);
  const last = game.rounds[game.rounds.length - 1];

  function start(isDaily: boolean) {
    setDaily(isDaily);
    setGame(newMarket(isDaily ? dailyNumber() * 7919 + 13 : Math.floor(Math.random() * 2 ** 31)));
    setBid("");
    setAsk("");
    setError("");
  }

  function quote(e: React.FormEvent) {
    e.preventDefault();
    if (!game || over) return;
    const b = parseFloat(bid);
    const a = parseFloat(ask);
    const problem = validateQuote(c, b, a);
    if (problem) return setError(problem);
    setError("");
    setGame(playRound(game, b, a));
    bidRef.current?.focus();
  }

  function shareText() {
    const head = daily ? `Quantdle Markets #${dailyNumber()}` : "Quantdle Markets";
    const tiles = game!.rounds.map((r) => EMOJI[r.verdict]).join("");
    const p = pnl ?? 0;
    return `${head} · ${c.name}\n${tiles} P&L ${p >= 0 ? "+" : ""}${fmt(p)}`;
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
          <span className="chip diff-expert">Market making</span>
          <span className="chip ghost">{daily ? `Daily #${dailyNumber()}` : "Random"}</span>
          <span className="chip">Max width {c.maxWidth}</span>
        </div>
        <h1>{c.name}</h1>
        <p className="story">
          {c.blurb} Quote a bid and an ask each round. A trader who has seen the <b>next</b> die will pick off a bad
          quote, an arbitrageur trades against any mispricing, and noise traders sometimes trade just because. One die is revealed per round.
        </p>
      </section>

      <div className="dice-row" aria-label="Dice">
        {game.dice.map((d, i) => (
          <span key={i} className={`die ${i < known.length ? "shown" : ""}`}>
            {i < known.length ? PIPS[d] : "?"}
          </span>
        ))}
      </div>

      <div className="book-strip">
        <div>
          <span>Position</span>
          <b className={position > 0 ? "pos" : position < 0 ? "neg" : ""}>
            {position > 0 ? `+${position}` : position}
          </b>
        </div>
        <div>
          <span>Cash</span>
          <b>{cash >= 0 ? "+" : ""}{fmt(cash)}</b>
        </div>
        <div>
          <span>{over ? "Settled at" : "Round"}</span>
          <b>{over ? settlement : `${round + 1}/${c.dice}`}</b>
        </div>
      </div>

      <section className="board" aria-label="Your quotes">
        {Array.from({ length: c.dice }).map((_, i) => {
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
            {summarizeTrades(last.trades)} Die {round} came up{" "}
            <b>{last.revealed}</b>.
          </span>
        </div>
      )}

      {!over && (
        <form className="card active-step" onSubmit={quote}>
          <div className="step-label">
            Round {round + 1} of {c.dice}
            <span className="rows-left">{c.dice - known.length} dice hidden</span>
          </div>
          <p className="question">Where&apos;s your market?</p>
          <div className="quote">
            <label>
              <span>Bid</span>
              <input
                ref={bidRef}
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                inputMode="decimal"
                placeholder="buy at"
                autoFocus
              />
            </label>
            <span className="quote-at">@</span>
            <label>
              <span>Ask</span>
              <input value={ask} onChange={(e) => setAsk(e.target.value)} inputMode="decimal" placeholder="sell at" />
            </label>
            <button className="btn primary">Quote</button>
          </div>
          <p className={`quote-note ${error ? "bad" : ""}`}>
            {error || (Number.isFinite(width) ? `Width ${fmt(width)} / max ${c.maxWidth}` : `Max width ${c.maxWidth}. Tighter markets attract more noise trades.`)}
          </p>
          <div className="tools">
            <span />
            <button className="link" type="button" onClick={() => start(false)}>
              Skip this market →
            </button>
          </div>
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
              {position === 0
                ? "You ended flat."
                : `${position > 0 ? "Long" : "Short"} ${Math.abs(position)} settled at ${settlement}.`}{" "}
              {verdictLine(pnl)}
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
                <span className="recap-trades">
                  {r.trades.length
                    ? r.trades.map((t) => `${tradeShort(t)} ${t.who}`).join(", ")
                    : "no trade"}
                </span>
              </div>
            ))}
          </div>
          <p className="muted small">
            Fair = the expected settlement given the dice showing when you quoted. 🟩 your mid was close to fair, 🟨 a bit
            off, ⬛ far off. A big trade from the sharp trader is a hint about which way the next die leans.
          </p>

          <pre className="share-preview">{shareText()}</pre>
          <div className="end-actions">
            <button className="btn" onClick={share}>
              {copied ? "Copied!" : "Share"}
            </button>
            <button className="btn primary" onClick={() => start(false)}>
              New market →
            </button>
          </div>
          {!daily && (
            <button className="link center-link" onClick={() => start(true)}>
              Back to today&apos;s daily market
            </button>
          )}
        </section>
      )}
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

function verdictLine(pnl: number) {
  if (pnl >= 6) return "Desk head wants a word. In a good way.";
  if (pnl > 0) return "Profitable. Nice market making.";
  if (pnl === 0) return "Broke even.";
  if (pnl > -6) return "Small loss. Watch who's trading with you.";
  return "Picked off. Remember: when sharp money trades, it knows something.";
}