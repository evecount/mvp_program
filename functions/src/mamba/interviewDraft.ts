/**
 * Model-drafted interview questions for one applicant.
 *
 * The deterministic sheet in `assessment.ts` finds what its eight rules
 * were written to find: a contradiction, a failed grant gate, a risky
 * option, prose too thin to trust. It cannot notice that someone has
 * described three years of domain work and then named a customer segment
 * that has nothing to do with it. This pass reads the same application
 * and writes the questions a reviewer would wish they had thought of.
 *
 * It is an **annotation, never a score**. `scoreApplication` stays the
 * record; nothing here can move a band, and a failed draft leaves the
 * deterministic sheet standing alone rather than degrading the dossier.
 *
 * ## What the model is allowed to see
 *
 * A de-identified application. `redact` runs over every answer and every
 * identity field before the prompt is built, so the name, phone, email,
 * employer, venture and the third-party contact stay inside our
 * infrastructure. The model reasons over claims, not people. That is
 * also what keeps the register page's disclosure — "nothing you write
 * here is published" — true, and it means the drafted questions can go
 * on the internal PDF page and into the reviewer dialog without carrying
 * an identity into a document that gets shared with programme partners.
 *
 * ## What it is not allowed to do
 *
 * Invent. Every returned question must cite the catalogue ids it came
 * from, and `parseInterviewDraft` drops any question that cites nothing
 * real or nothing the applicant actually answered. A question grounded in
 * an answer we never asked is worse than no question, because a reviewer
 * reads it as a finding.
 *
 * Nothing here writes to `one_memories` or `one_slm_dataset`. This prompt
 * is built for one call and thrown away; a training row containing an
 * applicant's claims is the one thing the disclosure rules out.
 */

import { QUESTIONS, QUESTION_SECTIONS, appliesToTrack } from './questionnaire';
import { identityTokens, redact } from './deidentify';
import type { InterviewQuestion } from './assessment';
import { extractObject, legSetupErrors, qwenLeg, runLegs, scrub } from './modelLegs';

/** One drafted question, with its grounding. */
export interface DraftedQuestion {
    question: string;
    /** What in the application prompted it. */
    why: string;
    /** What a good answer would tell the reviewer. */
    reveals: string;
    /** Catalogue question ids this is grounded in. Must be non-empty. */
    sourceIds: string[];
}

export interface InterviewDraft {
    questions: DraftedQuestion[];
    /** Which model actually answered — recorded, never assumed. */
    model: string;
    generatedAt: string;
    /** Questions dropped for citing nothing real. Surfaced, not hidden. */
    dropped: number;
}

/** The slice of an application the draft is built from. */
export interface InterviewDraftInput {
    record: Record<string, unknown>;
    answers: Record<string, unknown>;
    track: string;
    assessment: {
        overall?: number;
        bandLabel?: string;
        axes?: Array<{ axis?: string; label?: string; score?: number; evidence?: string }>;
        grantRisk?: string;
        verificationGaps?: Array<{ id?: string; label?: string }>;
    };
    grants?: Array<{
        id?: string;
        name?: string;
        verdict?: string;
        gap?: string | null;
        reasons?: string[];
    }>;
    /** The deterministic sheet, so the model is told what not to repeat. */
    deterministic?: readonly InterviewQuestion[];
    /**
     * Answers already redacted by id, from `deidentify.ts`'s `redactAnswers`.
     * `dossier-build.ts` computes this once and hands the same map to
     * `oneAssessment.ts` too, since both build a prompt from the same
     * application concurrently — optional so a caller that doesn't have it
     * yet (or a test fixture) still gets a correct prompt, redacted here
     * instead.
     */
    redactedAnswers?: Readonly<Record<string, string>>;
}

export const MAX_DRAFTED = 5;

/** Longest accepted field, in characters. */
const QUESTION_CAP = 240;
const NOTE_CAP = 300;

const clip = (v: unknown, cap: number): string =>
    typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, cap) : '';

