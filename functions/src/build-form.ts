/**
 * Generate the site's form catalogue and the Firestore rules from ./mamba.
 *
 *   cd functions && npm run build:form
 *
 * The questions, their options and their limits live once, in
 * mamba/questionnaire.ts and mamba/application.ts (copied from cybrdeck-website).
 * This writes:
 *
 *   ../js/application-questions.js  what js/apply.js renders, step by step
 *   ../firestore.rules              the create-only allowlist for that same shape
 *
 * Re-run it after changing a question, then deploy hosting and the rules.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  APPLICATION_FIELD_LIMITS,
} from './mamba/application';
import {
  EXPERIENCE_BANDS,
  MAMBA_INTAKE_TRACKS,
  MAMBA_TRACKS,
  REFERRAL_OPTIONS,
  currentCohort,
  COHORTS,
  cohortClosesAt,
} from './mamba/program';
import { QUESTION_SECTIONS_RAW, getRawQuestion, type Question } from './mamba/questionnaire';

const ROOT = join(__dirname, '..', '..');
const SCHEMA_VERSION = 2;

interface Field {
  id: string;
  label: string;
  kind: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox';
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<string | { value: string; label: string; hint?: string }>;
  tracks?: readonly string[];
  autocomplete?: string;
  placeholder?: string;
}

const L = APPLICATION_FIELD_LIMITS;

const fromCatalogue = (q: Question): Field => ({
  id: q.id,
  label: q.label,
  kind: q.kind,
  ...(q.help ? { hint: q.help } : {}),
  ...(q.required ? { required: true } : {}),
  ...(q.min ? { min: q.min } : {}),
  max: q.max ?? 200,
  ...(q.options ? { options: q.options.map((o) => o.label) } : {}),
  ...(q.tracks ? { tracks: q.tracks } : {}),
});

const section = (id: string) => {
  const s = QUESTION_SECTIONS_RAW.find((x) => x.id === id);
  if (!s) throw new Error(`no section ${id}`);
  return {
    id: s.id,
    title: s.title,
    intro: s.intro,
    fields: s.questions.map((qid) => {
      const q = getRawQuestion(qid);
      if (!q) throw new Error(`section ${id} names unknown question ${qid}`);
      return fromCatalogue(q);
    }),
  };
};

const cohort = currentCohort();

/* Same order as cybrdeck.com/venture-program/register. */
const steps: Array<{ id: string; title: string; intro?: string; fields: Field[] }> = [
  {
    id: 'details',
    title: 'Your details',
    intro: 'Who you are and where we reply. We only use these to review your application and get back to you.',
    fields: [
      { id: 'fullName', label: 'Full name', kind: 'text', required: true, max: L.fullName, autocomplete: 'name' },
      { id: 'phone', label: 'Mobile', kind: 'tel', required: true, max: L.phone, autocomplete: 'tel', placeholder: '+65 …' },
      {
        id: 'email', label: 'Where should we reply?', kind: 'email', required: true, max: L.email,
        autocomplete: 'email', placeholder: 'you@company.com',
      },
    ],
  },
  {
    id: 'track',
    title: 'Your track and intake',
    intro: cohort ? `The next cohort begins ${cohort.startsLabel}, for both the 1-month and 3-month tracks.` : undefined,
    fields: [
      {
        id: 'track', label: 'Which track are you applying for?', kind: 'select', required: true,
        options: MAMBA_TRACKS.map((t) => ({ value: t.id, label: t.label, hint: t.audience })),
      },
      {
        id: 'intake', label: 'Which intake are you applying for?', kind: 'select', required: true,
        options: MAMBA_INTAKE_TRACKS.map((i) => ({ value: i, label: `${i.replace(' Month', '-month')} track` })),
      },
    ],
  },
  {
    id: 'now',
    title: 'Where you are now',
    fields: [
      {
        id: 'currentSituation', label: 'What you are working on today, and what you want to change',
        kind: 'textarea', required: true, min: 20, max: L.currentSituation,
      },
      { id: 'company', label: 'Company or organization', kind: 'text', max: L.company, autocomplete: 'organization' },
      { id: 'role', label: 'Role or title', kind: 'text', max: L.role, autocomplete: 'organization-title' },
      { id: 'yearsExperience', label: 'Years of relevant experience', kind: 'select', options: [...EXPERIENCE_BANDS], max: 64 },
    ],
  },
  section('bringing'),
  section('venture'),
  {
    id: 'work',
    title: 'Where we can look at your work',
    fields: [
      { id: 'linkedin', label: 'LinkedIn', kind: 'url', max: L.linkedin, placeholder: 'https://linkedin.com/in/…' },
      { id: 'portfolio', label: 'Portfolio or product', kind: 'url', max: L.portfolio, placeholder: 'https://…' },
      { id: 'github', label: 'GitHub', kind: 'url', max: L.github, placeholder: 'https://github.com/…' },
    ],
  },
  section('commitment'),
  section('coachability'),
  section('expectations'),
  {
    id: 'why',
    title: 'Why this program',
    fields: [
      {
        id: 'motivation', label: 'What you want out of the program, and what you will bring',
        kind: 'textarea', required: true, min: 60, max: L.motivation,
      },
      { id: 'howHeard', label: 'How you heard about it', kind: 'select', options: [...REFERRAL_OPTIONS], max: 200 },
      {
        id: 'consent',
        label:
          'I confirm these answers are my own and accurate, and I agree to the Cybrdeck founders and the Mamba Venture Program partners reviewing them for this cohort.',
        kind: 'checkbox', required: true,
      },
      {
        id: 'acceptTerms',
        label: 'I have read and agree to the [Terms and conditions](/legal/terms.html).',
        kind: 'checkbox', required: true,
      },
      {
        id: 'acceptPrivacy',
        label:
          'I have read the [Privacy policy](/legal/privacy.html) and [Data protection notice](/legal/data-protection.html), and I consent to Mamba JJ Partners Pte. Ltd. collecting, using and disclosing my personal data as they describe, including through Cybrdeck as its technology partner, to assess this application.',
        kind: 'checkbox', required: true,
      },
    ],
  },
];

