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

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = await listMarkdownFiles(docsDir);
    console.log(`found ${files.length} files`);

    for (const rel of files) {
      const text = await readFile(path.join(docsDir, rel), 'utf8');
      const hash = sha256(text);
      const chunks = chunkMarkdown(text);
      if (chunks.length === 0) {
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
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
