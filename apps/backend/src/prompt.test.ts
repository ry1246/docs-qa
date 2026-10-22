import { describe, expect, it } from 'vitest';
import { buildPrompt, buildUserMessage, SYSTEM_PROMPT } from './prompt.js';
import type { SearchHit } from './search.js';

const hit = (over: Partial<SearchHit> = {}): SearchHit => ({
  sourcePath: 'a.md',
  heading: '概要',
  chunkIndex: 0,
  content: '本文A',
  score: 0.8,
  ...over,
});

describe('buildUserMessage', () => {
  it('資料に1始まりの index・source・heading を付ける', () => {
    const msg = buildUserMessage('質問?', [
      hit(),
      hit({ sourcePath: 'b.md', heading: '詳細', content: '本文B' }),
    ]);
    expect(msg).toContain('<document index="1" source="a.md" heading="概要">\n本文A\n</document>');
    expect(msg).toContain('<document index="2" source="b.md" heading="詳細">\n本文B\n</document>');
  });

  it('質問を <question> に入れる', () => {
    expect(buildUserMessage('これは何?', [hit()])).toContain('<question>\nこれは何?\n</question>');
  });

  it('ヒット0件でも該当なしと明示して組み立てる', () => {
    const msg = buildUserMessage('質問', []);
    expect(msg).toContain('該当する資料は見つかりませんでした');
    expect(msg).not.toContain('<document ');
  });
});

describe('buildPrompt', () => {
  it('system は固定で、資料と質問は user メッセージに入る', () => {
    const p = buildPrompt('質問', [hit()]);
    expect(p.system).toBe(SYSTEM_PROMPT);
    expect(p.system).not.toContain('本文A');
    expect(p.messages).toHaveLength(1);
    expect(p.messages[0].role).toBe('user');
    expect(p.messages[0].content).toContain('本文A');
  });
});
