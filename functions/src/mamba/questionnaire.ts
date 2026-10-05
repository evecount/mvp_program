/**
 * Mamba Venture Program — the application questionnaire.
 *
 * One catalogue, three consumers: the register form renders it, `assessment.ts`
 * scores it, and the dossier PDF prints it. That is the point — a question
 * reworded here changes what the applicant reads, what gets scored and what the
 * reviewer reads back, together, instead of drifting apart across three files.
 *
 * The scoring weights are attached to the questions on purpose. A reviewer who
 * disagrees with how much `runway` matters edits one number next to the
 * question rather than hunting a weights table that no longer lines up.
 *
 * Deliberately free of React and of `window` so a check script can assert the
 * invariants in plain Node.
 */
import { MAMBA_TRACKS, type MambaTrackId } from './program';

/** The seven axes the readiness radar plots. */
export const ASSESSMENT_AXES = [
  'domain',
  'execution',
  'traction',
  'commitment',
  'persistence',
  'coachability',
  'accountability',
] as const;

export type AxisId = (typeof ASSESSMENT_AXES)[number];

/** What each axis is actually measuring, in the reviewer's words. */
export const AXIS_LABEL: Record<AxisId, string> = {
  domain: 'Domain depth',
  execution: 'Evidence of execution',
  traction: 'Market signal',
  commitment: 'Commitment capacity',
  persistence: 'Persistence',
  coachability: 'Coachability',
  accountability: 'Accountability',
};

/**
 * The same axes, short enough to sit around the radar without colliding with
 * whatever is drawn beside it. The full label is printed in the breakdown.
 */
export const AXIS_SHORT: Record<AxisId, string> = {
  domain: 'DOMAIN',
  execution: 'EXECUTION',
  traction: 'TRACTION',
  commitment: 'COMMITMENT',
  persistence: 'PERSISTENCE',
  coachability: 'COACHABILITY',
  accountability: 'ACCOUNTABILITY',
};

export type QuestionKind = 'text' | 'textarea' | 'select';

export interface QuestionOption {
  /** Shown to the applicant verbatim. */
  label: string;
  /**
   * Evidence weight, 0..1 — how much choosing this answer supports the axis.
   * Deliberately not a moral judgement: an honest "under 3 months" of runway
   * scores lower than "more than 12 months" because it is a weaker commitment
   * signal, and the reviewer sees the raw answer either way.
   */
  weight: number;
  /**
   * Optional contribution to the grant-liability risk score, 0..1. Set on the
   * answers that tell us a candidate may treat public money as free money —
   * the failure mode that lands back on Cybrdeck, SG Innovation and Mamba.
   */
  risk?: number;
}

export interface Question {
  /** Firestore field name on `mamba_registrations/{uid}`. */
  id: string;
  /** The question as the applicant reads it. */
  label: string;
  /** One line of framing under the label. */
  help?: string;
  kind: QuestionKind;
  options?: readonly QuestionOption[];
  required?: boolean;
  /** Character ceiling — mirrored in firestore.rules for every free-text field. */
  max?: number;
  /** Shortest answer accepted as evidence, in characters. */
  min?: number;
  /** Omitted means every track sees the question. */
  tracks?: readonly MambaTrackId[];
  /** Which axis this answer feeds. Omitted for identity fields like the title. */
  axis?: AxisId;
  /** How much of the axis this question decides. Defaults to 1. */
  weight?: number;
}

/** Answer options reused by more than one question. */
const NOT_APPLICABLE: QuestionOption = { label: 'Not applicable to my track', weight: 0.3 };

