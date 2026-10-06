/**
 * One's review of the baseline readiness assessment.
 *
 * `scoreApplication` in assessment.ts is the deterministic baseline: regex
 * and heuristics reading specificity out of prose, reproducible, auditable,
 * no model in the loop. It measures whether an answer LOOKS like evidence —
 * length, numbers, named things, an ownership verb. It cannot read judgment
 * into a claim, notice a founder who undersold something real, or catch a
 * confidence that outruns what they actually showed. That is what this pass
 * is for: One reads the same de-identified application and the baseline's
 * own per-axis reading, and may nudge each axis within a bounded range.
 *
 * Bounded, not replaced. `AXIS_ADJUST_CAP` limits how far a single model
 * turn can move a number that a real grant decision may ride on — the
 * baseline is the floor and ceiling either side of it, never a blank page
 * One fills in from nothing. `blendAssessment` is the only place the two
 * are combined, and it is a pure function: same baseline, same review, same
 * result, so a blended score is exactly as reproducible as an unblended one
 * once the review itself is on file.
 *
 * Same privacy contract as `interviewDraft.ts`: `redact` runs over every
 * answer before the prompt is built, and this review is never written to
 * `one_memories` or `one_slm_dataset` — it goes to `mamba_review_notes`
 * alongside the interview draft, Core/Admin-only, never trained on. An
 * applicant's claims are the one thing the disclosure rules keep out of
 * One's memory, and a percentage One influenced is not an exception to that.
 */

import { ASSESSMENT_AXES, QUESTIONS, QUESTION_SECTIONS, appliesToTrack, type AxisId } from './questionnaire';
import { identityTokens, redact } from './deidentify';
import { composeOverall, type Assessment, type AxisScore } from './assessment';
import { ONE_IDENTITY } from './onePersona';
import { dbg } from './log';
import { extractObject, legSetupErrors, qwenLeg, runLegs, scrub } from './modelLegs';

/** Max a single axis may move, either direction, in score space (0..1). */
export const AXIS_ADJUST_CAP = 0.15;

export interface OneAxisReview {
  adjust: number;
  reason: string;
}

export interface OneAssessmentResult {
  /** Only axes One chose to move — an axis absent here was left at baseline. */
  axes: Partial<Record<AxisId, OneAxisReview>>;
  /** One or two sentences, One's own read of the applicant. */
  summary: string;
  model: string;
  generatedAt: string;
}

