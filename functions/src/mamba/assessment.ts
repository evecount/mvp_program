/**
 * Mamba Venture Program — the private readiness assessment.
 *
 * This is the half the applicant never sees. The form looks like a normal
 * application; behind it, every answer maps to one of six axes that predict
 * whether someone survives a three-month cohort, and to the grant gates that
 * decide what public money they could actually reach.
 *
 * Two deliberate limits:
 *
 * 1. It scores **evidence, not declarations**. Asking "are you committed?"
 *    measures typing. So each axis is fed by answers that describe something
 *    already true — a week they can actually give, an artifact they already
 *    shipped, a person who would notice if they vanished.
 *
 * 2. It **triages, it does not decide**. Free text can never max an axis on its
 *    own (`textEvidence` caps at 0.85), and the dossier prints the raw answer
 *    beside every score. Cohort 1 is our reputation with EnterpriseSG, SG
 *    Innovation and Mamba Partners; a number is a reading order, not a verdict.
 *
 * Everything here is pure and deterministic — no model call, no clock other than
 * `scoredAt` — so the same answers always produce the same dossier and a check
 * script can assert the invariants in plain Node.
 */
import {
  ASSESSMENT_AXES,
  AXIS_LABEL,
  QUESTIONS,
  getQuestion,
  questionsForTrack,
  type AxisId,
  type Question,
} from './questionnaire';

/* ── Answers ─────────────────────────────────────────────────────────── */

/** The stored application, as the dossier reads it. */
export type Answers = Record<string, string>;

