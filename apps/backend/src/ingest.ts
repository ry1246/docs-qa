import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { chunkMarkdown } from './chunk.js';
import { embed } from './embed.js';
import { listMarkdownFiles, sha256 } from './files.js';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const docsDir = process.env.DOCS_DIR;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  if (!docsDir) throw new Error('DOCS_DIR is not set');
  const force = process.argv.includes('--force');

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = await listMarkdownFiles(docsDir);
    console.log(`found ${files.length} files`);

    const { rows } = await client.query<{ source_path: string; content_hash: string }>(
      'SELECT source_path, min(content_hash) AS content_hash FROM chunks GROUP BY source_path',
    );
    const existing = new Map(rows.map(r => [r.source_path, r.content_hash]));

    let skipped = 0;
    for (const rel of files) {
      const text = await readFile(path.join(docsDir, rel), 'utf8');
      const hash = sha256(text);

      if (!force && existing.get(rel) === hash) {
        skipped++;
        continue;
      }

      const chunks = chunkMarkdown(text);
      if (chunks.length === 0) {
        await client.query('DELETE FROM chunks WHERE source_path = $1', [rel]);
        console.log(`empty  ${rel}`);
        continue;
      }

      const embeddings = await embed(chunks.map(c => c.content), 'document');

      await client.query('BEGIN');
      try {
        await client.query('DELETE FROM chunks WHERE source_path = $1', [rel]);
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i];
          await client.query(
            `INSERT INTO chunks
              (source_path, heading, chunk_index, content, content_hash, embedding)
             VALUES ($1, $2, $3, $4, $5, $6::vector)`,
            [rel, c.heading, c.chunkIndex, c.content, hash, JSON.stringify(embeddings[i])],
          );
        }
        await client.query('COMMIT');
        console.log(`ingested ${rel} (${chunks.length} chunks)`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    const present = new Set(files);
    const removed = [...existing.keys()].filter(p => !present.has(p));
    if (removed.length > 0) {
      await client.query('DELETE FROM chunks WHERE source_path = ANY($1::text[])', [removed]);
      for (const p of removed) console.log(`removed ${p}`);
    }

    console.log(`done: skipped ${skipped}, removed ${removed.length}`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
