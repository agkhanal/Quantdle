/**
 * Tiny key-value store for accounts and the leaderboard.
 *
 * In production it talks to Upstash Redis over its REST API (free tier, one click
 * from Vercel's Storage tab). Without those env vars it falls back to memory, which
 * is fine for local testing but resets whenever the server restarts.
 */

type Cmd = (string | number)[];

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const storeKind: "redis" | "memory" = url && token ? "redis" : "memory";

async function redis<T = unknown>(cmd: Cmd): Promise<T> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const body = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || body.error) throw new Error(`Redis ${cmd[0]} failed: ${body.error ?? res.status}`);
  return body.result as T;
}

// ───────────── in-memory fallback ─────────────

interface Mem {
  kv: Map<string, { v: string; exp?: number }>;
  sets: Map<string, Set<string>>;
  zsets: Map<string, Map<string, number>>;
  hashes: Map<string, Map<string, string>>;
  lex: Map<string, Set<string>>;
}
const g = globalThis as unknown as { __quantdleMem?: Mem };
const mem: Mem = (g.__quantdleMem ??= { kv: new Map(), sets: new Map(), zsets: new Map(), hashes: new Map(), lex: new Map() });

function memGet(key: string) {
  const e = mem.kv.get(key);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) {
    mem.kv.delete(key);
    return null;
  }
  return e.v;
}

