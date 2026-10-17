import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => path.relative(dir, path.join(e.parentPath, e.name)))
    .filter(rel => !rel.split(path.sep).some(seg => seg.startsWith('.')))
    .map(rel => rel.split(path.sep).join('/'))
    .sort();
}
