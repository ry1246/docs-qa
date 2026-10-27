import { readFile } from 'node:fs/promises';
import { getPool } from './db.js';
import { searchChunks } from './search.js';
import { judge, summarize, type CaseResult, type EvalCase } from './eval-metrics.js';

const k = Number(process.env.EVAL_K ?? process.argv[2] ?? 5);

async function loadCases(): Promise<EvalCase[]> {
  const raw = await readFile(new URL('../eval/questions.json', import.meta.url), 'utf8');
  const cases: EvalCase[] = JSON.parse(raw);

  return cases.filter(c => c.expected.length > 0);
}

async function main() {
  if (!Number.isInteger(k) || k < 1) throw new Error('usage: npm run eval -- [k]  (k >= 1)');

  const cases = await loadCases();
  const pool = getPool();
  const results: CaseResult[] = [];

  try {
    for (const c of cases) {
      const hits = await searchChunks(pool, c.question, k);
      const r = judge(c, hits.map(h => h.sourcePath));
      results.push(r);

      console.log(`${r.hit ? 'OK' : 'NG'} rank=${r.rank ?? '-'} ${c.question}`);
      if (!r.hit) {
        console.log(`    expected: ${c.expected.join(', ')}`);
        console.log(`    got:      ${r.retrieved.join(', ')}`);
      }
    }
  } finally {
    await pool.end();
  }

  const s = summarize(results);
  console.log(
    `\nk=${k}  hit rate ${s.hits}/${s.total} = ${(s.hitRate * 100).toFixed(1)}%  MRR ${s.mrr.toFixed(3)}`,
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