/* ── js/application-questions.js ─────────────────────────────────────── */

const banner = (what: string) =>
  `GENERATED by functions/src/build-form.ts from the catalogue in functions/src/mamba/ — do not edit ${what} by hand.`;

writeFileSync(
  join(ROOT, 'js', 'application-questions.js'),
  `/**
 * Mamba MVP — the application form, step by step.
 *
 * ${banner('this file')}
 * It is the same questionnaire as cybrdeck.com/venture-program/register, and
 * the Cloud Function scores it with the same weights.
 */
window.MVP_APPLICATION = ${JSON.stringify({ schemaVersion: SCHEMA_VERSION, steps }, null, 2)};
`,
);

/* ── firestore.rules ─────────────────────────────────────────────────── */

const fields = steps.flatMap((s) => s.fields);
const stringFields = fields.filter((f) => f.kind !== 'checkbox');
const required = ['fullName', 'phone', 'email', 'track', 'intake', 'currentSituation', 'motivation'];
const allKeys = [...fields.map((f) => f.id), 'cohort', 'status', 'schemaVersion', 'createdAt'];
/* An application must name a cohort whose applications are still open (72h before it starts). */
const openGate = COHORTS.map((c) => `(d.cohort == '${c.starts}' && request.time < timestamp.value(${cohortClosesAt(c)}))`).join('\n              || ');
const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const list = (xs: readonly string[], indent: string) => {
  const lines: string[] = [];
  let line = '';
  for (const x of xs.map(q)) {
    if (line && line.length + x.length > 80) {
      lines.push(line);
      line = '';
    }
    line += (line ? ', ' : '') + x;
  }
  if (line) lines.push(line);
  return `[${lines.join(`,\n${indent}`)}]`;
};

writeFileSync(
  join(ROOT, 'firestore.rules'),
  `rules_version = '2';

// Mamba MVP — application pipeline.
//
// ${banner('this file')}
//
// The public site may only CREATE an application. Nobody can read, list, edit
// or delete one from a browser. The Cloud Function (functions/src/index.ts)
// re-validates every answer against the catalogue, scores it, and mails the
// dossier; reviewers read applications in the Firebase console.
service cloud.firestore {
  match /databases/{database}/documents {

    match /mvp_applications/{applicationId} {
      allow read, update, delete: if false;
      allow create: if isValidApplication(request.resource.data);
    }

    // Everything else is closed.
    match /{document=**} {
      allow read, write: if false;
    }

    function fields() {
      return ${list(allKeys, '              ')};
    }

    // Inline size checks rather than a helper: a helper call per field pushes
    // a ~50-field application past the 1,000-expression limit per request.
    // Types are re-checked by the Cloud Function, which rejects anything off.
    function isValidApplication(d) {
      let keys = fields();
      return d.keys().hasOnly(keys)
        && d.keys().hasAll(keys)
        && d.email.matches('^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$')
        && d.track in ${list(MAMBA_TRACKS.map((t) => t.id), '                      ')}
        && d.intake in ${list(MAMBA_INTAKE_TRACKS, '                       ')}
${fields.filter((f) => f.kind === 'checkbox' && f.required).map((f) => `        && d.${f.id} == true`).join('\n')}
        && (${openGate})
        && d.status == 'pending'
        && d.schemaVersion == ${SCHEMA_VERSION}
        && d.createdAt == request.time
        && ${required.filter((k) => k !== 'track' && k !== 'intake').map((k) => `d.${k}.size() > 0`).join(' && ')}
${stringFields.filter((f) => f.kind !== 'select').map((f) => `        && d.${f.id}.size() <= ${f.max ?? 200}`).join('\n')}
${stringFields.filter((f) => f.kind === 'select' && f.id !== 'track' && f.id !== 'intake').map((f) => `        && d.${f.id}.size() <= 200`).join('\n')};
    }
  }
}
`,
);

writeFileSync(
  join(ROOT, 'js', 'cohorts.js'),
  `/* ${banner('this file')}
 * The cohort calendar: the site's countdown and the application form read it;
 * the Firestore rules and the Cloud Function enforce the same deadlines. */
window.MVP_COHORTS = ${JSON.stringify(COHORTS.map((c) => ({ n: c.n, starts: c.starts, startsAt: c.startsAt, startsLabel: c.startsLabel, closesAt: cohortClosesAt(c) })), null, 2)};
`,
);

console.log(`wrote ${steps.length} steps, ${fields.length} fields, ${COHORTS.length} cohorts`);
