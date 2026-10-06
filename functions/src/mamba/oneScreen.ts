/**
 * One's ICP screen: should this applicant get an interview at all?
 *
 * The readiness score answers "how ready is this person"; this answers the
 * question a reviewer actually has before giving up an hour: are they the
 * person the program is for, are they telling the truth about themselves,
 * and is the idea worth building. It reads the same de-identified answers
 * as One's review, plus public evidence from the links the applicant gave
 * (publicEvidence.ts), and returns a triage recommendation with reasons.
 *
 * The ideal applicant, as Ben put it: willing to learn; hungry and driven to
 * grow; building something of their own, better still for the greater good;
 * going after a vertical they have an edge in; has the time and commitment;
 * and can pay at least 50% of the fee upfront.
 *
 * Two of those are facts the form asks outright, so they are hard gates the
 * model cannot talk its way past (`applyGates`): an applicant who says they
 * cannot afford the fee is a pass, and one who has not worked out the hours
 * is at best a maybe. Everything else is One's judgement, shown with its
 * evidence, for a human to accept or overrule. It never rejects anyone on
 * its own: it decides the order a reviewer reads in and what they ask.
 *
 * Same privacy contract as oneAssessment.ts: the prompt only ever sees
 * redacted text, and the result goes to the reviewer, never to training.
 */

import { QUESTIONS, QUESTION_SECTIONS, appliesToTrack } from './questionnaire';
import { identityTokens, redact } from './deidentify';
import type { Assessment } from './assessment';
import { ONE_IDENTITY } from './onePersona';
import { evidenceLines, type PublicEvidence } from './publicEvidence';
import { extractObject, legSetupErrors, qwenLeg, runLegs, scrub } from './modelLegs';

export const ICP_CRITERIA = [
  { id: 'learn', label: 'Willing to learn' },
  { id: 'hunger', label: 'Hungry and driven to grow' },
  { id: 'ownership', label: 'Building their own thing, or for the greater good' },
  { id: 'edge', label: 'A vertical they have an edge in' },
  { id: 'time', label: 'Has the time and commitment' },
  { id: 'money', label: 'Can pay at least 50% upfront' },
] as const;
export type IcpId = (typeof ICP_CRITERIA)[number]['id'];
export type Verdict = 'yes' | 'unclear' | 'no';
export type Recommendation = 'interview' | 'maybe' | 'pass';

export interface IcpScreen {
  recommendation: Recommendation;
  /** Why, in two to four short lines. Gate reasons come first. */
  reasons: string[];
  icp: Record<IcpId, { verdict: Verdict; evidence: string }>;
  /** Places the applicant claims more than they show. */
  overstatements: { claim: string; concern: string; ask: string }[];
  market: {
    verdict: 'promising' | 'unproven' | 'weak';
    whoPays: string;
    competition: string;
    sizeSignal: string;
    risks: string[];
  };
  redFlags: string[];
  greenFlags: string[];
  /** Claims checked against the public evidence. */
  claimChecks: { claim: string; status: 'confirmed' | 'contradicted' | 'unverified'; basis: string }[];
  /** Hard gates that overrode or capped One's recommendation. */
  gates: string[];
  /** What One recommended before the gates, kept so a reviewer can see an override. */
  modelRecommendation: Recommendation;
  model: string;
  generatedAt: string;
}

export interface IcpScreenInput {
  record: Record<string, unknown>;
  answers: Record<string, unknown>;
  track: string;
  intake: string;
  assessment: Assessment;
  evidence: PublicEvidence;
  redactedAnswers?: Readonly<Record<string, string>>;
}

