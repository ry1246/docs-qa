export type Source = {
  index: number;
  sourcePath: number;
  heading: string | null;
  score: number;
};

export type AskEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'delta'; text: string }
  | { type: 'done'; truncated: boolean }
  | { type: 'error'; message: string };

type RawEvent = { event: string; data: string };

export function parseSSE(buffer: string): { events: RawEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const rest = blocks.pop() ?? '';
  const events: RawEvent[] = [];

  for (const block of blocks) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue;
      const sep = line.indexOf(':');
      const field = sep === -1 ? line : line.slice(0, sep);
      const value = sep === -1 ? '' : line.slice(sep + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') dataLines.push(value);
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') });
  }

  return { events, rest };
}

function toAskEvent({ event, data }: RawEvent): AskEvent | null {
  const payload = JSON.parse(data);
  switch (event) {
    case 'sources':
      return { type: 'sources', sources: payload as Source[] };
    case 'delta':
      return { type: 'delta', text: payload as string };
    case 'done':
      return { type: 'done', truncated: Boolean(payload.truncated) };
    case 'error':
      return { type: 'error', message: String(payload.message ?? 'unknown error') };
    default:
      return null;
  }
}

export async function* ask(question: string, signal: AbortSignal): AsyncGenerator<AskEvent> {
  const res = await fetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const { events, rest } = parseSSE(buffer);
    buffer = rest;
    for (const raw of events) {
      const ev = toAskEvent(raw);
      if (ev) yield ev;
    }
  }
}
