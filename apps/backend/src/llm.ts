import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-5-5';
export const MAX_TOKENS = 1024;

let client: Anthropic | undefined;

export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
