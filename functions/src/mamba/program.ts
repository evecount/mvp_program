/**
 * Mamba Venture Program — the facts the application flow needs.
 *
 * The landing section, the registration form and the review tab all name the
 * same four tracks, so the ids and labels live here once. `VENTURE_TRACKS` in
 * components/redesign/VentureProgramSection.tsx composes its panel copy on top
 * of `MAMBA_TRACKS` rather than restating it, which is what keeps a track
 * renamed on the page from silently disagreeing with a record already filed in
 * `mamba_registrations`.
 *
 * `trackLabel` is stored on each submission alongside `track` on purpose: a
 * reviewer should read the words the applicant read, even after the catalog is
 * edited.
 *
 * Deliberately free of React and of `window` so a check script can assert the
 * invariants in plain Node.
 */

export interface MambaTrackOption {
  id: string;
  /** Shown in the selector rail, the form and the review table. */
  label: string;
  /** One line under the label — the applicant's own situation. */
  audience: string;
}

export const MAMBA_TRACKS: readonly MambaTrackOption[] = [
  {
    id: 'employee',
    label: 'Prospective Employee',
    audience: 'You want to work inside a company, not run one.',
  },
  {
    id: 'founder',
    label: 'Startup Founder',
    audience: 'You have a company, or a conviction about one.',
  },
  {
    id: 'transition',
    label: 'Currently Employed / Mid-Transition',
    audience: 'You have a role and are reconsidering it.',
  },
  {
    id: 'cybrdeck-engineer',
    label: 'Cybrdeck Dev / Engineer',
    audience: 'You build WITH us.',
  },
] as const;

export type MambaTrackId = (typeof MAMBA_TRACKS)[number]['id'];

export const isMambaTrackId = (value: unknown): value is MambaTrackId =>
  MAMBA_TRACKS.some((track) => track.id === value);

/**
 * The intake track — how long the applicant is committing to. Distinct from the
 * career `track` above (employee / founder / …): one is the shape of the person,
 * this is the length of the programme they applied for. An applicant picks one,
 * never both, and it is what the dossier prints beside their name.
 */
export const MAMBA_INTAKE_TRACKS = ['1 Month', '3 Month'] as const;

export type MambaIntakeTrack = (typeof MAMBA_INTAKE_TRACKS)[number];

export const isMambaIntakeTrack = (value: unknown): value is MambaIntakeTrack =>
  MAMBA_INTAKE_TRACKS.includes(value as MambaIntakeTrack);

/**
 * The cohort calendar. Cohort #1 opens on one date and both intake lengths run
 * from it — the header names the start so nobody applies blind to a programme
 * already underway. Add a cohort by adding a row; the header and the dossier
 * read the next upcoming one rather than a hardcoded sentence.
 */
export const COHORTS: ReadonlyArray<{
  label: string;
  /** Cohort ordinal — the "#n" the header's date mark nests in its ring. */
  n: number;
  /** ISO date the cohort begins. */
  starts: string;
  /** Exact start, with its Singapore offset; applications close 72h before it. */
  startsAt: string;
  /** Display form of the start date, as the applicant reads it. */
  startsLabel: string;
  /** Day of month, the oversized numeral of the header mark. */
  day: string;
  /** Month spelled out; the mark renders its initial as the ring. */
  month: string;
  /** Four-digit year, for the small caption and the mobile badge. */
  year: string;
}> = [
  // MVP's calendar, not cybrdeck.com's (its Cohort #1 began 5 Oct 2026).
  {
    label: 'The January 2027 cohort',
    n: 1,
    starts: '2027-01-26',
    startsAt: '2027-01-26T09:00:00+08:00',
    startsLabel: '26 Jan 2027',
    day: '26',
    month: 'January',
    year: '2027',
  },
];

/** Applications for a cohort close this long before it starts. */
export const APPLICATION_CLOSE_HOURS = 72;

/** When applications for a cohort close (epoch ms). */
export const cohortClosesAt = (c: (typeof COHORTS)[number]) =>
  Date.parse(c.startsAt) - APPLICATION_CLOSE_HOURS * 3600 * 1000;

/** The cohort the form is serving: the first whose applications are still open. */
export function openCohort(now: Date = new Date()) {
  return COHORTS.find((c) => cohortClosesAt(c) > now.getTime()) ?? null;
}

/** The cohort an application filed today would join — the first not yet begun. */
export function currentCohort(now: Date = new Date()) {
  return COHORTS.find((c) => new Date(`${c.starts}T00:00:00Z`).getTime() >= now.getTime())
    ?? COHORTS[COHORTS.length - 1]
    ?? null;
}

/**
 * Review states, in pipeline order. Registration never takes money, so
 * nothing before `offered` implies a payment has been made.
 */
export const MAMBA_STATUSES = [
  'pending',
  'shortlisted',
  'offered',
  'enrolled',
  'declined',
] as const;

export type MambaStatus = (typeof MAMBA_STATUSES)[number];

/** Years of relevant experience, as the form's fixed bands. */
export const EXPERIENCE_BANDS = [
  'Under 1 year',
  '1–3 years',
  '3–5 years',
  '5–10 years',
  '10+ years',
] as const;

/** How the applicant found the program. Free text is allowed via "Other". */
export const REFERRAL_OPTIONS = [
  'Cybrdeck community or event',
  'SG Innovation',
  'Mamba Partners',
  'LinkedIn or X',
  'Referred by someone',
  'Search',
  'Other',
] as const;

/**
 * The terms shown on the form so nobody applies blind.
 *
 * `commitment` is read by the landing section's FAQ rather than its spec bar —
 * the headline row states shape, not price. The program fee is deliberately not
 * a term at all: it is quoted with an offer, so no public surface carries the
 * figure. Both strings stay prose-friendly because the register page feeds them
 * into sentences, and the section used to keep its own copies of these facts —
 * every relabel of the source left a stale number on the page.
 */
export const PROGRAM_TERMS = {
  duration: '1 or 3 Months',
  commitment: '25 hours on top of your working week',
} as const;

/** Firestore collection holding one application per auth UID. */
export const MAMBA_REGISTRATIONS_COLLECTION = 'mamba_registrations';

/**
 * Reviewer-only notes, keyed by the same auth UID.
 *
 * A separate collection on purpose. `mamba_registrations` is
 * owner-readable — `allow read: if isOwner(uid) || isCoreOrAdmin()` — so
 * anything stored on the application is reachable by the applicant with
 * their own token, even though no screen offers it. A readiness score is
 * uncomfortable to leak; a model's read of a person is not something to
 * leave in a document they can query. Internal judgement lives here,
 * where the rules admit Core and Admin and nobody else.
 */
export const MAMBA_REVIEW_NOTES_COLLECTION = 'mamba_review_notes';
