import type pg from 'pg';
import { embed } from './embed.js';

export type SearchHit = {
  sourcePath: string;
  heading: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export const DEFAULT_TOP_K = 5;

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

export async function searchChunks(
  pool: pg.Pool,
  question: string,
  k = DEFAULT_TOP_K,
): Promise<SearchHit[]> {
  const [vec] = await embed([question], 'query');
  const literal = toVectorLiteral(vec);

  const { rows } = await pool.query<{
    source_path: string;
    heading: string;
    chunk_index: number;
    content: string;
    score: number;
  }>(
    `SELECT source_path, heading, chunk_index, content,
      1 - (embedding <=> $1::vector) AS score
    FROM chunks
    ORDER BY embedding <=> $1::vector
    LIMIT $2`,
    [literal, k],
  );

  return rows.map(r => ({
    sourcePath: r.source_path,
    heading: r.heading,
    chunkIndex: r.chunk_index,
    content: r.content,
    score: Number(r.score),
  }));
}