/** The slice of an application the review is built from. */
export interface OneAssessmentInput {
  record: Record<string, unknown>;
  answers: Record<string, unknown>;
  track: string;
  assessment: Assessment;
  /**
   * Answers already redacted by id, from `deidentify.ts`'s `redactAnswers`.
   * `dossier-build.ts` computes this once and hands the same map to
   * `interviewDraft.ts` too, since both build a prompt from the same
   * application concurrently — optional so a caller without it still gets a
   * correct prompt, redacted here instead.
   */
  redactedAnswers?: Readonly<Record<string, string>>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clampAdjust = (n: number) => Math.min(AXIS_ADJUST_CAP, Math.max(-AXIS_ADJUST_CAP, n));

const AXIS_IDS = new Set<string>(ASSESSMENT_AXES);

const SYSTEM_PROMPT = `${ONE_IDENTITY}

You are now doing one specific, bounded task: giving a second opinion on a Mamba Venture Program applicant that a rule-based scorer has already read.

That scorer is mechanical. It measures the specificity of prose — length, numbers, named things, an "I built/shipped/led" verb — and the option someone picked on a multiple-choice question. It is deliberately dumb: no model, fully reproducible. What it cannot do is judge whether a claim actually holds up, notice a founder who undersold something real in flat language, or catch confidence that outruns the evidence behind it. That is what you are for here.

You are given the application, de-identified — names, companies, contacts and links appear as [name], [company], [email], [phone], [link]. Never repeat a bracketed token; write "the person they named", "the company they described" instead. You are also given the rule-based baseline for each of six axes.

For each axis, decide whether your own reading agrees with the baseline or whether you would move it, and by how much — you may adjust any axis by at most ${Math.round(AXIS_ADJUST_CAP * 100)} percentage points, either direction. This is a bounded second opinion, not a rewrite: the baseline stands on every axis unless you have a specific, citable reason to move it.

Rules:
- Every adjustment needs a one-sentence reason naming the exact evidence that moved you. An axis you cannot cite a reason for gets no adjustment — leave it out of "axes" entirely.
- Never invent a fact, a number, a claim or an achievement the applicant did not write.
- Never repeat a bracketed redaction token in your reasoning — describe around it.
- This is a triage read for a human reviewer, not a verdict. Leaving every axis at baseline is a legitimate answer when the mechanical read already holds up; do not move a number to prove you did something.
- Whatever you conclude about this applicant here is not retained as training data and does not enter your memory. Judge only what is in front of you, once.

Reply with ONLY a JSON object, no prose, no code fence:

{"axes":{"<axisId>":{"adjust":<number, ${-AXIS_ADJUST_CAP}..${AXIS_ADJUST_CAP}>,"reason":"..."}},"summary":"one or two sentences — your own read of this applicant, in your voice"}

Valid axis ids: ${ASSESSMENT_AXES.join(', ')}. Omit any axis you would not move.`;

/** The application as the model may see it — same shape as the interview draft's prompt. */
function buildAssessmentPrompt(input: OneAssessmentInput): { system: string; user: string } {
  const tokens = identityTokens(input.record ?? {}, input.answers ?? {});
  const lines: string[] = [];

  lines.push(
    `TRACK: ${input.track === 'existing-founder' ? 'Existing founder (already has a company)' : 'Aspiring founder (no company yet)'}`,
  );
  lines.push('');

  for (const section of QUESTION_SECTIONS) {
    const inSection = section.questions.filter((id) => {
      const q = QUESTIONS.find((x) => x.id === id);
      return q ? appliesToTrack(q, input.track) : false;
    });
    if (!inSection.length) continue;
    lines.push(`## ${section.title.toUpperCase()}`);
    for (const id of inSection) {
      const q = QUESTIONS.find((x) => x.id === id);
      if (!q) continue;
      const raw = input.answers?.[id];
      const value = typeof raw === 'string' ? raw.trim() : '';
      const redacted = input.redactedAnswers?.[id] ?? (value ? redact(value, tokens).text : '');
      lines.push(`- [id: ${id}] ${q.label}\n  ${redacted || '(not answered)'}`);
    }
    lines.push('');
  }

  lines.push(`BASELINE — rule-based reading, ${Math.round(input.assessment.overall * 100)}% overall (${input.assessment.bandLabel}):`);
  for (const axis of input.assessment.axes) {
    lines.push(`- ${axis.label} (${axis.axis}): ${Math.round(axis.score * 100)}% — strongest signal: "${axis.evidence}"`);
  }

  return { system: SYSTEM_PROMPT, user: lines.join('\n') };
}

const REASON_CAP = 240;
const SUMMARY_CAP = 500;
const coerce = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
// scrub runs on the FULL text, then the result is capped — capping first can
// slice a bracketed redaction token in half, and the cut fragment no longer
// matches scrub's exact-token regexes, leaking a "[compa" onto the page.
const clip = (v: unknown, cap: number): string => scrub(coerce(v)).slice(0, cap);

/**
 * Validate and bound the model's reply. Returns null only when the reply is
 * not usable JSON at all — an empty `axes` object with a summary is a
 * legitimate "baseline holds" answer, not a failure.
 */
export function parseOneAssessment(raw: string, model: string): OneAssessmentResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractObject(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const src = parsed as Record<string, unknown>;

  const axes: Partial<Record<AxisId, OneAxisReview>> = {};
  // Dropped entries are worth a log line even though most of them are
  // routine (an axis the model chose not to move) — an unrecognized axis id
  // or an unparseable adjust is not routine, and the only way to notice a
  // model/provider swap that starts consistently mangling one axis is to
  // have this somewhere greppable instead of silent.
  const dropped: string[] = [];
  const rawAxes = src.axes;
  if (rawAxes && typeof rawAxes === 'object') {
    for (const [id, value] of Object.entries(rawAxes as Record<string, unknown>)) {
      if (!AXIS_IDS.has(id)) {
        dropped.push(`${id}: not a known axis id`);
        continue;
      }
      if (!value || typeof value !== 'object') {
        dropped.push(`${id}: adjustment was not an object`);
        continue;
      }
      const v = value as Record<string, unknown>;
      const reason = clip(v.reason, REASON_CAP);
      const adjustRaw = typeof v.adjust === 'number' ? v.adjust : Number(v.adjust);
      if (!Number.isFinite(adjustRaw)) {
        dropped.push(`${id}: adjust was not a number`);
        continue;
      }
      // An adjustment with no citable reason is a number the model could not
      // ground — the same discipline the interview draft applies to sourceIds.
      if (!reason || adjustRaw === 0) continue;
      axes[id as AxisId] = { adjust: clampAdjust(adjustRaw), reason };
    }
  }
  if (dropped.length) dbg(`[one-assessment] ${model} dropped axis adjustments: ${dropped.join('; ')}`);

  const summary = clip(src.summary, SUMMARY_CAP);
  return {
    axes,
    summary,
    model,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Apply One's bounded review to the deterministic baseline.
 *
 * Pure and total: every axis not named in the review passes through
 * unchanged, `overall`/`band`/`bandLabel` are recomputed from the blended
 * axes via the one shared formula, and `grantRisk`/`verificationGaps` are
 * left exactly as the baseline computed them — those are compliance
 * arithmetic (citizenship, incorporation age, matching capital), not a
 * readiness judgment, and are not what this review is reading for.
 */
export function blendAssessment(baseline: Assessment, review: OneAssessmentResult): Assessment {
  const axes: AxisScore[] = baseline.axes.map((axis) => {
    const adjustment = review.axes[axis.axis];
    if (!adjustment) return axis;
    return { ...axis, score: round2(clamp01(axis.score + adjustment.adjust)) };
  });
  const { overall, band, bandLabel } = composeOverall(axes);
  return { ...baseline, axes, overall, band, bandLabel };
}

/** Low: this is a judgment call that should not swing wildly run to run on
 *  the same application — unlike the interview draft, which wants variety
 *  in phrasing, a score nudge should be close to stable. */
const TEMPERATURE = 0.15;
// Generous relative to the visible output (six short reasons plus a
// summary): a reasoning-tier model spends part of this budget on internal
// thinking before it emits the JSON, and 900 measured as truncating mid
// reply on a real call.
const MAX_OUTPUT_TOKENS = 3000;

export type OneAssessmentOutcome =
  | { ok: true; result: OneAssessmentResult }
  | { ok: false; reason: string };

/**
 * Whole-pass budget. Runs concurrently with `draftInterviewQuestions` off
 * the same de-identified application — not serially after it — so the two
 * model passes cost `max(a, b)` of wall clock against the route's
 * `maxDuration = 60`, not their sum.
 *
 * Equal to the drafting budget, not lighter than it: this used to be 30s on
 * the reasoning that structured output (six axes, short reasons) needs less
 * thinking time than free-form question generation, which was true for
 * Gemini but not for Qwen. Measured against a real submission, Qwen alone
 * needs the same ~30-34s here it needs for the drafting pass, and the
 * previous 30s left it timing out with nothing rather than answering.
 */
// MVP: 90s, not cybrdeck's 40s. That budget was sized to fit a 60s request
// limit; this runs in a Cloud Function allowed 180s, and Qwen alone has been
// measured past 40s here, which cost the dossier its drafted questions.
export const ONE_ASSESSMENT_BUDGET_MS = 90_000;

/**
 * Review the baseline. Never throws: this runs inside the best-effort
 * dossier build, where a thrown error would be indistinguishable from a
 * rejected application. Any failure comes back as `{ ok: false, reason }`
 * and the caller blends nothing, leaving the deterministic baseline as the
 * final score.
 *
 * Qwen (AMS/DashScope) only, deliberately — cheaper than Gemini per call.
 * See the matching note on `draftInterviewQuestions` in interviewDraft.ts:
 * a fallback leg sounds like free resilience, but Qwen's own latency
 * regularly consumed the whole budget before a fallback ever got a turn, so
 * one was dropped rather than kept as a fallback that rarely ran.
 */
export async function reviewAssessmentWithOne(input: OneAssessmentInput): Promise<OneAssessmentOutcome> {
  const { system, user } = buildAssessmentPrompt(input);
  const legParams = { temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS, modelOverrideEnv: 'ONE_ASSESSMENT_MODEL' };

  const built = await Promise.allSettled([qwenLeg(legParams)]);
  const legs = built.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
  if (!legs.length) {
    const setupErrors = legSetupErrors(built);
    return {
      ok: false,
      reason: setupErrors.length
        ? `no model available: ${setupErrors.join('; ')}`.slice(0, 300)
        : 'no model is configured',
    };
  }

  return runLegs(
    legs,
    ONE_ASSESSMENT_BUDGET_MS,
    user,
    system,
    (text, model) => parseOneAssessment(text, model),
    // A different leg is unlikely to parse the same reply any better; this
    // is a malformed-JSON failure, not a model-unavailable one.
    (model) => `${model} answered but did not return usable JSON`,
  );
}