const SYSTEM_PROMPT = `${ONE_IDENTITY}

You are now doing one specific task: screening a Mamba Venture Program applicant before a human decides whether to spend an interview on them. The founders would rather interview ten of the right people than give twenty minutes to the wrong one. Be the filter they would be if they had time to read every word: fair, sceptical, specific.

THE IDEAL APPLICANT (ICP), six criteria:
- learn: willing to learn. Shows they changed their mind on evidence, asks for feedback, names what they do not know.
- hunger: hungry and driven to grow. Has already done things without being asked; momentum, not wishes.
- ownership: wants to build something of their own, better still something for the greater good. Not a job hunt, a credential, or a grant chase.
- edge: going after a vertical they can actually capitalise on: domain years, access, a network or an unfair insight in that market.
- time: has the time and commitment, already arranged, not hoped for.
- money: can pay at least 50% of the program fee upfront.

ALSO LOOK FOR (put what you find in redFlags or greenFlags):
- Overstatement: titles, numbers or results bigger than the detail behind them; "we" where the work sounds like someone else's; revenue, users or partnerships with no figure, no name or no date; "AI-powered platform" language standing in for a product.
- Inconsistency between answers: years of experience against claimed seniority, the stage they claim against what they describe, the hours they promise against the life they describe.
- Generic or machine-written answers: polished prose that would fit any applicant and contains nothing only this person could know.
- Grant chasing: the program as a route to public money rather than to a business; salary as the main use of funds.
- Solution looking for a problem; no customer conversations; a market described by its total size only.
- Coachability tells: blaming others for past failures, or a "wrong assumption" that is really a humblebrag.
- Green flags: specific customers spoken to, things shipped, money already spent or earned, honest admissions, a clear reason why them and why now.

MARKET VIABILITY: judge the idea itself, from what they wrote and what you know of the market. Who pays, and would they pay enough? Who already does this (name real competitors or substitutes you are confident exist; do not invent companies)? Is there any signal of size or demand beyond a TAM figure? What would kill it?

PUBLIC EVIDENCE: you are given what our system read from the links the applicant supplied (their product or portfolio page and their public GitHub). Use it to check their claims. A claim is "confirmed" only if the evidence shows it, "contradicted" if the evidence shows otherwise (a dead product link, a GitHub with no code where they claim to be technical, an account created last week), and "unverified" otherwise. Not giving a link is neither a contradiction nor a red flag, and a link our system could not read tells you nothing about the applicant. Never claim to have checked anything you were not given.

The application is de-identified: names, companies, contacts and links appear as [name], [company], [email], [phone], [link]. Never repeat a bracketed token; describe around it.

Rules:
- Quote or closely paraphrase the applicant's own words as evidence. Never invent a fact.
- "unclear" is the honest verdict when the application does not say. Do not guess "yes" to be kind or "no" to be tough.
- recommendation: "interview" if they plausibly fit the ICP and nothing serious is unexplained; "maybe" if they could fit but something important needs checking first; "pass" if they clearly do not fit, or the overstatement is serious enough that an interview would be wasted.
- Each overstatement needs a question the interviewer can ask to test it.
- Keep every string short: one sentence, under 30 words.
- This read is not retained and does not enter your memory.

Reply with ONLY a JSON object, no prose, no code fence:

{"recommendation":"interview|maybe|pass","reasons":["..."],"icp":{"learn":{"verdict":"yes|unclear|no","evidence":"..."},"hunger":{...},"ownership":{...},"edge":{...},"time":{...},"money":{...}},"overstatements":[{"claim":"...","concern":"...","ask":"..."}],"market":{"verdict":"promising|unproven|weak","whoPays":"...","competition":"...","sizeSignal":"...","risks":["..."]},"redFlags":["..."],"greenFlags":["..."],"claimChecks":[{"claim":"...","status":"confirmed|contradicted|unverified","basis":"..."}]}`;

const RECORD_FIELDS: [string, string][] = [
  ['yearsExperience', 'Years of relevant experience'],
  ['role', 'Role or title'],
  ['currentSituation', 'What they are working on today, and what they want to change'],
  ['motivation', 'What they want out of the program, and what they will bring'],
];

function buildPrompt(input: IcpScreenInput): string {
  const tokens = [...identityTokens(input.record ?? {}, input.answers ?? {})];
  // Their GitHub login and site host name them as surely as their name does.
  if (input.evidence.github?.login) tokens.push(input.evidence.github.login);
  try {
    const host = input.evidence.site ? new URL(/^https?:/i.test(input.evidence.site.url) ? input.evidence.site.url : `https://${input.evidence.site.url}`).hostname.replace(/^www\./, '') : '';
    if (host) tokens.push(host, ...host.split('.').filter((part) => part.length >= 4));
  } catch { /* an invalid link carries no host */ }
  const r = (s: string) => (s ? redact(s, tokens).text : '');

  const lines: string[] = [];
  lines.push(`TRACK: ${input.track === 'existing-founder' ? 'Existing founder (already has a company)' : 'Aspiring founder (no company yet)'}`);
  lines.push(`INTAKE: ${input.intake === '1 Month' ? '1-month sprint, S$2,500' : '3-month venture build, S$5,999'}; 50% may be paid upfront, the rest before the program ends.`);
  lines.push('');
  lines.push('## ABOUT THEM');
  for (const [id, label] of RECORD_FIELDS) {
    const v = typeof input.record?.[id] === 'string' ? (input.record[id] as string).trim() : '';
    lines.push(`- ${label}: ${r(v) || '(not answered)'}`);
  }
  lines.push('');
  for (const section of QUESTION_SECTIONS) {
    const ids = section.questions.filter((id) => {
      const q = QUESTIONS.find((x) => x.id === id);
      return q ? appliesToTrack(q, input.track) : false;
    });
    if (!ids.length) continue;
    lines.push(`## ${section.title.toUpperCase()}`);
    for (const id of ids) {
      const q = QUESTIONS.find((x) => x.id === id)!;
      const raw = input.answers?.[id];
      const value = typeof raw === 'string' ? raw.trim() : '';
      const red = input.redactedAnswers?.[id] ?? r(value);
      lines.push(`- [${id}] ${q.label}\n  ${red || '(not answered)'}`);
    }
    lines.push('');
  }
  lines.push(`RULE-BASED READINESS: ${Math.round(input.assessment.overall * 100)}% (${input.assessment.bandLabel}); grant liability risk ${input.assessment.grantRisk}.`);
  lines.push('');
  lines.push('## PUBLIC EVIDENCE (read by our system from the links they gave, today)');
  lines.push(...evidenceLines(input.evidence).map(r));
  return lines.join('\n');
}

