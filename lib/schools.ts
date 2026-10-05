import data from "./schools-data.json";
import type { School } from "./types";

/**
 * Universities from Hipo's open "university-domains-list" (MIT licensed), trimmed to
 * [domain, name, country code]. The domain doubles as the school's stable id and is what
 * we look the logo up by.
 */

type Row = [domain: string, name: string, country: string];
const ROWS = data as Row[];

const byId = new Map<string, School>(ROWS.map(([id, name, country]) => [id, { id, name, country }]));

export const schoolById = (id: string): School | null => byId.get(id) ?? null;

const STOP = new Set(["of", "the", "and", "at", "in", "for", "de", "la", "du"]);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Indexed {
  school: School;
  name: string;
  acronym: string;
  domainRoot: string;
}

const INDEX: Indexed[] = ROWS.map(([id, name, country]) => {
  const n = norm(name);
  return {
    school: { id, name, country },
    name: n,
    acronym: n
      .split(/[\s,\-–()]+/)
      .filter((w) => w && !STOP.has(w))
      .map((w) => w[0])
      .join(""),
    domainRoot: id.split(".")[0],
  };
});

/** Best matches first: exact acronym or domain, then name prefix, word prefix, then substring. */
export function searchSchools(query: string, limit = 12): School[] {
  const q = norm(query).trim();
  if (q.length < 2) return [];
  const scored: { s: School; score: number; len: number; us: number }[] = [];
  for (const e of INDEX) {
    let score = -1;
    if (e.domainRoot === q) score = 0;
    else if (e.acronym === q) score = 1;
    else if (e.name.startsWith(q)) score = 2;
    else if (e.name.includes(` ${q}`)) score = 3;
    else if (e.acronym.startsWith(q) && q.length >= 3) score = 4;
    else if (e.name.includes(q)) score = 5;
    if (score >= 0) scored.push({ s: e.school, score, len: e.name.length, us: e.school.country === "US" ? 0 : 1 });
  }
  // Ties: US schools first (most players are there), then shorter names.
  scored.sort((a, b) => a.score - b.score || a.us - b.us || a.len - b.len);
  return scored.slice(0, limit).map((x) => x.s);
}
