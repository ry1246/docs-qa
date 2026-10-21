import { getPool } from './db.js';
import { searchChunks } from './search.js';

async function main() {
  const question = process.argv.slice(2).join(' ');
  if (!question) throw new Error('usage: npm run search -- "質問"');

  const pool = getPool();
  try {
    const hits = await searchChunks(pool, question);
    for (const h of hits) {
      console.log(`${h.score.toFixed(3)} ${h.sourcePath} > ${h.heading}`);
      console.log(`    ${h.content.slice(0, 80).replace(/\n/g, ' ')}...`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