const S = 260;
const coerce = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const clip = (v: unknown, cap = S) => scrub(coerce(v)).slice(0, cap);
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => clip(x)).filter(Boolean).slice(0, max) : []);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(coerce(v).toLowerCase() as T) ? (coerce(v).toLowerCase() as T) : fallback;

export function parseIcpScreen(raw: string, model: string): Omit<IcpScreen, 'gates' | 'modelRecommendation'> | null {
  let src: Record<string, unknown>;
  try {
    const parsed = JSON.parse(extractObject(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    src = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  const icpSrc = (src.icp && typeof src.icp === 'object' ? src.icp : {}) as Record<string, Record<string, unknown> | undefined>;
  const icp = Object.fromEntries(
    ICP_CRITERIA.map(({ id }) => [
      id,
      { verdict: pick<Verdict>(icpSrc[id]?.verdict, ['yes', 'unclear', 'no'], 'unclear'), evidence: clip(icpSrc[id]?.evidence) },
    ]),
  ) as IcpScreen['icp'];
  const m = (src.market && typeof src.market === 'object' ? src.market : {}) as Record<string, unknown>;
  const objs = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').slice(0, max) : []) as Record<string, unknown>[];
  return {
    recommendation: pick<Recommendation>(src.recommendation, ['interview', 'maybe', 'pass'], 'maybe'),
    reasons: list(src.reasons, 4),
    icp,
    overstatements: objs(src.overstatements, 5)
      .map((o) => ({ claim: clip(o.claim), concern: clip(o.concern), ask: clip(o.ask) }))
      .filter((o) => o.claim && o.ask),
    market: {
      verdict: pick(m.verdict, ['promising', 'unproven', 'weak'] as const, 'unproven'),
      whoPays: clip(m.whoPays),
      competition: clip(m.competition),
      sizeSignal: clip(m.sizeSignal),
      risks: list(m.risks, 4),
    },
    redFlags: list(src.redFlags, 6),
    greenFlags: list(src.greenFlags, 6),
    claimChecks: objs(src.claimChecks, 6)
      .map((c) => ({ claim: clip(c.claim), status: pick(c.status, ['confirmed', 'contradicted', 'unverified'] as const, 'unverified'), basis: clip(c.basis) }))
      .filter((c) => c.claim),
    model,
    generatedAt: new Date().toISOString(),
  };
}

const RANK: Record<Recommendation, number> = { pass: 0, maybe: 1, interview: 2 };

/**
 * The criteria the form asks outright. Pure: same answers, same gates.
 * Exported so the email can still say something when the model is down.
 */
export function icpGates(answers: Record<string, unknown>): { cap: Recommendation; reason: string; criterion: IcpId; verdict: Verdict }[] {
  const out: { cap: Recommendation; reason: string; criterion: IcpId; verdict: Verdict }[] = [];
  const afford = String(answers.affordability ?? '');
  if (afford === 'I cannot afford it right now') out.push({ cap: 'pass', criterion: 'money', verdict: 'no', reason: 'Says they cannot afford the fee right now.' });
  else if (afford === 'My employer or a sponsor would pay') out.push({ cap: 'maybe', criterion: 'money', verdict: 'unclear', reason: 'Fee depends on an employer or sponsor; confirm it is agreed.' });
  const hours = String(answers.availability ?? '');
  if (hours === 'I have not worked out how yet') out.push({ cap: 'maybe', criterion: 'time', verdict: 'no', reason: 'Has not worked out how to free the program hours.' });
  return out;
}

export function applyGates(screen: Omit<IcpScreen, 'gates' | 'modelRecommendation'>, answers: Record<string, unknown>): IcpScreen {
  const gates = icpGates(answers);
  let rec = screen.recommendation;
  const icp = { ...screen.icp };
  for (const g of gates) {
    if (RANK[g.cap] < RANK[rec]) rec = g.cap;
    icp[g.criterion] = { verdict: g.verdict, evidence: g.reason };
  }
  return {
    ...screen,
    icp,
    recommendation: rec,
    reasons: [...gates.map((g) => g.reason), ...screen.reasons].slice(0, 5),
    gates: gates.map((g) => g.reason),
    modelRecommendation: screen.recommendation,
  };
}

export type IcpScreenOutcome = { ok: true; result: IcpScreen } | { ok: false; reason: string };

/** Runs beside the draft and the review; the evidence fetch is bounded at ~8s. */
export const ICP_SCREEN_BUDGET_MS = 85_000;

/** Never throws. */
export async function screenApplicant(input: IcpScreenInput): Promise<IcpScreenOutcome> {
  try {
    const user = buildPrompt(input);
    const built = await Promise.allSettled([
      qwenLeg({ temperature: 0.2, maxOutputTokens: 6000, modelOverrideEnv: 'ONE_SCREEN_MODEL' }),
    ]);
    const legs = built.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
    if (!legs.length) {
      const errs = legSetupErrors(built);
      return { ok: false, reason: errs.length ? `no model available: ${errs.join('; ')}`.slice(0, 300) : 'no model is configured' };
    }
    const out = await runLegs(
      legs,
      ICP_SCREEN_BUDGET_MS,
      user,
      SYSTEM_PROMPT,
      (text, model) => parseIcpScreen(text, model),
      (model) => `${model} answered but did not return usable JSON`,
    );
    return out.ok ? { ok: true, result: applyGates(out.result, input.answers) } : out;
  } catch (err) {
    return { ok: false, reason: `screen threw: ${(err as Error)?.message ?? err}`.slice(0, 300) };
  }
}

/** Plain-text block for the reviewer email. */
export function screenText(s: IcpScreen | null, fallbackReason: string, answers: Record<string, unknown>): string[] {
  const mark: Record<Verdict, string> = { yes: 'YES    ', unclear: 'UNCLEAR', no: 'NO     ' };
  if (!s) {
    const gates = icpGates(answers);
    return [
      `ICP SCREEN: unavailable (${fallbackReason}).`,
      ...(gates.length ? gates.map((g) => `  Gate: ${g.reason}`) : ['  No hard gates tripped.']),
    ];
  }
  const out = [
    `ICP SCREEN: ${s.recommendation.toUpperCase()}${s.modelRecommendation !== s.recommendation ? ` (One said ${s.modelRecommendation}; a hard gate overrode it)` : ''}`,
    ...s.reasons.map((r) => `  - ${r}`),
    '',
    ...ICP_CRITERIA.map(({ id, label }) => `  ${mark[s.icp[id].verdict]}  ${label}${s.icp[id].evidence ? `: ${s.icp[id].evidence}` : ''}`),
  ];
  if (s.overstatements.length) {
    out.push('', 'Possible overstatement:');
    for (const o of s.overstatements) out.push(`  - ${o.claim} ${o.concern}`, `    Ask: ${o.ask}`);
  }
  out.push('', `Market: ${s.market.verdict}`);
  if (s.market.whoPays) out.push(`  Who pays: ${s.market.whoPays}`);
  if (s.market.competition) out.push(`  Competition: ${s.market.competition}`);
  if (s.market.sizeSignal) out.push(`  Demand signal: ${s.market.sizeSignal}`);
  for (const r of s.market.risks) out.push(`  Risk: ${r}`);
  if (s.claimChecks.length) {
    out.push('', 'Claim checks (from the links they gave):');
    for (const c of s.claimChecks) out.push(`  ${c.status.toUpperCase()}: ${c.claim}${c.basis ? `. ${c.basis}` : ''}`);
  }
  if (s.redFlags.length) out.push('', 'Red flags:', ...s.redFlags.map((f) => `  - ${f}`));
  if (s.greenFlags.length) out.push('', 'Green flags:', ...s.greenFlags.map((f) => `  - ${f}`));
  return out;
}