export const QUESTIONS_RAW: readonly Question[] = [
  /* ── What they are bringing ─────────────────────────────────────── */
  {
    id: 'ideaTitle',
    label: 'What should we call it?',
    help: 'A short name for the idea or the move you want to make. This becomes the title of your dossier.',
    kind: 'text',
    required: true,
    max: 120,
  },
  {
    id: 'domainProximity',
    label: 'How close are you to the problem?',
    kind: 'select',
    required: true,
    axis: 'domain',
    weight: 1,
    options: [
      { label: 'I work in this industry now', weight: 1 },
      { label: 'I worked in it before', weight: 0.8 },
      { label: 'I am an adjacent specialist', weight: 0.55 },
      { label: 'I am an outsider to it', weight: 0.2 },
      { label: 'No venture yet, this is about my own career', weight: 0.35 },
    ],
  },
  {
    id: 'problemEvidence',
    label:
      'Describe a recurring, expensive problem in an industry you know first-hand. How do people handle it today, and why does that fall short?',
    help: 'Name the workflow, the cost and the workaround. Specifics are what we score.',
    kind: 'textarea',
    required: true,
    min: 160,
    max: 2000,
    axis: 'domain',
    weight: 1.5,
  },
  {
    id: 'competitors',
    label: 'Who else is already solving this, and why are they not enough?',
    help: '"Nobody" is a red flag, not a good answer.',
    kind: 'textarea',
    required: true,
    min: 80,
    max: 1200,
    axis: 'traction',
    weight: 1.2,
  },
  {
    id: 'alreadyDone',
    label: 'What have you already done about it?',
    help: 'Name the artifact: a repo, a deck, a pilot, a customer, a spreadsheet. Work done before this program counts for most.',
    kind: 'textarea',
    required: true,
    min: 100,
    max: 2000,
    axis: 'execution',
    weight: 1.5,
  },
  {
    id: 'teamGaps',
    label: 'What can you personally build or execute today without hiring anyone, and which specific capability is missing from the team as it stands?',
    help: 'Name the gap precisely. "Engineering" is not an answer; "nobody who can close enterprise deals" is.',
    kind: 'textarea',
    tracks: ['founder'],
    required: true,
    min: 80,
    max: 1200,
    axis: 'execution',
    weight: 0.8,
  },
  {
    id: 'shippedBefore',
    label: 'Have you taken something from idea to finished and into someone else\'s hands?',
    kind: 'select',
    required: true,
    axis: 'persistence',
    weight: 0.8,
    options: [
      { label: 'Yes, more than once', weight: 1 },
      { label: 'Yes, once', weight: 0.8 },
      { label: 'Started several, finished none', weight: 0.3 },
      { label: 'Not yet', weight: 0.1 },
    ],
  },
  {
    id: 'outsideSignal',
    label: 'Has anyone outside your friends and family paid for it, piloted it, or asked to buy it?',
    kind: 'select',
    required: true,
    axis: 'traction',
    weight: 1,
    options: [
      { label: 'Yes, someone is paying', weight: 1 },
      { label: 'Yes, an unpaid pilot is running', weight: 0.75 },
      { label: 'Verbal interest only', weight: 0.45 },
      { label: 'Not yet', weight: 0.2 },
      NOT_APPLICABLE,
    ],
  },

  /* ── Commitment and follow-through ──────────────────────────────── */
  {
    id: 'availability',
    label:
      'The program meets 9am–6pm, Monday to Friday, for {length}. What is already true about those hours for you?',
    help:
      'What is arranged, not what you intend to arrange. This is the first answer we check when someone goes quiet in week two.',
    kind: 'select',
    required: true,
    axis: 'commitment',
    weight: 1.1,
    /* The old form asked this as "when can you commit" with job-application
       options, which rewarded quitting a job and punished keeping one. What
       predicts finishing the cohort is whether the hours are already secured
       and whether someone else would notice if they were not — so the top
       weights go to arrangements that exist today, and giving notice scores
       as grant-liability risk: no income plus a grant to replace it is the
       profile that walks away in month two. */
    options: [
      { label: 'Those hours are already mine; nothing conflicts with them', weight: 1 },
      { label: 'My employer or client has agreed the hours in writing', weight: 0.9 },
      { label: 'I am rearranging existing commitments to free them', weight: 0.6 },
      { label: 'I would have to give notice or end something first', weight: 0.4, risk: 0.5 },
      { label: 'I have not worked out how yet', weight: 0.15 },
    ],
  },
  {
    id: 'weekPlan',
    label: 'Walk us through a real week. When exactly would the program fit, and what would you give up to make that true?',
    help: 'Name the hours, and name what loses them. A vague answer here is the single strongest predictor of a dropout.',
    kind: 'textarea',
    required: true,
    min: 100,
    max: 1200,
    axis: 'commitment',
    weight: 1.2,
  },
  {
    id: 'runway',
    label: 'If this asked you to go full-time, how long could you cover your own living costs?',
    kind: 'select',
    required: true,
    axis: 'commitment',
    weight: 1,
    options: [
      { label: 'More than 12 months', weight: 1 },
      { label: '6–12 months', weight: 0.85 },
      { label: '3–6 months', weight: 0.6 },
      { label: 'Under 3 months', weight: 0.3 },
      { label: 'Someone else covers my costs', weight: 0.7 },
    ],
  },
  {
    id: 'dependents',
    label: 'Who is counting on your income right now?',
    kind: 'select',
    required: true,
    axis: 'commitment',
    weight: 0.8,
    options: [
      { label: 'No one', weight: 1 },
      { label: 'Only me', weight: 0.85 },
      { label: 'Me and one other person', weight: 0.6 },
      { label: 'A household or dependents', weight: 0.4 },
    ],
  },
  {
    id: 'employerAware',
    label: 'Does anyone who would be affected by your time already know you are applying?',
    kind: 'select',
    tracks: ['employee', 'transition', 'cybrdeck-engineer'],
    axis: 'commitment',
    weight: 0.8,
    options: [
      { label: 'Yes, and they support it', weight: 1 },
      { label: 'Yes, they do not know yet', weight: 0.5 },
      { label: 'No', weight: 0.3 },
      { label: 'Not applicable', weight: 0.5 },
    ],
  },
  {
    id: 'setback',
    label: 'Describe the hardest thing you finished that nobody was forcing you to finish. What broke, what did you do, where is it now?',
    kind: 'textarea',
    required: true,
    min: 120,
    max: 2000,
    axis: 'persistence',
    weight: 1.5,
  },
  {
    id: 'milestoneContract',
    label: 'If we asked you to hit a dated milestone every two weeks and report honestly whether you did, would you?',
    kind: 'select',
    required: true,
    axis: 'accountability',
    weight: 1,
    options: [
      { label: 'Yes, set them with me', weight: 1 },
      { label: 'Yes, if I help set them', weight: 0.9 },
      { label: 'I would need to see them first', weight: 0.5 },
      { label: 'No', weight: 0 },
    ],
  },
  {
    id: 'accountableTo',
    label: 'Name one person outside this program who would notice if you quietly dropped out.',
    help: 'Their name and what they are to you. We may ask them.',
    kind: 'text',
    required: true,
    max: 200,
    axis: 'accountability',
    weight: 0.8,
  },
  {
    id: 'worthwhileIfNotFunded',
    label: 'Suppose the program ends and no grant, no funding and no offer lands. What would have made it worth the time?',
    kind: 'textarea',
    required: true,
    min: 80,
    max: 1200,
    axis: 'accountability',
    weight: 1.2,
  },
  {
    id: 'grantIntent',
    label: 'What do you expect grant money to pay for?',
    help: 'There is no wrong answer here, but there are expensive ones. Grants are taxpayer money and we answer for how they are used.',
    kind: 'select',
    required: true,
    axis: 'accountability',
    weight: 0.6,
    options: [
      { label: 'Product and build costs', weight: 0.8 },
      { label: 'Customer pilots and market testing', weight: 0.9 },
      { label: 'Team hires', weight: 0.7, risk: 0.2 },
      { label: 'My own salary so I can go full-time', weight: 0.4, risk: 0.6 },
      { label: 'I have not thought about it yet', weight: 0.1, risk: 0.8 },
    ],
  },
  {
    id: 'priorPublicFunding',
    label: 'Have you or your company ever received a government grant or public funding?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Yes, completed and closed', weight: 1, risk: -0.3 },
      { label: 'Yes, currently running', weight: 0.7, risk: 0.1 },
      { label: 'No', weight: 0.5 },
      { label: 'Not sure', weight: 0.2, risk: 0.3 },
    ],
  },

  /* ── Coachability and risk ──────────────────────────────────────── */
  {
    id: 'wrongAssumption',
    label:
      'Name one assumption you started with that you have since found out was wrong. What was it, what showed you, and what did you change because of it?',
    help: 'The change is the evidence. "I realised I was wrong" without a change behind it is not coachability, it is a sentence.',
    kind: 'textarea',
    required: true,
    min: 100,
    max: 1500,
    axis: 'coachability',
    weight: 1.5,
  },
  {
    id: 'failureMode',
    label:
      'What is the strongest reason this could fail? Not a generic startup risk: the specific one that applies to what you are building. What would you need to see in the next 90 days to know it is happening?',
    help: 'A reason we could have written for any applicant does not count. Name the one that is actually yours.',
    kind: 'textarea',
    required: true,
    min: 80,
    max: 1200,
    axis: 'coachability',
    weight: 1.2,
  },
  {
    id: 'firstThirtyDays',
    label: 'If you started tomorrow, what are the first three things you would do in the next 30 days? Specific actions, not goals.',
    help: '"Validate the market" is a goal. "Call the 5 operations leads I already know and ask what they pay for this today" is an action.',
    kind: 'textarea',
    required: true,
    min: 100,
    max: 1200,
    axis: 'execution',
    weight: 1,
  },

  /* ── Founder track: the venture and the grant gates ─────────────── */
  {
    id: 'ventureOneLiner',
    label: 'Your venture, in one line',
    help: 'A sentence is enough. This is a triage note, not a pitch deck.',
    kind: 'text',
    tracks: ['founder'],
    required: true,
    max: 500,
    axis: 'domain',
    weight: 0.8,
  },
  {
    id: 'stage',
    label: 'Where is the venture?',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    axis: 'execution',
    weight: 1,
    options: [
      { label: 'Idea only', weight: 0.2 },
      { label: 'Building a prototype', weight: 0.45 },
      { label: 'Prototype or MVP built, no users yet', weight: 0.65 },
      { label: 'Live with users, pre-revenue', weight: 0.8 },
      { label: 'Revenue under S$10k a month', weight: 0.9 },
      { label: 'Revenue S$10k a month or more', weight: 1 },
    ],
  },
  {
    id: 'firstCustomers',
    label: 'Name your first 10 customers as specifically as you can: who they are, and exactly how you would reach them this month, not eventually.',
    help: 'A named company or persona beats a segment. "SMEs" is not an answer; "the ops manager at a 20-truck logistics operator like the one I worked at" is.',
    kind: 'textarea',
    tracks: ['founder'],
    required: true,
    min: 80,
    max: 1200,
    axis: 'traction',
    weight: 1,
  },
  {
    id: 'businessModel',
    label: 'Who pays, for what exactly, and how much? Walk through the transaction as it actually happens, not the business model slide version.',
    help: 'If you do not know yet, say what you would charge the first paying customer and why that number.',
    kind: 'textarea',
    tracks: ['founder'],
    required: true,
    min: 80,
    max: 1200,
    axis: 'domain',
    weight: 1,
  },
  {
    id: 'residency',
    label: 'What is your residency status?',
    help: 'Drives which schemes you can actually reach. Several are closed to non-citizens and non-PRs.',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    options: [
      { label: 'Singapore Citizen', weight: 1 },
      { label: 'Singapore Permanent Resident', weight: 0.95 },
      { label: 'EntrePass or Tech.Pass holder', weight: 0.5 },
      { label: 'Another work pass', weight: 0.3 },
      { label: 'Not based in Singapore', weight: 0.1 },
    ],
  },
  {
    id: 'firstTimeFounder',
    label: 'Have you founded a company before?',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    options: [
      { label: 'No, this would be my first', weight: 1 },
      { label: 'Yes, previously', weight: 0.4 },
      { label: 'Yes, I am running another now', weight: 0.2 },
    ],
  },
  {
    id: 'coFounderCount',
    label: 'Counting yourself, how many of the main applicants are Singapore Citizens or PRs?',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    options: [
      { label: 'Two or more', weight: 1 },
      { label: 'One, just me', weight: 0.4 },
      { label: 'None', weight: 0 },
    ],
  },
  {
    id: 'incorporation',
    label: 'Is the company incorporated in Singapore, and how old is it?',
    help: 'Some schemes require the company to be under six months old, which is a clock you cannot rewind.',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    options: [
      { label: 'Not incorporated yet', weight: 0.6 },
      { label: 'Singapore, under 6 months old', weight: 1 },
      { label: 'Singapore, 6–24 months old', weight: 0.6 },
      { label: 'Singapore, over 2 years old', weight: 0.4 },
      { label: 'Incorporated outside Singapore', weight: 0.15 },
    ],
  },
  {
    id: 'localEquity',
    label: 'What share of the company is held by Singapore Citizens or PRs?',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    options: [
      { label: '51% or more', weight: 1 },
      { label: '30–50%', weight: 0.6 },
      { label: 'Under 30%', weight: 0.2 },
      { label: 'Not incorporated yet', weight: 0.4 },
      { label: 'Not sure', weight: 0.1 },
    ],
  },
  {
    id: 'proprietaryTech',
    label: 'Is there proprietary technology or IP in the venture?',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    options: [
      { label: 'Yes, and we own it', weight: 1 },
      { label: 'Yes, licensed from someone else', weight: 0.5 },
      { label: 'In development', weight: 0.6 },
      { label: 'No, it is a services or business-model play', weight: 0.2 },
    ],
  },
  {
    id: 'capitalToMatch',
    label: 'Startup SG Founder needs 1:1 matching capital, at least half of it paid up when you apply. Could you put that in?',
    help: 'This is the real gate on that grant, not the pitch.',
    kind: 'select',
    tracks: ['founder'],
    required: true,
    axis: 'commitment',
    weight: 0.6,
    options: [
      { label: 'Yes, it is already banked', weight: 1 },
      { label: 'Yes, I could raise it', weight: 0.7 },
      { label: 'Maybe, with help', weight: 0.4 },
      { label: 'No', weight: 0.1 },
    ],
  },
  {
    id: 'overseasAmbition',
    label: 'Do you have a specific overseas market or partner in mind?',
    kind: 'select',
    tracks: ['founder'],
    options: [
      { label: 'Yes, and we have a partner or lead', weight: 1 },
      { label: 'Yes, a market but no partner yet', weight: 0.6 },
      { label: 'Not yet', weight: 0.3 },
      { label: 'No, Singapore only', weight: 0.1 },
    ],
  },
];