const SYSTEM_PROMPT = `You prepare interview questions for a three-month, full-time venture cohort in Singapore. Two founders will read your output before a 45-minute interview with one applicant.

You are given one application: every answer, de-identified (names, companies, contact details and links appear as [name], [company], [email], [phone], [link]), plus the readiness scores and the questions a rule-based pass already produced.

Rules:
- Every question must come from something the applicant actually wrote. Cite the answer ids in "sourceIds". A question you cannot cite is a question you invented, and it will be discarded.
- Square brackets mark identity that was removed before you saw this: [name], [company], [email], [phone], [link]. Never repeat a bracketed token. Write "their employer", "the company they named", "the contact they gave" instead.
- Ask for the evidence that is missing, not for a restatement of what they said. If they claim revenue, ask what would prove it and who would confirm it. If they claim domain depth, ask for the specific decision they owned and what it cost when they got it wrong.
- Do not repeat or rephrase the questions already listed under ALREADY ASKED. Find different ground.
- Never invent a fact, a number, a name, a company, a grant scheme or a market. If the application does not say it, ask about it.
- No yes/no questions. Each must require a concrete account: a time, a number, a name of a decision, a document.
- Do not assess their character, honesty or worth. Ask about the work.
- Write in the founders' plain voice: short, specific, no jargon, no preamble.
- Between 3 and ${MAX_DRAFTED} questions. Fewer, sharper questions beat a long list.

Reply with ONLY a JSON object, no prose and no code fence:

{"questions":[{"question":"...","why":"...","reveals":"...","sourceIds":["id"]}]}

"why" is one sentence naming the answer that prompted it. "reveals" is one sentence on what a good answer would tell the reviewer.`;

/**
 * The application as the model may see it: answers only, redacted, in
 * catalogue order, with unanswered questions marked as such.
 *
 * Exported so the leak assertion can build the exact payload that goes
 * on the wire and scan it for planted identities.
 */
export function buildInterviewPrompt(input: InterviewDraftInput): {
    system: string;
    user: string;
} {
    const tokens = identityTokens(input.record ?? {}, input.answers ?? {});
    const lines: string[] = [];

    lines.push(`TRACK: ${input.track === 'founder' ? 'Founder (building a company)' : 'Employed (bringing a venture from inside an organisation)'}`);
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

    const a = input.assessment ?? {};
    if (typeof a.overall === 'number') {
        lines.push(
            `READINESS: ${Math.round(a.overall * 100)}% — ${a.bandLabel ?? 'unbanded'}. Risk of a grant claim not surviving contact: ${a.grantRisk ?? 'unassessed'}.`,
        );
    }
    for (const axis of a.axes ?? []) {
        if (typeof axis.score !== 'number' || !axis.label) continue;
        lines.push(`- ${axis.label}: ${Math.round(axis.score * 100)}%`);
    }
    const gaps = (a.verificationGaps ?? []).map((g) => g.label).filter(Boolean);
    if (gaps.length) lines.push(`THIN ANSWERS (rules flagged these): ${gaps.join('; ')}`);

    const notEligible = (input.grants ?? []).filter(
        (g) => g.verdict && g.verdict !== 'eligible',
    );
    if (notEligible.length) {
        lines.push('');
        lines.push('GRANT SCREEN — schemes this applicant does not currently clear:');
        for (const g of notEligible) {
            lines.push(`- ${g.name ?? g.id}: ${g.gap ?? (g.reasons ?? [])[0] ?? g.verdict}`);
        }
    }

    const asked = input.deterministic ?? [];
    if (asked.length) {
        lines.push('');
        lines.push('ALREADY ASKED (do not repeat these):');
        // The deterministic sheet quotes the applicant's own answers back
        // inside each question ("You named … as the person who would notice"),
        // so these lines carry identity the answer map above had already had
        // stripped. Redact them on the way in too, or the ALREADY ASKED block
        // reintroduces exactly what the rest of the prompt took out.
        for (const q of asked) lines.push(`- ${redact(q.question, tokens).text}`);
    }

    return { system: SYSTEM_PROMPT, user: lines.join('\n') };
}

/** Ids this applicant actually answered — the only legal grounding. */
export function answeredIds(input: InterviewDraftInput): Set<string> {
    const out = new Set<string>();
    for (const [id, value] of Object.entries(input.answers ?? {})) {
        if (typeof value === 'string' && value.trim()) out.add(id);
    }
    return out;
}

/**
 * Validate and bound the model's reply.
 *
 * Returns null when there is nothing usable, so the caller can fall back
 * to the deterministic sheet rather than print an empty block. A question
 * is dropped when it cites no id at all, cites an id that does not exist
 * in the catalogue, or cites only ids the applicant never answered — the
 * last one catches a model that grounds itself in a question from the
 * other track, which is a polite way of having made something up.
 */
