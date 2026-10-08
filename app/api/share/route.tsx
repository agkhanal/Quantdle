import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/auth";
import { dailyNumber, dailyPuzzle } from "@/lib/bank";
import { marketInfo } from "@/lib/archive";
import { findUser } from "@/lib/profile";
import { parseCard, type CardSpec, type Tile } from "@/lib/shareCard";
import type { Difficulty } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET: the result card, a 1200x630 PNG, drawn from the query string (see lib/shareCard.ts). Used by "Share image" on the
 * result screens and as the link-preview image for the site. Titles and contract names come from our own puzzle bank,
 * never from the URL, and a player's name only appears if that account exists.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://quantdle.vercel.app").replace(/^https?:\/\//, "");

const C = { bg: "#121316", surface: "#1b1d21", surface2: "#24272c", text: "#ecebe6", muted: "#8e9198", border: "#2d3036", green: "#4caf73", yellow: "#d6a93a", grey: "#4a4e55", accent: "#8b7cf0", red: "#e5484d" };
const TILE_BG: Record<Exclude<Tile, "h">, string> = { g: C.green, y: C.yellow, x: C.grey };
const DIFF: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: "Easy", color: "#4caf73" },
  medium: { label: "Medium", color: "#d6a93a" },
  hard: { label: "Hard", color: "#e07b3c" },
  expert: { label: "Expert", color: "#8b7cf0" },
};
const LOGO = ["Q", "U", "A", "N", "T", "D", "L", "E"];
const LOGO_COLOR = [C.green, C.grey, C.yellow, C.green, C.grey, C.green, C.yellow, C.green];

// ───────────── fonts ─────────────
// Space Grotesk (the site's font), as static weights from the Fontsource package on jsDelivr: the image renderer can't
// pick weights out of Google's single variable-font file. Fetched once per server. If that fails, the card still renders
// in the built-in font, and we try again after a pause.

type Font = { name: string; data: ArrayBuffer; weight: 500 | 700; style: "normal" };
const FONT_URL = (weight: 500 | 700) => `https://cdn.jsdelivr.net/npm/@fontsource/space-grotesk/files/space-grotesk-latin-${weight}-normal.woff`;
let fonts: Promise<Font[]> | null = null;
let failedAt = 0;

