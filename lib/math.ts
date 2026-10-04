/**
 * Tiny, safe expression evaluator so players can answer in whatever form they
 * think in: "1/6", "16.67%", "25/102", "e", "1 - (5/6)^4", "C(52,5)", "sqrt(2)/2".
 * No eval(), just a recursive-descent parser.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string };

function tokenize(src: string): Token[] {
  let s = src
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/\*\*/g, "^");
  // "1,000" -> "1000", but leave argument commas in C(52,5) alone.
  if (!s.includes("(")) s = s.replace(/,(?=\d{3}(\D|$))/g, "");
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new Error("bad number");
      out.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
    } else if (/[a-z]/i.test(c)) {
      const m = /^[a-z]+/i.exec(s.slice(i))!;
      out.push({ t: "id", v: m[0].toLowerCase() });
      i += m[0].length;
    } else if ("+-*/^()%!,".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else {
      throw new Error(`unexpected "${c}"`);
    }
  }
  return out;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("bad factorial");
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  ln: Math.log,
  log: Math.log,
  exp: Math.exp,
  abs: Math.abs,
  c: choose,
  choose,
  ncr: choose,
};

const CONSTS: Record<string, number> = { e: Math.E, pi: Math.PI };

class Parser {
  private i = 0;
  constructor(private toks: Token[]) {}

  parse(): number {
    const v = this.expr();
    if (this.i !== this.toks.length) throw new Error("trailing input");
    return v;
  }

  private peek() {
    return this.toks[this.i];
  }
  private isOp(v: string) {
    const t = this.peek();
    return t?.t === "op" && t.v === v;
  }
  private expect(v: string) {
    if (!this.isOp(v)) throw new Error(`expected ${v}`);
    this.i++;
  }

  // expr := term (('+'|'-') term)*
  private expr(): number {
    let v = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.toks[this.i++] as { v: string }).v;
      const r = this.term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  // term := unary (('*'|'/'|implicit) unary)*
  private term(): number {
    let v = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = (this.toks[this.i++] as { v: string }).v;
        const r = this.unary();
        v = op === "*" ? v * r : v / r;
      } else if (this.peek() && (this.peek().t !== "op" || this.isOp("("))) {
        v *= this.unary(); // implicit multiplication: 2pi, 3(4)
      } else {
        return v;
      }
    }
  }

  // unary := '-' unary | power
  private unary(): number {
    if (this.isOp("-")) {
      this.i++;
      return -this.unary();
    }
    if (this.isOp("+")) {
      this.i++;
      return this.unary();
    }
    return this.power();
  }

  // power := postfix ('^' unary)?
  private power(): number {
    const base = this.postfix();
    if (this.isOp("^")) {
      this.i++;
      return Math.pow(base, this.unary());
    }
    return base;
  }

  // postfix := atom ('!' | '%')*
  private postfix(): number {
    let v = this.atom();
    for (;;) {
      if (this.isOp("!")) {
        this.i++;
        v = factorial(v);
      } else if (this.isOp("%")) {
        this.i++;
        v = v / 100;
      } else return v;
    }
  }

  private atom(): number {
    const t = this.toks[this.i++];
    if (!t) throw new Error("unexpected end");
    if (t.t === "num") return t.v;
    if (t.t === "op" && t.v === "(") {
      const v = this.expr();
      this.expect(")");
      return v;
    }
    if (t.t === "id") {
      if (t.v in FUNCS && this.isOp("(")) {
        this.i++;
        const args = [this.expr()];
        while (this.isOp(",")) {
          this.i++;
          args.push(this.expr());
        }
        this.expect(")");
        return FUNCS[t.v](...args);
      }
      if (t.v in CONSTS) return CONSTS[t.v];
      throw new Error(`unknown "${t.v}"`);
    }
    throw new Error("unexpected token");
  }
}

/** Returns the numeric value of an answer string, or null if it can't be read. */
export function evaluate(input: string): number | null {
  const s = input.trim().replace(/^\$/, "");
  if (!s || s.length > 120) return null;
  try {
    const v = new Parser(tokenize(s)).parse();
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export function relativeError(guess: number, truth: number): number {
  if (truth === 0) return Math.abs(guess);
  return Math.abs(guess - truth) / Math.abs(truth);
}

/** Pretty-print a number for previews, e.g. 0.1666666 -> "0.1667". */
export function fmt(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 1) return String(+v.toFixed(4));
  return String(+v.toPrecision(4));
}
