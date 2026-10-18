const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = process.env.EMBEDDING_MODEL ?? "voyage-3.5";
export const EMBEDDING_DIM = 1024;

const BATCH_SIZE = 64;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export type InputType = "document" | "query";

export function splitIntoBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export function backoffDelay(attempt: number, random = Math.random): number {
  return BASE_DELAY_MS * 2 ** attempt * (0.5 + random() * 0.5);
}

export function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
  usage: { total_tokens: number };
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function embedBatch(texts: string[], inputType: InputType): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    let res : Response;
    try {
      res = await fetch(VOYAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
          input: texts,
          model: MODEL,
          input_type: inputType,
        }),
      });
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw err;
    }

    if (res.ok) {
      const json = (await res.json()) as VoyageResponse;
      return json.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);
    }

    if (isRetryable(res.status) && attempt < MAX_RETRIES) {
      await sleep(backoffDelay(attempt));
      continue;
    }
    throw new Error(`Voyage API error ${res.status}: ${await res.text()}`);
  }
}

export async function embed(texts: string[], inputType: InputType = "document"): Promise<number[][]> {
  const results: number[][] = [];
  for (const batch of splitIntoBatches(texts, BATCH_SIZE)) {
    results.push(...(await embedBatch(batch, inputType)));
  }
  return results;
}
