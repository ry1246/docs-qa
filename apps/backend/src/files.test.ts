import { describe, expect, it } from 'vitest';
import { sha256 } from './files.js';

describe('sha256', () => {
  it('同じ入力なら同じ値を返す', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
  });

  it('異なる入力なら異なる値を返す', () => {
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });

  it('64桁の16進数を返す', () => {
    expect(sha256('日本語')).toMatch(/^[0-9a-f]{64}$/);
  });
})
