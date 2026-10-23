import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getPool } from './db.js';
import { searchChunks } from './search.js';
import { buildPrompt } from './prompt.js';
import { getClient, MODEL, MAX_TOKENS } from './llm.js';

const app = new Hono();

app.post('/ask', async (c) => {
  const body = await c.req.json<{ question?: string }>().catch(() => null);
  const question = body?.question?.trim();
  if (!question) return c.json({ error: 'question is required' }, 400);

  return streamSSE(c, async (stream) => {
    try {
      const hits = await searchChunks(getPool(), question);

      await stream.writeSSE({
        event: 'sources',
        data: JSON.stringify(
          hits.map((h, i) => ({
            index: i + 1,
            sourcePath: h.sourcePath,
            heading: h.heading,
            score: h.score,
          })),
        ),
      });

      const { system, messages } = buildPrompt(question, hits);
      const llmStream = getClient().messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
      });

      stream.onAbort(() => llmStream.abort());

      for await (const ev of llmStream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          await stream.writeSSE({ event: 'delta', data: JSON.stringify(ev.delta.text) });
        }
      }

      const final = await llmStream.finalMessage();

      console.log('usage', final.usage);

      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({
          usage: final.usage,
          truncated: final.stop_reason === 'max_tokens',
        }),
      });
    } catch (err) {
      console.error(err);
      await stream
        .writeSSE({
          event: 'error',
          data: JSON.stringify({ message: 'internal error' }),
        })
        .catch(() => {});
    }
  });
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
