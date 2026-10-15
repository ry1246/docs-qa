import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from './chunk.js';

const noMerge = { minChars: 0 };

describe('chunkMarkdown', () => {
  it('見出し1つの短い文章は1チャンクになる', () => {
    const md = '# タイトル\n\n本文です。';
    expect(chunkMarkdown(md, noMerge)).toEqual([
      { heading: 'タイトル', chunkIndex: 0, content: '本文です。' },
    ]);
  });

  it('## と ### で分離され、heading に階層が入る', () => {
    const md = [
      '# 全体', '', '前文', '',
      '## 章A', '', '本文A', '',
      '### 節A1', '', '本文A1', '',
      '## 章B', '', '本文B',
    ].join('\n');
    expect(chunkMarkdown(md, noMerge)).toEqual([
      { heading: '全体', chunkIndex: 0, content: '前文' },
      { heading: '全体 > 章A', chunkIndex: 1, content: '本文A' },
      { heading: '全体 > 章A > 節A1', chunkIndex: 2, content: '本文A1' },
      { heading: '全体 > 章B', chunkIndex: 3, content: '本文B' },
    ]);
  });

  it('コードフェンス内の # は見出しとして扱わない', () => {
    const md = '# T\n\n```bash\n# コメント\necho hi\n```\n\n## 次\n\n本文';
    const chunks = chunkMarkdown(md, noMerge);
    expect(chunks.map((c) => c.heading)).toEqual(['T', 'T > 次']);
    expect(chunks[0].content).toContain('# コメント');
  });

  it('最初の見出しより前の本文は heading が空のチャンクになる', () => {
    const md = '前書き\n\n# T\n\n本文';
    const chunks = chunkMarkdown(md, noMerge);
    expect(chunks[0]).toEqual({ heading: '', chunkIndex: 0, content: '前書き' });
    expect(chunks[1].heading).toBe('T');
  });
});
