export type Chunk = {
  heading: string;
  chunkIndex: number;
  content: string;
};

export type ChunkOptions = {
  maxChars: number;
  minChars: number;
  overlap: number;
};

const DEFAULTS: ChunkOptions = { maxChars: 800, minChars: 100, overlap: 120 };

type Section = { heading: string; body: string };

function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const stack: string[] = [];
  let lines: string[] = [];
  let inFence = false;

  const flush = () => {
    const body = lines.join('\n').trim();
    if (body) sections.push({ heading: stack.join(' > '), body });
    lines = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      inFence = !inFence;
      lines.push(line);
      continue;
    }
    const m = inFence ? null : /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      stack.length = Math.min(stack.length, m[1].length - 1);
      stack.push(m[2]);
    } else {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

function mergeSmall(sections: Section[], minChars: number): Section[] {
  const out: Section[] = [];
  for (const s of sections) {
    const prev = out[out.length - 1];
    if (prev && prev.body.length < minChars) {
      prev.body += `\n\n${s.heading}\n${s.body}`;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

function splitLong(body: string, maxChars: number, overlap: number): string[] {
  if (body.length <= maxChars) return [body];

  const unit = Math.max(1, maxChars - overlap - 2);
  const pieces = body.split(/\n{2,}/).flatMap((para) => {
    const parts: string[] = [];
    for (let i = 0; i < para.length; i += unit) parts.push(para.slice(i, i + unit));
    return parts;
  });

  const chunks: string[] = [];
  let cur = '';
  for (const p of pieces) {
    if (cur === '') {
      cur = p;
    } else if (cur.length + 2 + p.length <= maxChars) {
      cur += `\n\n${p}`;
    } else {
      chunks.push(cur);
      const tail = overlap > 0 ? cur.slice(-overlap) : '';
      cur = tail ? `${tail}\n\n${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function chunkMarkdown(markdown: string, options: Partial<ChunkOptions> = {},): Chunk[] {
  const { maxChars, minChars, overlap } = { ...DEFAULTS, ...options };
  const sections = mergeSmall(parseSections(markdown), minChars);

  const chunks: Chunk[] = [];
  for (const s of sections) {
    for (const content of splitLong(s.body, maxChars, overlap)) {
      chunks.push({ heading: s.heading, chunkIndex: chunks.length, content });
    }
  }
  return chunks;
}
