import { describe, it, expect } from 'vitest';
import { judge, summarize, type CaseResult } from './eval-metrics.js';

describe('judge', () => {
  it('期待出典が top-k に含まれれば hit 順位を返す', () => {
    const r = judge({ question: 'q', expected: ['a.md'] }, ['x.md', 'a.md', 'y.md']);
    expect(r.hit).toBe(true);
    expect(r.rank).toBe(2);
  });

  it('含まれなければ hit=false, ran=null', () => {
    const r = judge({ question: 'q', expected: ['a.md'] }, ['x.md', 'y.md']);
    expect(r.hit).toBe(false);
    expect(r.rank).toBeNull();
  });

  it('expected が複数ならどれか1つで hit', () => {
    const r = judge({ question: 'q', expected: ['a.md', 'b.md'] }, ['x.md', 'b.md']);
    expect(r.hit).toBe(true);
    expect(r.rank).toBe(2);
  });

  it('絶対パスでも末尾一致で hit', () => {
    const r = judge(
      { question: 'q', expected: ['reference/a.md'] },
      ['/Users/ohagi/omochi/reference/a.md'],
    );
    expect(r.hit).toBe(true);
    expect(r.rank).toBe(1);
  });
});

describe('summarize', () => {
  const result = (rank: number | null): CaseResult => ({
    question: 'q',
    expected: [],
    retrieved: [],
    hit: rank !== null,
    rank,
  });

  it('hitRate と MRR を計算する', () => {
    const s = summarize([result(1), result(2), result(null)]);
    expect(s.total).toBe(3);
    expect(s.hits).toBe(2);
    expect(s.hitRate).toBeCloseTo(2 / 3);
    expect(s.mrr).toBeCloseTo((1 + 1 / 2 + 0) / 3);
  });

  it('0件でも NaN にならない', () => {
    expect(summarize([])).toEqual({ total: 0, hits: 0, hitRate: 0, mrr: 0 });
  });
});
