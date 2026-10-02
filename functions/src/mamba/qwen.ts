/**
 * Qwen on Alibaba Model Studio (DashScope), OpenAI-compatible — a slim copy of
 * cybrdeck-website/src/lib/one/qwen-direct.ts: same workspace, same model
 * order, no tools or history (the assessment review needs neither).
 */
import { warn } from 'firebase-functions/logger';

/** Most-preferred first; `ONE_QWEN_MODEL` is tried ahead of the defaults. */
const QWEN_MODELS = Array.from(
  new Set(
    [
      process.env.ONE_QWEN_MODEL,
      'qwen3.5-122b-a10b',
      'qwen3.5-plus',
      'qwen-plus',
      'qwen3.8-max',
      'qwen-max',
      'qwen-turbo',
    ].filter((m): m is string => Boolean(m && m.trim())),
  ),
);

const key = () => (process.env.DASHSCOPE_API_KEY ?? '').trim();

function baseUrl(): string {
  const clean = (process.env.DASHSCOPE_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (!clean) return 'https://ws-dg511pep2d7rjoz9.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
  return clean.endsWith('/compatible-mode/v1') ? clean : `${clean}/compatible-mode/v1`;
}

export const qwenConfigured = (): boolean => key().length > 0;

export async function generateTextQwen(input: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string; modelUsed: string; error?: string }> {
  if (!qwenConfigured()) return { text: '', modelUsed: '', error: 'DASHSCOPE_API_KEY is not configured' };
  const messages = [
    ...(input.systemPrompt ? [{ role: 'system', content: input.systemPrompt }] : []),
    { role: 'user', content: input.prompt },
  ];
  let lastError = 'no Qwen model attempted';
  for (const model of QWEN_MODELS) {
    try {
      const res = await fetch(`${baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: input.temperature ?? 0.3,
          max_tokens: input.maxOutputTokens ?? 2048,
        }),
      });
      if (!res.ok) {
        lastError = `Qwen ${model} returned ${res.status}: ${(await res.text()).slice(0, 200)}`;
        warn(`[qwen] ${lastError}`);
        continue;
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (text) return { text, modelUsed: model };
      lastError = `Qwen ${model} returned no text`;
    } catch (err) {
      lastError = `Qwen ${model} failed: ${(err as Error)?.message ?? String(err)}`;
      warn(`[qwen] ${lastError}`);
    }
  }
  return { text: '', modelUsed: '', error: lastError };
}