function loadFonts(): Promise<Font[]> {
  if (fonts) return fonts;
  if (Date.now() - failedAt < 5 * 60_000) return Promise.resolve([]);
  fonts = Promise.all(
    ([500, 700] as const).map(async (weight): Promise<Font> => {
      const res = await fetch(FONT_URL(weight), { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`font ${weight}: ${res.status}`);
      return { name: "Space Grotesk", data: await res.arrayBuffer(), weight, style: "normal" };
    }),
  ).catch(() => {
    fonts = null;
    failedAt = Date.now();
    return [];
  });
  return fonts;
}

// ───────────── drawing ─────────────

function Bulb({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.2 18.2h5.6M10.2 21.4h3.6" />
      <path d="M12 2.6a6.4 6.4 0 0 0-3.8 11.6c.7.6 1.3 1.5 1.3 2.4v.6h5v-.6c0-.9.6-1.8 1.3-2.4A6.4 6.4 0 0 0 12 2.6z" />
    </svg>
  );
}

const GRID_W = 440; // width of the column the tiles live in

function Grid({ rows }: { rows: Tile[][] }) {
  const widest = Math.max(1, ...rows.map((r) => r.length));
  const byHeight = rows.length <= 4 ? 78 : rows.length <= 6 ? 62 : 50;
  const byWidth = Math.floor((GRID_W - 10 * (widest - 1)) / widest); // a long row (six rounds) must still fit
  const size = Math.min(byHeight, byWidth);
  const gap = size > 60 ? 14 : 10;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap }}>
          {(row.length ? row : (["-"] as const)).map((t, j) =>
            t === "h" ? (
              <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: size * 0.22, border: `3px solid ${C.accent}` }}>
                <Bulb size={size * 0.52} />
              </div>
            ) : (
              <div key={j} style={{ display: "flex", width: size, height: size, borderRadius: size * 0.22, background: t === "-" ? C.surface2 : TILE_BG[t] }} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function Chip({ text, color }: { text: string; color?: string }) {
  return (
    <div style={{ display: "flex", padding: "8px 20px", borderRadius: 999, fontSize: 26, fontWeight: 700, background: color ?? C.surface2, color: color ? "#121316" : C.muted }}>{text}</div>
  );
}

interface Face {
  label: string;
  title: string;
  difficulty?: Difficulty;
  topic?: string;
  big?: { text: string; color: string; caption: string };
  rows: Tile[][];
  footer: string;
}

/** Decides what the card says, taking trusted facts (titles, contracts) from our own data. */
function describe(spec: CardSpec, today: number, user: string | null): Face {
  const footer = user ? `@${user}` : "A daily quant puzzle game";
  if (spec.kind === "site") {
    const p = dailyPuzzle(spec.n ?? today);
    return {
      label: `TODAY'S DAILY #${spec.n ?? today}`,
      title: p.title,
      difficulty: p.difficulty,
      topic: p.category,
      big: { text: "6 guesses", color: C.text, caption: "Solve it step by step" },
      rows: [["x", "y", "g"], ["g"], ["x", "g"]],
      footer: "A daily quant puzzle game",
    };
  }
  if (spec.kind === "market") {
    const daily = spec.mode === "daily" && spec.n !== undefined;
    const info = daily ? marketInfo(spec.n!) : null;
    const pnl = spec.pnl ?? 0;
    return {
      label: daily ? `MARKETS #${spec.n}` : "MARKETS · PRACTICE",
      title: info?.name ?? "Market making",
      difficulty: info?.difficulty ?? spec.difficulty,
      big: { text: `${pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}`, color: pnl > 0 ? C.green : pnl < 0 ? C.red : C.text, caption: "Final P&L" },
      rows: spec.rows.slice(0, 1),
      footer,
    };
  }
  const daily = spec.mode === "daily" && spec.n !== undefined;
  const p = daily ? dailyPuzzle(spec.n!) : null;
  const won = spec.guesses !== null;
  return {
    label: daily ? `DAILY #${spec.n}` : "PRACTICE",
    title: p?.title ?? "Practice puzzle",
    difficulty: p?.difficulty ?? spec.difficulty,
    topic: p?.category ?? spec.topic,
    big: { text: won ? `${spec.guesses}/6` : "X/6", color: won ? C.green : C.red, caption: won ? "Solved" : "Not this time" },
    rows: spec.rows,
    footer,
  };
}

function Card({ face, family }: { face: Face; family?: string }) {
  const title = face.title.length > 40 ? `${face.title.slice(0, 38)}…` : face.title;
  // As big as fits on one line in the left column (down to a floor, after which it may wrap onto a second line).
  const titleSize = Math.max(44, Math.min(72, Math.floor(592 / (title.length * 0.5))));
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1200, height: 630, padding: "44px 56px", background: C.bg, color: C.text, ...(family ? { fontFamily: family } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {LOGO.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 46, height: 52, borderRadius: 10, background: LOGO_COLOR[i], color: i % 3 === 1 ? "#ecebe6" : "#121316", fontSize: 30, fontWeight: 700 }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: C.accent, letterSpacing: 3 }}>{face.label}</div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56, marginTop: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>{title}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            {face.difficulty && <Chip text={DIFF[face.difficulty].label} color={DIFF[face.difficulty].color} />}
            {face.topic && <Chip text={face.topic} />}
          </div>
          {face.big && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
              <div style={{ display: "flex", fontSize: 116, fontWeight: 700, lineHeight: 1, letterSpacing: -3, color: face.big.color }}>{face.big.text}</div>
              <div style={{ display: "flex", fontSize: 28, color: C.muted, marginTop: 10 }}>{face.big.caption}</div>
            </div>
          )}
        </div>
        {face.rows.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: GRID_W }}>
            <Grid rows={face.rows} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: C.muted, borderTop: `2px solid ${C.border}`, paddingTop: 20 }}>
        <div style={{ display: "flex", color: face.footer.startsWith("@") ? C.text : C.muted, fontWeight: face.footer.startsWith("@") ? 700 : 500 }}>{face.footer}</div>
        <div style={{ display: "flex", fontWeight: 700, color: C.text }}>{SITE}</div>
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  if (await rateLimited(req, "share", 120, 60)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const today = dailyNumber();
  const spec = parseCard(new URL(req.url).searchParams, today);
  const [user, loaded] = await Promise.all([spec.user ? findUser(spec.user) : Promise.resolve(null), loadFonts()]);
  const face = describe(spec, today, user);
  return new ImageResponse(<Card face={face} family={loaded.length ? "Space Grotesk" : undefined} />, {
    width: 1200,
    height: 630,
    fonts: loaded.length ? loaded : undefined,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