/**
 * Copy that depends on the applicant's intake says {length} / {Length}. The
 * form fills it from the intake they picked ("one month" / "three months");
 * everything server-side reads the neutral wording below.
 */
export const trackLength = (intake?: string, capital = false): string => {
  const s = intake === '1 Month' ? 'one month' : intake === '3 Month' ? 'three months' : 'the length of your track';
  return capital ? s[0].toUpperCase() + s.slice(1) : s;
};
export const fillTrackLength = (text: string, intake?: string): string =>
  text.replace(/\{length\}/g, trackLength(intake)).replace(/\{Length\}/g, trackLength(intake, true));

/** The catalogue with intake wording filled neutrally, for the scorer, dossier and drafts. */
export const QUESTIONS: readonly Question[] = QUESTIONS_RAW.map((q) => ({
  ...q,
  label: fillTrackLength(q.label),
  ...(q.help ? { help: fillTrackLength(q.help) } : {}),
}));

/** Every question id, for the check script. */
export const QUESTION_IDS = QUESTIONS.map((q) => q.id);

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export const getQuestion = (id: string): Question | undefined => BY_ID.get(id);

/** True when the track sees this question. */
export const appliesToTrack = (q: Question, track: string): boolean =>
  !q.tracks || q.tracks.includes(track as MambaTrackId);