export function parseInterviewDraft(
    raw: string,
    input: InterviewDraftInput,
    model: string,
): InterviewDraft | null {
    const answered = answeredIds(input);
    const known = new Set(QUESTIONS.map((q) => q.id));

    let parsed: unknown;
    try {
        parsed = JSON.parse(extractObject(raw));
    } catch {
        return null;
    }

    const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { questions?: unknown })?.questions)
            ? ((parsed as { questions: unknown[] }).questions)
            : null;
    if (!list) return null;

    const questions: DraftedQuestion[] = [];
    let dropped = 0;

    for (const item of list) {
        if (!item || typeof item !== 'object') {
            dropped += 1;
            continue;
        }
        const src = item as Record<string, unknown>;
        const question = clip(src.question, QUESTION_CAP);
        if (!question) {
            dropped += 1;
            continue;
        }
        const sourceIds = (Array.isArray(src.sourceIds) ? src.sourceIds : [])
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim())
            .filter((s) => known.has(s) && answered.has(s));
        if (!sourceIds.length) {
            dropped += 1;
            continue;
        }
        // A yes/no question cannot produce evidence, which is the entire
        // point of the pass.
        if (/^(is|are|do|does|did|will|would|can|could|have|has)\b/i.test(question)) {
            dropped += 1;
            continue;
        }
        questions.push({
            question: scrub(question),
            why: scrub(clip(src.why, NOTE_CAP)),
            reveals: scrub(clip(src.reveals, NOTE_CAP)),
            sourceIds: [...new Set(sourceIds)],
        });
        if (questions.length >= MAX_DRAFTED) break;
    }

    if (!questions.length) return null;
    return {
        questions,
        model,
        generatedAt: new Date().toISOString(),
        dropped,
    };
}

/**
 * Low but not zero: two applicants with identical answers should not get
 * identical wording, and a reviewer reading five dossiers in a row notices.
 */
const TEMPERATURE = 0.4;
const MAX_OUTPUT_TOKENS = 1600;

/**
 * The outcome of a drafting attempt.
 *
 * A failure carries its reason, because "no model answered" and "the model
 * proposed nothing it could ground" point at different problems: the first
 * is an outage or a billing limit, the second is a thin application.
 * Collapsing them into one silent null is how an annotation feature dies
 * unnoticed — the reviewer sees an empty panel and assumes the application
 * predates the feature, while the real cause is a depleted API key.
 */
export type DraftOutcome =
    | { ok: true; draft: InterviewDraft }
    | { ok: false; reason: string };

/**
 * Whole-pass budget, in milliseconds.
 *
 * The caller is POST /api/mamba/dossier, which runs under `maxDuration = 60`
 * and still has to render a PDF and file it in Drive afterwards. A pro-tier
 * leg that thinks for a minute would consume the entire budget and the
 * applicant would end up with no dossier at all — so the annotation is
 * bounded to leave the rest of the route room to finish. Missing questions
 * are a smaller loss than a missing dossier.
 *
 * Measured, not guessed: the AMS Qwen leg took 34s to return four grounded
 * questions on a full application, so a budget sized for a chat turn would
 * have killed every real draft at the deadline and reported "no reply".
 * Forty seconds, not forty-five: the PDF render and the Drive filing still
 * have to fit inside the same 60s, and losing an annotation is acceptable
 * where losing a dossier is not.
 */
// MVP: 90s, not cybrdeck's 40s. That budget was sized to fit a 60s request
// limit; this runs in a Cloud Function allowed 180s, and Qwen alone has been
// measured past 40s here, which cost the dossier its drafted questions.
export const DRAFT_BUDGET_MS = 90_000;

/**
 * Draft the questions.
 *
 * Never throws: this runs inside the best-effort dossier build, where a
 * thrown error would be indistinguishable from a rejected application. Any
 * failure — no leg configured, no reply, a deadline, an unparseable answer,
 * nothing grounded — comes back as `{ ok: false, reason }`, and the
 * deterministic sheet stands alone.
 *
 * Qwen (AMS/DashScope) only, deliberately — cheaper than Gemini per call,
 * and the fallback chain modelLegs.ts still offers turned out to defeat
 * itself in practice: Qwen's own latency (~30-34s measured) regularly ate
 * the whole per-pass budget before a fallback leg ever got a turn, so
 * keeping one around bought nothing but a false sense of resilience. If
 * DASHSCOPE_API_KEY is not configured, this pass produces nothing rather
 * than silently switching providers.
 */
export async function draftInterviewQuestions(
    input: InterviewDraftInput,
): Promise<DraftOutcome> {
    const { system, user } = buildInterviewPrompt(input);
    const legParams = { temperature: TEMPERATURE, maxOutputTokens: MAX_OUTPUT_TOKENS, modelOverrideEnv: 'ONE_INTERVIEW_MODEL' };

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

    const outcome = await runLegs(
        legs,
        DRAFT_BUDGET_MS,
        user,
        system,
        (text, model) => parseInterviewDraft(text, input, model),
        // A different leg is unlikely to ground itself better in the same
        // application, and burning the rest of the budget to find out costs
        // the dossier the room it needs.
        (model) => `${model} answered but proposed nothing grounded in what this applicant wrote`,
    );
    return outcome.ok ? { ok: true, draft: outcome.result } : outcome;
}
