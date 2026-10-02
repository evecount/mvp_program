/**
 * Mamba Venture Program — the application as the server receives it.
 *
 * The form used to be filed straight into Firestore by the browser, against a
 * document named after the applicant's auth UID. That made an account a
 * precondition of applying. Applications are open to anyone now, so the write
 * moved behind POST /api/mamba/apply and this module became the boundary: it
 * turns an arbitrary request body into either a document that is safe to store
 * or a list of reasons it is not.
 *
 * What the rules used to enforce for a client write — the field allowlist, the
 * per-answer ceilings, `status` minted as 'pending' and nothing else — is
 * enforced here instead, and enforced for every caller rather than only for
 * browsers that run our code. A question added to questionnaire.ts still needs
 * a cap there and nothing here: the ceilings are read from the catalogue.
 *
 * The document name is derived from the reply-to address rather than from a
 * login, which is what lets the same person revise their application from a
 * different machine, and lets two applications from one address collapse into
 * one record a reviewer reads once. The address itself is hashed: a plain
 * address as a document id would put each applicant's record one enumeration
 * away from anyone who knows they applied.
 *
 * Deliberately free of React and of `window` so a check script can assert the
 * invariants in plain Node.
 */
import { createHash } from 'node:crypto';
import {
  EXPERIENCE_BANDS,
  MAMBA_INTAKE_TRACKS,
  MAMBA_TRACKS,
  REFERRAL_OPTIONS,
  isMambaIntakeTrack,
  isMambaTrackId,
  type MambaIntakeTrack,
  type MambaTrackId,
} from './program';
import { QUESTION_IDS, getQuestion, questionsForTrack } from './questionnaire';

/** Prefix on every derived record key, so a key can never collide with an auth UID. */
export const MAMBA_RECORD_KEY_PREFIX = 'mreg_';

/** The free-text ceilings the hand-authored fields carry (the catalogue's own
 *  questions hold theirs, in questionnaire.ts). */
export const APPLICATION_FIELD_LIMITS = {
  fullName: 200,
  phone: 32,
  email: 320,
  currentSituation: 2000,
  motivation: 4000,
  company: 200,
  role: 200,
  linkedin: 500,
  portfolio: 500,
  github: 500,
} as const;

/** Shape the form sends: the hand-authored fields plus the catalogue's answers. */
export interface ApplicationSubmission {
  fullName: string;
  phone: string;
  email: string;
  track: MambaTrackId;
  /** The intake track — programme length the applicant applied for. */
  intake: MambaIntakeTrack;
  currentSituation: string;
  company: string;
  role: string;
  yearsExperience: string;
  linkedin: string;
  portfolio: string;
  github: string;
  motivation: string;
  howHeard: string;
  /** Flattened onto the document, one field per question id. */
  answers: Record<string, string>;
}

/**
 * Address as the applicant means it: trimmed, lower-cased, and with Gmail's two
 * cosmetic tricks undone. `bob.smith+camp@gmail.com` and `bobsmith@gmail.com`
 * are one mailbox; storing them as two records would hand a reviewer two
 * applications from the same person and one of them would look like a duplicate
 * filed by a stranger. Only Gmail folds dots and plus-aliases, so only Gmail
 * addresses are touched.
 */
export function normalizeReplyTo(email: unknown): string {
  if (typeof email !== 'string') return '';
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return value;

  const domain = value.slice(at + 1);
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') return value;

  const local = value.slice(0, at).split('+')[0].replace(/\./g, '');
  if (!local) return value;
  return `${local}@${domain === 'googlemail.com' ? 'gmail.com' : domain}`;
}

const isPlausibleEmail = (value: string): boolean =>
  value.length <= APPLICATION_FIELD_LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * The document name an application to this address is filed under.
 *
 * Returns '' for anything that is not an address, because the address is the
 * one field the whole flow keys off: no reply-to, no record.
 */
export function deriveRecordKey(email: unknown): string {
  const normalized = normalizeReplyTo(email);
  if (!isPlausibleEmail(normalized)) return '';
  // 28 bytes of SHA-256: unguessable, and well inside the 1,500-byte id limit.
  const digest = createHash('sha256').update(normalized, 'utf-8').digest('hex').slice(0, 56);
  return `${MAMBA_RECORD_KEY_PREFIX}${digest}`;
}

/* Every hand-authored text field, with the ceiling that decides it. The two
   selects listed below take their choices from program.ts, so a value outside
   them is a forged request rather than a typo. */
const STRINGS: Record<keyof Omit<ApplicationSubmission, 'answers' | 'track' | 'intake'>, number> = {
  fullName: APPLICATION_FIELD_LIMITS.fullName,
  phone: APPLICATION_FIELD_LIMITS.phone,
  email: APPLICATION_FIELD_LIMITS.email,
  currentSituation: APPLICATION_FIELD_LIMITS.currentSituation,
  motivation: APPLICATION_FIELD_LIMITS.motivation,
  company: APPLICATION_FIELD_LIMITS.company,
  role: APPLICATION_FIELD_LIMITS.role,
  linkedin: APPLICATION_FIELD_LIMITS.linkedin,
  portfolio: APPLICATION_FIELD_LIMITS.portfolio,
  github: APPLICATION_FIELD_LIMITS.github,
  yearsExperience: 64,
  howHeard: 200,
};

const REQUIRED: Array<keyof typeof STRINGS> = ['fullName', 'phone', 'email', 'currentSituation', 'motivation'];

/** The written answers with something to say; a blank one is a skipped question. */
const MINIMUMS: Record<string, number> = {
  currentSituation: 20,
  motivation: 60,
};