const sortedDesc = (z: Map<string, number>) => [...z.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

// ───────────── public API ─────────────

export async function get(key: string): Promise<string | null> {
  if (storeKind === "redis") return redis<string | null>(["GET", key]);
  return memGet(key);
}

export async function set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (storeKind === "redis") {
    await redis(ttlSeconds ? ["SET", key, value, "EX", ttlSeconds] : ["SET", key, value]);
    return;
  }
  mem.kv.set(key, { v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
}

/** Set only if the key doesn't exist. Returns true if it was set. */
export async function setIfAbsent(key: string, value: string): Promise<boolean> {
  if (storeKind === "redis") return (await redis<string | null>(["SET", key, value, "NX"])) === "OK";
  if (memGet(key) !== null) return false;
  mem.kv.set(key, { v: value });
  return true;
}

/** Increment a counter; the TTL is applied when the counter is first created. */
export async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (storeKind === "redis") {
    const n = await redis<number>(["INCR", key]);
    if (n === 1) await redis(["EXPIRE", key, ttlSeconds]);
    return n;
  }
  const n = Number(memGet(key) ?? 0) + 1;
  const exp = mem.kv.get(key)?.exp ?? Date.now() + ttlSeconds * 1000;
  mem.kv.set(key, { v: String(n), exp });
  return n;
}

/** Add to a set. Returns true if the member was new. */
export async function addToSet(key: string, member: string): Promise<boolean> {
  if (storeKind === "redis") return (await redis<number>(["SADD", key, member])) === 1;
  const s = mem.sets.get(key) ?? new Set<string>();
  mem.sets.set(key, s);
  if (s.has(member)) return false;
  s.add(member);
  return true;
}

export async function inSet(key: string, member: string): Promise<boolean> {
  if (storeKind === "redis") return (await redis<number>(["SISMEMBER", key, member])) === 1;
  return mem.sets.get(key)?.has(member) ?? false;
}

export async function zIncr(key: string, member: string, by: number, ttlSeconds?: number): Promise<number> {
  if (storeKind === "redis") {
    const v = Number(await redis<string>(["ZINCRBY", key, by, member]));
    if (ttlSeconds) await redis(["EXPIRE", key, ttlSeconds]);
    return v;
  }
  const z = mem.zsets.get(key) ?? new Map<string, number>();
  mem.zsets.set(key, z);
  const v = (z.get(member) ?? 0) + by;
  z.set(member, v);
  return v;
}

export async function zTop(key: string, n: number): Promise<{ member: string; score: number }[]> {
  if (storeKind === "redis") {
    const flat = await redis<string[]>(["ZRANGE", key, 0, n - 1, "REV", "WITHSCORES"]);
    const out: { member: string; score: number }[] = [];
    for (let i = 0; i < flat.length; i += 2) out.push({ member: flat[i], score: Number(flat[i + 1]) });
    return out;
  }
  return sortedDesc(mem.zsets.get(key) ?? new Map())
    .slice(0, n)
    .map(([member, score]) => ({ member, score }));
}

/** Score and 0-based rank (highest first) of a member, or null if absent. */
export async function zRankOf(key: string, member: string): Promise<{ score: number; rank: number } | null> {
  if (storeKind === "redis") {
    const [score, rank] = await Promise.all([
      redis<string | null>(["ZSCORE", key, member]),
      redis<number | null>(["ZREVRANK", key, member]),
    ]);
    return score === null || rank === null ? null : { score: Number(score), rank };
  }
  const z = mem.zsets.get(key);
  if (!z?.has(member)) return null;
  return { score: z.get(member)!, rank: sortedDesc(z).findIndex(([m]) => m === member) };
}

/** Add `by` to a counter (created at 0). The TTL is applied when the counter is first created. */
export async function incrBy(key: string, by: number, ttlSeconds: number): Promise<number> {
  if (storeKind === "redis") {
    const n = await redis<number>(["INCRBY", key, by]);
    if (n === by) await redis(["EXPIRE", key, ttlSeconds]);
    return n;
  }
  const n = Number(memGet(key) ?? 0) + by;
  const exp = mem.kv.get(key)?.exp ?? Date.now() + ttlSeconds * 1000;
  mem.kv.set(key, { v: String(n), exp });
  return n;
}

export async function del(key: string): Promise<void> {
  if (storeKind === "redis") {
    await redis(["DEL", key]);
    return;
  }
  mem.kv.delete(key);
}

// ───────────── hashes (profiles) ─────────────

export async function hGetAll(key: string): Promise<Record<string, string>> {
  if (storeKind === "redis") {
    const flat = (await redis<string[] | null>(["HGETALL", key])) ?? [];
    const out: Record<string, string> = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
    return out;
  }
  return Object.fromEntries(mem.hashes.get(key) ?? []);
}

export async function hSet(key: string, fields: Record<string, string | number>): Promise<void> {
  const entries = Object.entries(fields);
  if (entries.length === 0) return;
  if (storeKind === "redis") {
    await redis(["HSET", key, ...entries.flatMap(([f, v]) => [f, String(v)])]);
    return;
  }
  const h = mem.hashes.get(key) ?? new Map<string, string>();
  mem.hashes.set(key, h);
  for (const [f, v] of entries) h.set(f, String(v));
}

export async function hDel(key: string, field: string): Promise<void> {
  if (storeKind === "redis") {
    await redis(["HDEL", key, field]);
    return;
  }
  mem.hashes.get(key)?.delete(field);
}

export async function hIncrBy(key: string, field: string, by: number): Promise<number> {
  if (storeKind === "redis") return Number(await redis<number>(["HINCRBY", key, field, by]));
  const h = mem.hashes.get(key) ?? new Map<string, string>();
  mem.hashes.set(key, h);
  const v = Number(h.get(field) ?? 0) + by;
  h.set(field, String(v));
  return v;
}


// ───────────── sorted name index (for searching usernames) ─────────────

/** Add a member to an alphabetical index. */
export async function lexAdd(key: string, member: string): Promise<void> {
  if (storeKind === "redis") {
    await redis(["ZADD", key, 0, member]);
    return;
  }
  const s = mem.lex.get(key) ?? new Set<string>();
  mem.lex.set(key, s);
  s.add(member);
}

/** Members starting with `prefix`, alphabetically. */
export async function lexPrefix(key: string, prefix: string, limit: number): Promise<string[]> {
  if (storeKind === "redis") {
    return (await redis<string[] | null>(["ZRANGEBYLEX", key, `[${prefix}`, `[${prefix}\u00ff`, "LIMIT", 0, limit])) ?? [];
  }
  return [...(mem.lex.get(key) ?? [])].filter((m) => m.startsWith(prefix)).sort().slice(0, limit);
}

/** Up to `limit` members, alphabetically (used for "contains" matching on a small index). */
export async function lexAll(key: string, limit: number): Promise<string[]> {
  if (storeKind === "redis") return (await redis<string[] | null>(["ZRANGE", key, 0, limit - 1])) ?? [];
  return [...(mem.lex.get(key) ?? [])].sort().slice(0, limit);
}

/** Every key that starts with `prefix` (SCAN-based; for one-off migrations). */
export async function keysWithPrefix(prefix: string): Promise<string[]> {
  if (storeKind === "redis") {
    const out: string[] = [];
    let cursor = "0";
    do {
      const [next, keys] = await redis<[string, string[]]>(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", 500]);
      out.push(...keys);
      cursor = String(next);
    } while (cursor !== "0");
    return out;
  }
  return [...mem.kv.keys()].filter((k) => k.startsWith(prefix));
}


// ───────────── ordered log (chat) ─────────────

/** Add a member with an explicit score (used as an ordered log: score = sequence number). */
export async function zAddMember(key: string, score: number, member: string): Promise<void> {
  if (storeKind === "redis") {
    await redis(["ZADD", key, score, member]);
    return;
  }
  const z = mem.zsets.get(key) ?? new Map<string, number>();
  mem.zsets.set(key, z);
  z.set(member, score);
}

export async function zRemMember(key: string, member: string): Promise<void> {
  if (storeKind === "redis") {
    await redis(["ZREM", key, member]);
    return;
  }
  mem.zsets.get(key)?.delete(member);
}

const inRange = (score: number, min: string, max: string) => {
  const lo = min.startsWith("(") ? score > Number(min.slice(1)) : score >= Number(min);
  const hi = max === "+inf" ? true : max.startsWith("(") ? score < Number(max.slice(1)) : score <= Number(max);
  return lo && hi;
};

/** Members with min <= score <= max, oldest first. `min`/`max` use Redis syntax: "5", "(5" (exclusive), "+inf". */
export async function zByScore(key: string, min: string, max: string, limit: number): Promise<string[]> {
  if (storeKind === "redis") {
    return (await redis<string[] | null>(["ZRANGEBYSCORE", key, min, max, "LIMIT", 0, limit])) ?? [];
  }
  return [...(mem.zsets.get(key) ?? new Map<string, number>()).entries()]
    .filter(([, sc]) => inRange(sc, min, max))
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([m]) => m);
}

/** The newest `n` members, oldest first. */
export async function zNewest(key: string, n: number): Promise<string[]> {
  if (storeKind === "redis") return (await redis<string[] | null>(["ZRANGE", key, -n, -1])) ?? [];
  return [...(mem.zsets.get(key) ?? new Map<string, number>()).entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(-n)
    .map(([m]) => m);
}

/** Drop everything but the newest `keep` members. */
export async function zTrim(key: string, keep: number): Promise<void> {
  if (storeKind === "redis") {
    await redis(["ZREMRANGEBYRANK", key, 0, -(keep + 1)]);
    return;
  }
  const z = mem.zsets.get(key);
  if (!z) return;
  const sorted = [...z.entries()].sort((a, b) => a[1] - b[1]);
  for (const [m] of sorted.slice(0, Math.max(0, sorted.length - keep))) z.delete(m);
}


/** Several keys at once (null for missing ones). */
export async function mget(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  if (storeKind === "redis") return (await redis<(string | null)[]>(["MGET", ...keys])) ?? keys.map(() => null);
  return keys.map((k) => memGet(k));
}
