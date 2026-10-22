import { describe, expect, it } from 'vitest';
import { toVectorLiteral } from './search.js';

describe('toVectorLiteral', () => {
  it('カンマ区切りの角括弧文字列にする', () => {
    expect(toVectorLiteral([0.1, 0.2, -0.3])).toBe('[0.1,0.2,-0.3]');
  });

  it('要素が1つでも角括弧で囲む', () => {
    expect(toVectorLiteral([1])).toBe('[1]');
  });
});