/**
 * Validate a submission and normalize it into the document shape.
 *
 * Every error is collected rather than thrown on the first: the form shows these
 * beside their own fields, and an applicant who fixed three things should not
 * have to submit three more times to discover the fourth.
 *
 * `reasons` read as field name + a short sentence, so the client can map them
 * back to an input; nothing here quotes the applicant's own text back, which
 * would put whatever they typed into server logs.
 */
export function parseApplicationSubmission(
  body: unknown,
): { ok: true; submission: ApplicationSubmission } | { ok: false; reasons: Array<{ field: string; message: string }> } {
  const reasons: Array<{ field: string; message: string }> = [];
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const rawAnswers =
    source.answers && typeof source.answers === 'object'
      ? (source.answers as Record<string, unknown>)
      : {};

  const reject = (field: string, message: string) => {
    if (!reasons.some((reason) => reason.field === field)) reasons.push({ field, message });
  };

  const text: Record<string, string> = {};
  for (const [field, limit] of Object.entries(STRINGS)) {
    const value = source[field];
    if (value != null && typeof value !== 'string') {
      reject(field, 'Answer this with text.');
      text[field] = '';
      continue;
    }
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed.length > limit) {
      reject(field, `Keep this under ${limit} characters.`);
      text[field] = trimmed.slice(0, limit);
      continue;
    }
    if (REQUIRED.includes(field as keyof typeof STRINGS) && !trimmed) {
      reject(field, 'This is required.');
    } else if (MINIMUMS[field] && trimmed.length < MINIMUMS[field]) {
      reject(field, 'A little more here, please.');
    }
    text[field] = trimmed;
  }

  const email = normalizeReplyTo(text.email);
  if (text.email && !isPlausibleEmail(email)) reject('email', 'That does not look like an email address.');

  if (!isMambaTrackId(source.track)) {
    reject('track', 'Choose the track you are applying for.');
  }
  const track = (source.track ?? '') as MambaTrackId;

  /* The intake track is a required choice, not a free-text field: an applicant
     is committing to one length. A value outside the two is a forged request. */
  if (!isMambaIntakeTrack(source.intake)) {
    reject('intake', `Choose an intake track: ${MAMBA_INTAKE_TRACKS.join(' or ')}.`);
  }
  const intake = (source.intake ?? '') as MambaIntakeTrack;

  if (text.yearsExperience && !(EXPERIENCE_BANDS as readonly string[]).includes(text.yearsExperience)) {
    reject('yearsExperience', 'Choose one of the listed ranges.');
  }
  if (text.howHeard && !(REFERRAL_OPTIONS as readonly string[]).includes(text.howHeard)) {
    reject('howHeard', 'Choose one of the listed options.');
  }

  /* Only the ids the catalogue knows become answers, so a posted body cannot
     add a field to the record. A question's own `max` is its ceiling; an
     unknown id is dropped rather than rejected, because the client sends every
     id and a stale browser tab is not an attack. */
  const answers: Record<string, string> = {};
  for (const id of QUESTION_IDS) {
    const question = getQuestion(id);
    const value = rawAnswers[id];
    if (value != null && typeof value !== 'string') {
      reject(id, 'Answer this with text.');
      answers[id] = '';
      continue;
    }
    const trimmed = typeof value === 'string' ? value.trim() : '';
    const limit = question?.max ?? 200;
    if (trimmed.length > limit) {
      reject(id, `Keep this under ${limit} characters.`);
      answers[id] = trimmed.slice(0, limit);
      continue;
    }
    if (
      question &&
      question.kind === 'select' &&
      trimmed &&
      !(question.options ?? []).some((option) => option.label === trimmed)
    ) {
      reject(id, 'Choose one of the listed answers.');
    }
    answers[id] = trimmed;
  }

  /* Required answers are required of the track that was chosen — a founder's
     mandatory grant question is not something an employee skipped. */
  if (isMambaTrackId(track)) {
    for (const question of questionsForTrack(track)) {
      if (!question.required) continue;
      const answer = answers[question.id] ?? '';
      if (!answer) {
        reject(question.id, 'We need an answer to this one.');
      } else if (question.kind !== 'select' && question.min && answer.length < question.min) {
        reject(question.id, `A little more here — at least ${question.min} characters.`);
      }
    }
  }

  if (reasons.length) return { ok: false, reasons };

  return {
    ok: true,
    submission: {
      fullName: text.fullName,
      phone: text.phone,
      email,
      track,
      intake,
      currentSituation: text.currentSituation,
      company: text.company,
      role: text.role,
      yearsExperience: text.yearsExperience,
      linkedin: text.linkedin,
      portfolio: text.portfolio,
      github: text.github,
      motivation: text.motivation,
      howHeard: text.howHeard,
      answers,
    },
  };
}

/**
 * The document to store, in the same flat shape the browser used to write: the
 * hand-authored fields, then one field per catalogue answer.
 *
 * `trackLabel` is written from the catalogue rather than taken from the request,
 * so a record always carries the words the applicant saw beside the track they
 * picked. `uid` is kept equal to the document name because the review queue and
 * the dossier download both read that field.
 *
 * `status` is minted only for an application that has never been filed. On a
 * revision it is absent from the patch, which is what keeps a re-submission
 * from pulling a shortlisted or declined record back to the front of the queue.
 * Timestamps are the route's to set — they are Admin SDK values, and a document
 * builder that could be unit-tested in plain Node has no business importing one.
 */
export function buildApplicationDocument(
  submission: ApplicationSubmission,
  options: { recordKey: string; isFirstSubmission: boolean },
): Record<string, unknown> {
  const { answers, ...fields } = submission;
  return {
    ...fields,
    ...answers,
    trackLabel: MAMBA_TRACKS.find((track) => track.id === submission.track)?.label ?? '',
    uid: options.recordKey,
    ...(options.isFirstSubmission ? { status: 'pending' } : {}),
  };
}