/** The questions a given track is actually asked, in catalogue order. */
export const questionsForTrack = (track: string): Question[] =>
  QUESTIONS.filter((q) => appliesToTrack(q, track));

/**
 * Sections the form renders, in reading order. Each names question ids from the
 * catalogue so the form cannot show a question the scorer does not know about.
 */
export const QUESTION_SECTIONS_RAW: ReadonlyArray<{
  id: string;
  title: string;
  intro?: string;
  questions: readonly string[];
}> = [
  {
    id: 'bringing',
    title: 'What you are bringing',
    intro:
      'Not the pitch, the evidence. We read these answers against what you have already done, so specifics beat ambition here.',
    questions: [
      'ideaTitle',
      'domainProximity',
      'problemEvidence',
      'competitors',
      'alreadyDone',
      'teamGaps',
      'shippedBefore',
      'outsideSignal',
    ],
  },
  {
    id: 'venture',
    title: 'The venture',
    intro:
      'These answers decide which government schemes are genuinely open to you, so answer them as they stand today.',
    questions: [
      'ventureOneLiner',
      'stage',
      'firstCustomers',
      'businessModel',
      'residency',
      'firstTimeFounder',
      'coFounderCount',
      'incorporation',
      'localEquity',
      'proprietaryTech',
      'capitalToMatch',
      'overseasAmbition',
    ],
  },
  {
    id: 'commitment',
    title: 'Commitment and follow-through',
    intro:
      '{Length} is short only if you are actually there for it. We would rather hear the constraint now than discover it in week two.',
    questions: [
      'availability',
      'weekPlan',
      'runway',
      'dependents',
      'employerAware',
      'setback',
      'milestoneContract',
      'accountableTo',
    ],
  },
  {
    id: 'coachability',
    title: 'Coachability and risk',
    intro:
      'This program changes what you are building more often than it funds what you already planned. We read this section for whether you would let it.',
    questions: ['wrongAssumption', 'failureMode', 'firstThirtyDays'],
  },
  {
    id: 'expectations',
    title: 'Expectations',
    intro:
      'Public money is involved, and we are accountable for how it is used. These answers are read alongside your grant options.',
    questions: ['worthwhileIfNotFunded', 'grantIntent', 'priorPublicFunding'],
  },
];

/** Sections with intake wording filled neutrally (server-side use). */
export const QUESTION_SECTIONS = QUESTION_SECTIONS_RAW.map((section) => ({
  ...section,
  ...(section.intro ? { intro: fillTrackLength(section.intro) } : {}),
}));

/** The raw catalogue entry, {length} tokens intact, for the form generator. */
export const getRawQuestion = (id: string): Question | undefined => QUESTIONS_RAW.find((q) => q.id === id);

/** The track list, re-exported so the form has one import for both. */
export { MAMBA_TRACKS };

/** Look a section up by id, for the form's explicit section ordering. */
export const getSection = (id: string) => QUESTION_SECTIONS.find((section) => section.id === id);
