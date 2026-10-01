/**
 * Shared multi-provider fallback machinery for the Mamba model passes.
 *
 * MVP copy: only the Qwen (AMS) leg is kept, since One's assessment review is
 * the only model pass ported and it runs on Qwen alone.
 *
 * `interviewDraft.ts` and `oneAssessment.ts` each read the same
 * de-identified application and call a model, with the same Gemini ->
 * Qwen (AMS) -> DeepSeek (AMS) fallback chain, the same per-call deadline
 * discipline, and the same leg-iteration policy (try each leg in turn
 * within budget; a leg that parses but grounds nothing is terminal, not
 * worth retrying on a different leg). Extracted here so a fix to the
 * deadline race, a new provider, a retired model alias, or a change to how
 * a leg reports its own failure lands in both passes at once instead of
 * drifting between two near-identical copies.
 */

/** A leg's reply, and which model actually produced it. */
export interface LegReply {
  text: string;
  model: string;
}

/**
 * What a leg hands back. `error` is carried rather than swallowed: a leg
 * that returns nothing could be out of credits, unentitled, rate limited or
 * slow, and those need different responses. "no reply" in a reviewer's panel
 * is a dead end; "gemini: prepayment credits depleted" is a fix.
 */
export interface LegOutcome {
  reply: LegReply | null;
  error?: string;
}

export interface Leg {
  name: string;
  run(user: string, system: string, budgetMs: number): Promise<LegOutcome>;
}

/** One line of an error, because provider errors arrive as JSON blobs. */
export function firstLine(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.replace(/\s+/g, ' ').trim().slice(0, 140);
}

/**
 * Run one model call against a deadline.
 *
 * Resolves null when the deadline wins, rather than rejecting: a timeout is
 * an expected outcome here, and the caller's response is to try the next
 * model or give up, not to report an error. The timer is always cleared, so
 * a finished call does not leave the serverless instance waiting on it.
 */
export async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Per-caller knobs: the drafting pass and the assessment review want
 *  different temperature/token budgets, and a different env var name lets
 *  either model be pinned independently in production. */
export interface LegParams {
  temperature: number;
  maxOutputTokens: number;
  /** Env var whose value, if set, is tried before the default model list. */
  modelOverrideEnv: string;
}

/** The AMS Qwen leg, guarded the same way the briefing guards it. */
export async function qwenLeg(params: LegParams): Promise<Leg | null> {
  const { generateTextQwen, qwenConfigured } = await import('./qwen');
  if (!qwenConfigured()) return null;
  return {
    name: 'qwen (ams)',
    async run(user, system, budgetMs) {
      const res = await withDeadline(
        generateTextQwen({
          prompt: user,
          systemPrompt: system,
          temperature: params.temperature,
          maxOutputTokens: params.maxOutputTokens,
        }),
        budgetMs,
      );
      if (!res) return { reply: null, error: 'deadline' };
      const text = (res.text ?? '').trim();
      if (!text) return { reply: null, error: res.error || 'no text' };
      return { reply: { text, model: res.modelUsed || 'qwen (ams)' } };
    },
  };
}

/** Every leg's setup failed to build (as opposed to being unconfigured,
 *  which returns null and is simply dropped) — the reason strings behind
 *  `buildLegs` returning empty, for a caller that wants to report why. */
export function legSetupErrors(
  built: PromiseSettledResult<Leg | null>[],
): string[] {
  return built
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => firstLine(r.reason));
}

/* ── Reply parsing ──────────────────────────────────────────────────────
 * Both passes ask for bare JSON and both have to tolerate a model wrapping
 * it in prose or a code fence, and both scrub a redaction placeholder the
 * model echoes back rather than trust the prompt's instruction alone. */

/**
 * Pull the JSON object (or array) out of a reply that may wrap it in prose
 * or a code fence. The array branch exists for the interview draft, whose
 * reply may be a bare `[...]` list; it is a no-op for a reply that is
 * already an object, so sharing it costs the assessment pass nothing.
 */
export function extractObject(raw: string): string {
  const text = (raw ?? '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : text;
  const start = body.indexOf('{');
  const startArr = body.indexOf('[');
  if (start === -1 && startArr === -1) return body;
  if (startArr !== -1 && (start === -1 || startArr < start)) {
    const end = body.lastIndexOf(']');
    return end > startArr ? body.slice(startArr, end + 1) : body;
  }
  const end = body.lastIndexOf('}');
  return end > start ? body.slice(start, end + 1) : body;
}

/**
 * Remove redaction placeholders a model echoed back at us.
 *
 * The prompt tells it not to, and it mostly complies — but "they mentioned
 * seven years at [name]" reached a reviewer's panel in testing, and a
 * bracketed token in prose reads as a bug in the product rather than as a
 * privacy measure. Instruction plus cleanup, because the instruction alone
 * is a request and this is a guarantee.
 */
export function scrub(text: string): string {
  return text
    .replace(/\[name\]/gi, 'the person they named')
    .replace(/\[company\]/gi, 'the company they named')
    .replace(/\[(email|phone|nric|link|handle)\]/gi, 'the contact they gave')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export type RunLegsOutcome<T> = { ok: true; result: T } | { ok: false; reason: string };

/**
 * Try each leg in turn within a whole-pass budget, parsing the first reply
 * that comes back. A leg that answers but whose reply `parse` rejects is
 * terminal — a different leg is unlikely to ground itself better in the
 * same application or return usable JSON where another leg's raw text did
 * not, and burning the rest of the budget to find out costs the caller (a
 * PDF render, a Drive upload) the room it needs.
 */
export async function runLegs<T>(
  legs: Leg[],
  budgetMs: number,
  user: string,
  system: string,
  parse: (text: string, model: string) => T | null,
  onParseFailure: (model: string) => string,
): Promise<RunLegsOutcome<T>> {
  const started = Date.now();
  const failures: string[] = [];

  for (const leg of legs) {
    const remaining = budgetMs - (Date.now() - started);
    // Under two seconds left is not enough to start a pro-tier call, and
    // starting one would strand whatever runs after this pass (a PDF
    // render, a Drive upload) behind it.
    if (remaining <= 2_000) {
      failures.push('budget exhausted');
      break;
    }

    let outcome: LegOutcome;
    try {
      outcome = await leg.run(user, system, remaining);
    } catch (err) {
      failures.push(`${leg.name}: ${firstLine(err)}`);
      continue;
    }
    if (!outcome.reply) {
      failures.push(`${leg.name}: ${outcome.error ?? 'no reply'}`);
      continue;
    }

    const result = parse(outcome.reply.text, outcome.reply.model);
    if (!result) return { ok: false, reason: onParseFailure(outcome.reply.model) };
    return { ok: true, result };
  }

  return { ok: false, reason: `no model answered (${failures.join('; ')})`.slice(0, 300) };
}
