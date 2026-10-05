"use client";

import katex from "katex";
import { useMemo } from "react";

/** `\( inline \)` and `\[ display \]`, the same delimiters LaTeX uses. ($ is left alone: it means money here.) */
const MATH = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

type Part = { kind: "text"; value: string } | { kind: "math"; html: string; display: boolean } | { kind: "raw"; value: string };

function parse(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    if (m.index > last) parts.push({ kind: "text", value: text.slice(last, m.index) });
    const display = m[2] !== undefined;
    const tex = (display ? m[2] : m[1]).trim();
    try {
      // trust: false keeps \href, \url and friends switched off, so puzzle text can never inject links or HTML.
      const html = katex.renderToString(tex, { displayMode: display, throwOnError: true, trust: false, strict: "ignore", output: "htmlAndMathml" });
      parts.push({ kind: "math", html, display });
    } catch {
      parts.push({ kind: "raw", value: tex }); // bad LaTeX falls back to its plain text
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

/** Puzzle text with LaTeX math rendered by KaTeX. Plain text without math passes straight through. */
export function RichText({ text }: { text: string }) {
  const parts = useMemo(() => parse(text), [text]);
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "math" ? (
          <span key={i} className={p.display ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: p.html }} />
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </>
  );
}