const str = (answers: Answers, id: string): string => {
  const value = answers[id];
  return typeof value === 'string' ? value.trim() : '';
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** First-person ownership: the difference between "the team shipped" and "I shipped". */
const OWNERSHIP =
  /\b(?:i|we)\s+(?:built|shipped|launched|ran|lead|led|wrote|designed|negotiated|closed|sold|recruited|piloted|tested|delivered|finished|signed|raised)\b/i;

/**
 * Specificity of a free-text answer, 0..1.
 *
 * Length is only 70% of it, and the whole thing is capped at 0.85: a wall of
 * text with no numbers, no named things and no "I did" in it should not be able
 * to buy a top score. The bonuses are the parts a reviewer would notice anyway —
 * an amount or a date, a proper noun, and an ownership verb.
 */
export function textEvidence(answer: string): number {
  const words = (answer || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const text = words.join(' ');

  const lengthScore = clamp01(words.length / 140) * 0.7;
  let bonus = 0;
  if (/\d/.test(text)) bonus += 0.12;
  // More than one capitalised word, because the first is just the sentence start.
  if (((text.match(/\b[A-Z][a-z]{2,}\b/g) || []).length) > 1) bonus += 0.08;
  if (OWNERSHIP.test(text)) bonus += 0.1;

  return Math.min(0.85, lengthScore + bonus);
}

/** Weight of a select answer, looked up by exact label. Unknown label scores 0. */
function optionEvidence(question: Question, answer: string): number {
  if (!question.options || !answer) return 0;
  const match = question.options.find((option) => option.label === answer);
  return match ? clamp01(match.weight) : 0;
}

/* ── Axes ────────────────────────────────────────────────────────────── */

/**
 * How much each axis counts toward the overall reading. Commitment leads on
 * purpose: a brilliant founder who cannot give the program their week is the
 * exact case that burns a grant and our standing with the agencies.
 *
 * `coachability` was added alongside the wrongAssumption/failureMode/
 * firstThirtyDays questions — every other weight was scaled down from its
 * original value (commitment 0.22, persistence/execution 0.18, domain 0.16,
 * accountability 0.14, traction 0.12) by the same factor to make room for
 * it, rather than shaving one axis alone to pay for the new one.
 */
export const AXIS_WEIGHT: Record<AxisId, number> = {
  commitment: 0.19,
  persistence: 0.15,
  execution: 0.15,
  domain: 0.14,
  coachability: 0.14,
  accountability: 0.12,
  traction: 0.11,
};

export interface AxisScore {
  axis: AxisId;
  label: string;
  /** 0..1, two decimal places. */
  score: number;
  /** The single answer that moved this axis most — the reviewer's entry point. */
  evidence: string;
}

export const READINESS_BANDS = [
  { id: 'cohort-ready', label: 'Cohort-ready', floor: 0.75 },
  { id: 'strong', label: 'Strong — verify the gaps', floor: 0.55 },
  { id: 'conditional', label: 'Conditional — interview before deciding', floor: 0.4 },
  { id: 'not-this-cohort', label: 'Not this cohort', floor: 0 },
] as const;

export type BandId = (typeof READINESS_BANDS)[number]['id'];

export type GrantRisk = 'low' | 'watch' | 'high';

export interface VerificationGap {
  id: string;
  label: string;
  score: number;
}

export interface Assessment {
  track: string;
  overall: number;
  band: BandId;
  bandLabel: string;
  axes: AxisScore[];
  grantRisk: GrantRisk;
  grantRiskReasons: string[];
  /** Required free-text answers too thin to trust — what to press on in the interview. */
  verificationGaps: VerificationGap[];
  scoredAt: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The weighted overall and its band, from a set of axis scores alone.
 *
 * Pulled out of `scoreApplication` so `oneAssessment.ts` can recompute the
 * same numbers after blending in One's bounded adjustments — the formula
 * has to be the one true place, or the deterministic baseline and the
 * blended result would drift apart on the next axis weight change.
 */
export function composeOverall(axes: readonly AxisScore[]): {
  overall: number;
  band: BandId;
  bandLabel: string;
} {
  // The denominator below assumes full coverage of ASSESSMENT_AXES. A caller
  // handing in a filtered/partial array would otherwise silently deflate
  // `overall` against the full-catalogue weight sum — loud here, not a wrong
  // number a reviewer has to notice on a score that gates real grant money.
  if (axes.length !== ASSESSMENT_AXES.length) {
    throw new Error(
      `composeOverall expects one score per catalogue axis (${ASSESSMENT_AXES.length}), got ${axes.length}`,
    );
  }
  const weightSum = ASSESSMENT_AXES.reduce((sum, axis) => sum + AXIS_WEIGHT[axis], 0);
  const overall = round2(
    axes.reduce((sum, a) => sum + a.score * AXIS_WEIGHT[a.axis], 0) / (weightSum || 1),
  );
  const band = READINESS_BANDS.find((b) => overall >= b.floor) ?? READINESS_BANDS[READINESS_BANDS.length - 1];
  return { overall, band: band.id, bandLabel: band.label };
}

/**
 * Score an application against the six axes.
 *
 * Every question that applies to the track counts toward its axis denominator,
 * including optional ones left blank — otherwise skipping a question would
 * raise the score, which is backwards.
 */
export function scoreApplication(answers: Answers, track: string, now = new Date()): Assessment {
  const applicable = questionsForTrack(track);
  const axes: AxisScore[] = [];

  for (const axis of ASSESSMENT_AXES) {
    const feeders = applicable.filter((q) => q.axis === axis);
    let weighted = 0;
    let denominator = 0;
    let best = { label: '—', score: 0 };

    for (const question of feeders) {
      const weight = question.weight ?? 1;
      const answer = str(answers, question.id);
      const raw =
        question.kind === 'select' ? optionEvidence(question, answer) : textEvidence(answer);
      weighted += raw * weight;
      denominator += weight;
      if (raw > best.score) best = { label: question.label, score: raw };
    }

    axes.push({
      axis,
      label: AXIS_LABEL[axis],
      score: denominator ? round2(weighted / denominator) : 0,
      evidence: best.label,
    });
  }

  const { overall, band, bandLabel } = composeOverall(axes);

  /* ── Grant-liability risk ───────────────────────────────────────────
   * The advisor's warning, made checkable: a candidate who expects the grant
   * to pay their salary, has thought hardest about the money rather than the
   * work, and cannot actually give the program a week, is the profile that
   * walks away in month two and leaves the accountability with us. */
  const commitment = axes.find((a) => a.axis === 'commitment')?.score ?? 0;
  let riskPoints = 0;
  const reasons: string[] = [];

  for (const question of applicable) {
    if (!question.options) continue;
    const answer = str(answers, question.id);
    if (!answer) continue;
    const option = question.options.find((o) => o.label === answer);
    if (!option || typeof option.risk !== 'number') continue;
    riskPoints += option.risk;
    if (option.risk >= 0.6) reasons.push(`"${question.label}" → "${answer}"`);
  }

  if (commitment < 0.45) reasons.push(`Commitment capacity reads ${Math.round(commitment * 100)}%`);
  if (!str(answers, 'weekPlan')) reasons.push('No week-by-week commitment described');

  const grantRisk: GrantRisk =
    riskPoints >= 0.6 && commitment < 0.5 ? 'high' : riskPoints >= 0.6 || commitment < 0.45 ? 'watch' : 'low';

  const verificationGaps: VerificationGap[] = applicable
    .filter((q) => q.required && q.kind !== 'select')
    .map((q) => ({ id: q.id, label: q.label, score: round2(textEvidence(str(answers, q.id))) }))
    .filter((gap) => gap.score < 0.4);

  return {
    track,
    overall,
    band,
    bandLabel,
    axes,
    grantRisk,
    grantRiskReasons: reasons,
    verificationGaps,
    scoredAt: now.toISOString(),
  };
}

/* ── Grant catalogue ───────────────────────────────────────────────────
 * EnterpriseSG and EDB schemes relevant to a cohort applicant, as at
 * September 2026. Amounts and support rates are published figures; the
 * dossier states them so a reviewer can check the applicant against the
 * real gate instead of a remembered one. */

export type GrantVerdict = 'eligible' | 'conditional' | 'not-now';

export interface GrantProgram {
  id: string;
  agency: string;
  name: string;
  support: string;
  /** One line on what it actually funds. */
  what: string;
}

export interface GrantMatch {
  program: GrantProgram;
  verdict: GrantVerdict;
  /** Why, in the reviewer's words. */
  reasons: string[];
  /** The single thing standing between the applicant and an application. */
  gap?: string;
}

export const GRANT_PROGRAMS: readonly GrantProgram[] = [
  {
    id: 'ssgf',
    agency: 'EnterpriseSG',
    name: 'Startup SG Founder',
    support: 'S$20,000–S$50,000, matched 1:1 by the founder',
    what: 'First-time founder grant plus at least 12 months of mentorship through an Accredited Mentor Partner.',
  },
  {
    id: 'ssgt-poc',
    agency: 'EnterpriseSG',
    name: 'Startup SG Tech — Proof-of-Concept',
    support: 'Up to S$250,000, matched 1:1',
    what: 'Commercialising a proprietary technology that has not been proven yet.',
  },
  {
    id: 'ssgt-pov',
    agency: 'EnterpriseSG',
    name: 'Startup SG Tech — Proof-of-Value',
    support: 'Up to S$500,000, matched 1:1',
    what: 'Same scheme, one stage later: technical viability shown, now proving commercial value with customers or investors.',
  },
  {
    id: 'ssge',
    agency: 'EnterpriseSG + EDB',
    name: 'Startup SG Equity',
    support: 'Co-investment alongside a qualifying private investor; S$1B added in Budget 2026',
    what: 'Equity, not a grant. Now covers growth-stage deep tech as well as early stage.',
  },
  {
    id: 'edge',
    agency: 'EnterpriseSG',
    name: 'Enterprise Development Grant (becoming EDGE)',
    support: 'Up to 50% of qualifying costs for SMEs',
    what: 'Capability building — innovation, productivity, market access. EDG, PSG and MRA consolidate into EDGE from 2H 2026.',
  },
  {
    id: 'mra',
    agency: 'EnterpriseSG',
    name: 'Market Readiness Assistance',
    support: 'Up to 70% of eligible costs (1 Apr 2026 – 31 Mar 2029), capped S$100,000 per company per market',
    what: 'Overseas market study, business matching and setting up an in-market presence.',
  },
  {
    id: 'gia',
    agency: 'EnterpriseSG',
    name: 'Global Innovation Alliance (GIA+ and GIA POC)',
    support: 'Up to 50%, capped S$35,000 general tech / S$50,000 deep tech (GIA+); up to 50%, capped S$50,000 (GIA POC)',
    what: 'Fees, airfare and living costs for an accredited overseas accelerator, plus overseas testbedding once a partner is identified.',
  },
  {
    id: 'entrepass',
    agency: 'EnterpriseSG / MOM',
    name: 'Startup SG Talent — EntrePass',
    support: 'Work pass, not funding',
    what: 'Lets a non-citizen founder incorporate and run a Singapore startup, on an innovation criterion.',
  },
  {
    id: 'techsg',
    agency: 'EDB',
    name: 'Tech@SG',
    support: 'Work-pass facilitation for core tech talent',
    what: 'Helps a fast-growing company hire senior global talent. Not an early-stage funding scheme.',
  },
  {
    id: 'efs',
    agency: 'EnterpriseSG',
    name: 'Enterprise Financing Scheme',
    support: 'Government risk-share raised to 70% on SME working capital and project loans (Sep 2026 – Mar 2027)',
    what: 'Debt, not a grant. Needs an operating company and a lender.',
  },
  {
    id: 'scaleup',
    agency: 'EnterpriseSG',
    name: 'Scale-up SG',
    support: 'No fixed grant — a partner-led growth programme',
    what: 'For companies already past S$1m annual revenue that need structured acceleration.',
  },
];

const byId = new Map(GRANT_PROGRAMS.map((p) => [p.id, p]));
const program = (id: string) => byId.get(id)!;

const isLocal = (residency: string) =>
  residency === 'Singapore Citizen' || residency === 'Singapore Permanent Resident';

/**
 * Screen a founder-track application against the schemes it could reach.
 *
 * Every verdict names the missing fact rather than a score, because the gates
 * here are arithmetic — citizenship, company age, local equity, matching
 * capital — and an applicant can usually fix one of them this month.
 */
export function matchGrants(answers: Answers, track: string): GrantMatch[] {
  if (track !== 'founder') return [];

  const residency = str(answers, 'residency');
  const local = isLocal(residency);
  const twoLocalFounders = str(answers, 'coFounderCount') === 'Two or more';
  const firstTime = str(answers, 'firstTimeFounder') === 'No, this would be my first';
  const incorporation = str(answers, 'incorporation');
  const sgIncorporated = incorporation.startsWith('Singapore');
  const youngEnough =
    incorporation === 'Singapore, under 6 months old' || incorporation === 'Not incorporated yet';
  const equity = str(answers, 'localEquity');
  const equity51 = equity === '51% or more';
  const equity30 = equity51 || equity === '30–50%';
  const ip = str(answers, 'proprietaryTech');
  const hasIp = ip === 'Yes, and we own it' || ip === 'In development';
  const stage = str(answers, 'stage');
  const hasRevenue = stage.includes('Revenue');
  const signal = str(answers, 'outsideSignal');
  const paying = signal === 'Yes — someone is paying';
  const piloting = paying || signal === 'Yes — an unpaid pilot is running';
  const capital = str(answers, 'capitalToMatch');
  const canMatch = capital === 'Yes, it is already banked' || capital === 'Yes, I could raise it';
  const overseas = str(answers, 'overseasAmbition');
  const wantsOverseas = overseas.startsWith('Yes');
  const hasOverseasLead = overseas === 'Yes, and we have a partner or lead';

  const matches: GrantMatch[] = [];

  /* Startup SG Founder — the one the landing page promises, and the one with
   * the strictest arithmetic. The company must be under six months old at the
   * point of AMP application, which cannot be repaired later. */
  {
    const missing: string[] = [];
    if (!local) missing.push('First applicant must be a Singapore Citizen or PR');
    if (!firstTime) missing.push('First applicant must be a first-time founder');
    if (!twoLocalFounders) missing.push('Needs at least two SC/PR main applicants');
    if (!youngEnough) missing.push(`Company must be under 6 months old at AMP application — stated: ${incorporation || 'not given'}`);
    if (!equity51) missing.push('At least 51% SC/PR shareholding');
    if (!canMatch) missing.push('Must provide 1:1 matching capital, half of it paid up on ACRA when applying');

    matches.push({
      program: program('ssgf'),
      verdict: missing.length === 0 ? 'eligible' : missing.length <= 2 ? 'conditional' : 'not-now',
      reasons:
        missing.length === 0
          ? ['All published eligibility gates are met on these answers. Apply through an Accredited Mentor Partner, not directly to EnterpriseSG.']
          : missing,
      gap: missing[0],
    });
  }

  /* Startup SG Tech — POC then POV. */
  {
    const reasons: string[] = [];
    if (!sgIncorporated) reasons.push(`Needs a Singapore-incorporated company — stated: ${incorporation || 'not given'}`);
    if (!hasIp) reasons.push(`Needs proprietary technology or IP — stated: ${ip || 'not given'}`);
    if (!canMatch) reasons.push('Matched 1:1, so matching capital has to exist');
    matches.push({
      program: program('ssgt-poc'),
      verdict: reasons.length === 0 ? 'eligible' : reasons.length === 1 ? 'conditional' : 'not-now',
      reasons: reasons.length ? reasons : ['Proprietary tech in a Singapore company with matching capital available.'],
      gap: reasons[0],
    });
  }
  {
    const reasons: string[] = [];
    if (!sgIncorporated) reasons.push('Needs a Singapore-incorporated company');
    if (!hasIp) reasons.push('Needs proprietary technology or IP');
    if (!piloting) reasons.push(`Needs proof of customer or investor interest — stated: ${signal || 'not given'}`);
    if (!canMatch) reasons.push('Matched 1:1, so matching capital has to exist');
    matches.push({
      program: program('ssgt-pov'),
      verdict: reasons.length === 0 ? 'eligible' : reasons.length === 1 ? 'conditional' : 'not-now',
      reasons: reasons.length
        ? reasons
        : ['Proprietary tech in a Singapore company, matching capital, and a live customer or pilot behind it.'],
      gap: reasons[0],
    });
  }

  /* Startup SG Equity — investor-led; there is no form to fill in. */
  {
    const reasons: string[] = [];
    if (!sgIncorporated) reasons.push('Needs a Singapore-incorporated company');
    if (!hasIp) reasons.push('Deep tech and genuine innovation are what it co-invests behind');
    reasons.push('Not a direct application: a qualifying third-party investor flags the company to EnterpriseSG');
    matches.push({
      program: program('ssge'),
      verdict: 'conditional',
      reasons,
      gap: hasRevenue || paying ? 'Secure a private lead investor' : 'Needs revenue or a paying customer before an investor leads',
    });
  }

  /* EDG / EDGE and the internationalisation family share the 30% local-equity test. */
  {
    const reasons: string[] = [];
    if (!sgIncorporated) reasons.push(`Needs a Singapore-registered company — stated: ${incorporation || 'not given'}`);
    if (!equity30) reasons.push(`Needs at least 30% local equity — stated: ${equity || 'not given'}`);
    reasons.push('SME test: group revenue under S$100m or fewer than 200 staff');
    matches.push({
      program: program('edge'),
      verdict: sgIncorporated && equity30 ? 'eligible' : 'not-now',
      reasons,
      gap: sgIncorporated && equity30 ? undefined : reasons[0],
    });
  }

  for (const id of ['mra', 'gia'] as const) {
    const reasons: string[] = [];
    if (!sgIncorporated) reasons.push('Needs a Singapore-registered company');
    if (!equity30) reasons.push('Needs at least 30% local equity');
    if (!wantsOverseas) reasons.push(`Needs a specific target market — stated: ${overseas || 'not given'}`);
    if (id === 'gia') {
      reasons.push('Funding only follows acceptance into an accredited overseas accelerator (GIA+) or an identified pilot partner (GIA POC)');
    }
    // An eligible MRA has cleared every gate and would otherwise come back with
    // no reasons at all, which prints as an empty box on the dossier.
    if (!reasons.length) {
      reasons.push('A Singapore-registered company, at least 30% local equity, and a named target market — the three gates this scheme checks.');
    }
    const open = sgIncorporated && equity30 && wantsOverseas;
    matches.push({
      program: program(id),
      verdict: open && hasOverseasLead ? 'eligible' : open ? 'conditional' : 'not-now',
      reasons,
      gap: open ? (hasOverseasLead ? undefined : 'Name the market and the partner or accelerator') : reasons[0],
    });
  }

  /* Talent passes — only meaningful for a non-citizen, non-PR founder. */
  if (!local) {
    matches.push({
      program: program('entrepass'),
      verdict: 'conditional',
      reasons: [
        `Residency stated as "${residency}" — Startup SG Founder and most ESG grants need a Citizen or PR as first applicant.`,
        'EntrePass needs one innovation criterion: venture funding, IP, an accredited incubator, a research collaboration or recognised achievement.',
      ],
      gap: 'Confirm which EntrePass criterion the venture meets, or bring an SC/PR co-founder onto the application',
    });
  }

  /* The two that are almost never live for a cohort-1 applicant, stated so
   * nobody spends a week chasing them. */
  matches.push({
    program: program('techsg'),
    verdict: 'not-now',
    reasons: ['For fast-growing companies hiring senior global talent at scale, not for pre-revenue founders.'],
  });
  matches.push({
    program: program('efs'),
    verdict: hasRevenue ? 'conditional' : 'not-now',
    reasons: hasRevenue
      ? ['Operating revenue exists, so a working-capital loan is arguable — it still needs a participating lender.']
      : ['Debt needs cash flow to service it.'],
    gap: hasRevenue ? 'Approach a participating financial institution' : undefined,
  });
  matches.push({
    program: program('scaleup'),
    verdict: 'not-now',
    reasons: ['Scale-up SG is for companies already past S$1m in annual revenue.'],
  });

  return matches;
}

/** Verdict label as the reviewer reads it on the dossier. */
export const VERDICT_LABEL: Record<GrantVerdict, string> = {
  eligible: 'Eligible on these answers',
  conditional: 'Conditional',
  'not-now': 'Not open yet',
};

/* ── The interview sheet ───────────────────────────────────────────────
 * The half of the assessment a reviewer can use in a room: questions that
 * exist only because of what THIS applicant wrote. Nothing here is stock —
 * every item is derived from one of their answers, quotes it back where
 * quoting is fair, and names the answer it came from so the question can be
 * checked against page 1 before it is asked.
 *
 * Deliberately deterministic and model-free. A dossier must be reproducible:
 * the same answers have to produce the same sheet, or a reviewer re-opening
 * it after the interview cannot tell what was asked and why. A language
 * model would also invent claims the applicant never made, which in a
 * document that sits next to taxpayer money is a liability, not a feature.
 */

export interface InterviewQuestion {
  id: string;
  /** What it probes — an axis label, a scheme name, or 'Consistency'. */
  probe: string;
  question: string;
  /** The answer(s) the question was derived from, quoted or named. */
  because: string;
}

/**
 * The slice of a grant screen the sheet needs. Satisfied by GrantMatch via a
 * map at the call site, and directly by the flattened shape stored on the
 * application, so the dashboard can derive the same sheet the PDF printed.
 */
export interface GrantScreen {
  id: string;
  name: string;
  verdict: GrantVerdict;
  gap?: string | null;
}

const excerpt = (value: string, max = 110): string => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}...`;
};

const questionLabel = (id: string): string => getQuestion(id)?.label ?? id;

const axisOf = (q: Question): string => (q.axis ? AXIS_LABEL[q.axis] : 'Grant compliance');

/**
 * Probes for the answers that carry risk, keyed by question id. Returning null
 * means the option they chose needs no follow-up. Kept here rather than on the
 * catalogue options because most of them depend on a SECOND answer as well.
 */
const RISK_PROBE: Record<string, (answer: string) => string | null> = {
  grantIntent: (a) =>
    a === 'My own salary so I can go full-time'
      ? 'You expect grant money to pay your salary. Walk us through your household budget for the three months of the program, without the grant in it.'
      : a === 'I have not thought about it yet'
        ? 'You have not thought about what grant money would pay for, on an application whose grants are taxpayer money. What do you believe we are accountable for, in your case?'
        : null,
  availability: (a) =>
    a === 'I have not worked out how yet'
      ? 'The program meets 9am to 6pm on weekdays, and you have not worked out how those hours become yours. What is the first arrangement you would make, and what does it cost you?'
      : null,
  runway: (a) =>
    a === 'Under 3 months'
      ? 'You stated under three months of runway for a three-month program. What happens in the week the money runs out, in detail?'
      : null,
  shippedBefore: (a) =>
    a === 'Started several, finished none'
      ? 'You have started several things and finished none. Take us to the exact week you stopped the last one: what was happening, and what did you tell yourself?'
      : null,
  milestoneContract: (a) =>
    a === 'No'
      ? 'You answered no to dated fortnightly milestones with honest reporting. What is it about that format that does not work for you?'
      : null,
  priorPublicFunding: (a) =>
    a === 'Not sure'
      ? 'You are not sure whether you or your company has received public funding before. Who would know, and can we speak to them this week?'
      : null,
};

const HOURS_FREE = 'Those hours are already mine — nothing conflicts with them';
const GIVE_NOTICE = 'I would have to give notice or end something first';
const SHORT_RUNWAY = ['Under 3 months', '3–6 months'];
const SALARY_INTENT = 'My own salary so I can go full-time';

/**
 * Derive the questions to ask this applicant, in priority order:
 * contradictions first, because an interview resolves in a minute what a form
 * never can; then the grant gates their own answers left open; then the risky
 * option they chose; then required prose too thin to trust; then the claims
 * worth seeing with our own eyes; then two closers bespoke to their named
 * person and their idea, so the sheet is never empty.
 */
export function interviewSheet(
  answers: Answers,
  track: string,
  grants: readonly GrantScreen[] = [],
): InterviewQuestion[] {
  const applicable = questionsForTrack(track);
  const at = (id: string) => str(answers, id);
  const out: InterviewQuestion[] = [];
  const push = (id: string, probe: string, question: string, because: string) => {
    out.push({ id, probe, question, because });
  };
  const has = (id: string) => out.some((item) => item.id === id);

  /* 1 — Answers that cannot both be true. */
  if (at('availability') === HOURS_FREE && at('employerAware') === 'No') {
    push(
      'consistency-hours-employer',
      'Consistency',
      'You told us the 9-to-6 hours are already yours, and separately that nobody who would be affected knows you are applying. Which of those is true today?',
      `"${at('availability')}" against "${at('employerAware')}"`,
    );
  }
  if (at('availability') === GIVE_NOTICE && SHORT_RUNWAY.includes(at('runway'))) {
    push(
      'consistency-notice-runway',
      'Consistency',
      `You would have to give notice or end something to free the hours, and you stated ${at('runway').toLowerCase()} of runway. The program runs three months. What covers month two and month three if nothing is earning by then?`,
      `"${at('availability')}" against "${at('runway')}"`,
    );
  }
  if (at('grantIntent') === SALARY_INTENT && textEvidence(at('worthwhileIfNotFunded')) < 0.4) {
    push(
      'consistency-salary-worth',
      'Consistency',
      `You expect the grant to pay your salary, and on what makes three months worthwhile without funding you wrote: "${excerpt(at('worthwhileIfNotFunded'))}". If the salary never materialises, what is left?`,
      `"${at('grantIntent')}" against a thin answer on "${questionLabel('worthwhileIfNotFunded')}"`,
    );
  }
  if (
    at('outsideSignal') === 'Yes — someone is paying' &&
    (at('stage') === 'Idea only' || at('stage') === 'Building a prototype')
  ) {
    push(
      'consistency-paying-stage',
      'Consistency',
      `You said someone outside friends and family is paying, and placed the venture at "${at('stage')}". Who is paying, for what, and why does the venture still sit at that stage?`,
      `"${at('outsideSignal')}" against "${at('stage')}"`,
    );
  }
  if (
    (at('milestoneContract') === 'No' || at('milestoneContract') === 'I would need to see them first') &&
    at('accountableTo')
  ) {
    push(
      'consistency-milestones-accountable',
      'Consistency',
      `You would not commit outright to dated fortnightly milestones, yet you named ${excerpt(at('accountableTo'), 60)} as the person who would notice if you dropped out. What would they say is the real reason the milestones are the problem?`,
      `"${at('milestoneContract')}" against "${excerpt(at('accountableTo'), 80)}"`,
    );
  }

  /* 2 — The grant gates their own answers left open. Conditional first: those
     are the schemes a conversation this month can actually unlock. */
  const gates = grants
    .filter((grant) => grant.verdict !== 'eligible' && grant.gap)
    .sort((a, b) => (a.verdict === 'conditional' ? 0 : 1) - (b.verdict === 'conditional' ? 0 : 1))
    .slice(0, 2);
  for (const gate of gates) {
    push(
      `gate-${gate.id}`,
      gate.name,
      `On your own answers, ${gate.name} turns on one thing: ${gate.gap}. What is the shortest path to closing that, and by what date?`,
      `grant screen reads ${gate.verdict}, gap "${gate.gap}"`,
    );
  }

  /* 3 — The risky option they actually chose, unless a contradiction above
     already put it in the room. */
  for (const q of applicable) {
    if (q.kind !== 'select' || !q.options) continue;
    const probe = RISK_PROBE[q.id];
    const answer = at(q.id);
    if (!probe || !answer) continue;
    const question = probe(answer);
    if (!question) continue;
    if (q.id === 'grantIntent' && answer === SALARY_INTENT && has('consistency-salary-worth')) continue;
    if (q.id === 'runway' && has('consistency-notice-runway')) continue;
    if (q.id === 'milestoneContract' && has('consistency-milestones-accountable')) continue;
    push(`risk-${q.id}`, axisOf(q), question, `"${answer}" on "${questionLabel(q.id)}"`);
  }

  /* 4 — Required prose too thin to trust, heaviest question first. Only long
     form: a title or a named person is not evidence prose, and asking someone
     to verify their own idea's name is a question that wastes the room. A
     blank is a validation failure, not an interview question, so blanks go. */
  const thin = applicable
    .filter((q) => q.required && q.kind === 'textarea' && at(q.id))
    .map((q) => ({ q, score: textEvidence(at(q.id)) }))
    .filter((item) => item.score < 0.4)
    .sort((a, b) => (b.q.weight ?? 1) - (a.q.weight ?? 1))
    .slice(0, 2);
  for (const { q, score } of thin) {
    push(
      `thin-${q.id}`,
      q.axis ? AXIS_LABEL[q.axis] : 'Evidence',
      `On "${excerpt(q.label, 70)}" you wrote: "${excerpt(at(q.id))}". What is the most specific checkable fact in that answer - a name, a number, a date - and how would we verify it?`,
      `required answer at ${Math.round(score * 100)}% evidence`,
    );
  }

  /* 5 — Claims worth seeing with our own eyes. */
  const signal = at('outsideSignal');
  if (signal === 'Yes — someone is paying' || signal === 'Yes — an unpaid pilot is running') {
    push(
      'verify-signal',
      'Verification',
      `You said "${signal}". Bring the two most recent invoices or the pilot agreement to the interview - amount, date, and who signed - and name the person we can call.`,
      `"${signal}" on "${questionLabel('outsideSignal')}"`,
    );
  }
  if (textEvidence(at('alreadyDone')) >= 0.6) {
    push(
      'verify-artifact',
      'Verification',
      `You described work already done: "${excerpt(at('alreadyDone'))}". Open the artifact itself in the interview - repo, deck, pilot notes - and tell us what state it is in this week.`,
      `"${questionLabel('alreadyDone')}" scored ${Math.round(textEvidence(at('alreadyDone')) * 100)}% evidence`,
    );
  }

  /* 6 — Closers, bespoke to their named person and their own title. */
  if (at('accountableTo') && !has('consistency-milestones-accountable')) {
    push(
      'close-accountable',
      AXIS_LABEL.accountability,
      `You named ${excerpt(at('accountableTo'), 60)} as the person outside this program who would notice if you quietly dropped out. What have they already agreed to, and may we contact them?`,
      `"${excerpt(at('accountableTo'), 80)}" on "${questionLabel('accountableTo')}"`,
    );
  }
  if (at('ideaTitle')) {
    push(
      'close-assumption',
      AXIS_LABEL.domain,
      `On ${at('ideaTitle')}: what is the single assumption that, if wrong, ends the venture - and what would it cost to test that assumption in week two?`,
      `the applicant's own title, "${at('ideaTitle')}"`,
    );
  }

  /* An application with nothing in it at all still gets one question, because
     an empty sheet reads as "nothing to ask" when it means "nothing given". */
  if (!out.length) {
    push(
      'close-blank',
      'Evidence',
      `Nothing in this application is answered at length. Ask them, without notes, what they have actually done on ${at('ideaTitle') || 'this'} in the last thirty days - and watch what they reach for first.`,
      'every answer is blank or too thin to derive a question from',
    );
  }

  /* Eight is a conversation; more is an interrogation, and the reviewer stops
     reading. Priority order above decides what survives the cut. */
  return out.slice(0, 8);
}

/* ── Dossier filename ────────────────────────────────────────────────── */

/**
 * `<the applicant's idea> [MVP].pdf`, safe for Drive.
 *
 * Idea titles are typed by applicants, so they arrive with path separators,
 * quotes and non-ASCII in them. Drive tolerates most of it and the filesystem
 * behind it does not, so everything is reduced to printable ASCII and the
 * characters that mean something to a path are replaced.
 */
export function dossierFilename(idea: string, fallback = 'Untitled application'): string {
  const clean = (idea || '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 90)
    .trim();
  return `${clean || fallback} [MVP].pdf`;
}

/** Axis count, re-exported so the radar drawing and the check script agree. */
export const AXIS_COUNT = ASSESSMENT_AXES.length;

/** The catalogue itself, for the check script's invariant assertions. */
export { QUESTIONS };
