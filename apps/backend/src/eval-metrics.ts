export type EvalCase = { question: string; expected: string[] };

export type CaseResult = {
  question: string;
  expected: string[];
  retrieved: string[];
  hit: boolean;
  rank: number | null;
};

export function judge(c: EvalCase, retrieved: string[]): CaseResult {
  const idx = retrieved.findIndex(p => c.expected.some(e => p.endsWith(e)));
  return {
    question: c.question,
    expected: c.expected,
    retrieved,
    hit: idx !== -1,
    rank: idx === -1 ? null : idx + 1,
  };
}

export function summarize(results: CaseResult[]) {
  const n = results.length;
  const hits = results.filter(r => r.hit).length;
  const mrr = n === 0 ? 0 : results.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / n;
  return { total: n, hits, hitRate: n === 0 ? 0 : hits / n, mrr };
}
