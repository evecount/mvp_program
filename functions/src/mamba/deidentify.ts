/**
 * Identity removal for anything quoted out of an application.
 *
 * An application is the most sensitive document in the system: a name, a
 * phone number, a reply-to email, an employer, a company that may not
 * exist publicly yet, and — in `milestoneContract` — the name of a third
 * party we have been given as a verification route and might telephone.
 * None of that belongs in a briefing, a model prompt, or a memory row.
 *
 * Two passes, in this order, and the order matters:
 *
 * 1. **Field-aware.** The caller hands over the exact strings it does not
 *    want to see again — the applicant's name, their venture, their
 *    employer, their contact. Every one of those is removed as a phrase
 *    and, separately, as its significant words, because a person who
 *    writes "at Northwind Grid" after we strip "Northwind Grid Pte Ltd"
 *    has still named their employer.
 * 2. **Pattern-based.** Emails, Singapore and international phone
 *    numbers, NRIC/FIN, `@handles`, and links — a URL is frequently the
 *    most identifying thing in a sentence, since it resolves to the
 *    company.
 *
 * Money is deliberately *not* scrubbed. "SGD 45,000 committed" is the
 * fact the grant screen needs, and an amount is not an identity. So the
 * digit patterns below target phone shapes (a `+65` prefix, or eight
 * consecutive digits) rather than any long number.
 *
 * This is a redactor, not an anonymiser: it removes what it recognises.
 * A free-text answer can still identify someone by description ("the
 * only female director at a Tier-1 port operator"), which is why the
 * extracts it produces are labelled internal and are never quoted back
 * to an applicant or sent to a public surface.
 */

/** What a redacted run is replaced with. */
export type RedactionLabel =
    | '[name]'
    | '[company]'
    | '[email]'
    | '[phone]'
    | '[nric]'
    | '[link]'
    | '[handle]';

export interface Redaction {
    text: string;
    /** How many runs were replaced. Zero means nothing was found. */
    removed: number;
    /** Distinct labels applied, for the caller to state honestly. */
    kinds: RedactionLabel[];
}

/**
 * Split a configured identity into the pieces worth hunting.
 *
 * The whole phrase first (longest match wins, so "Northwind Grid" is
 * removed rather than reduced to "Grid"), then its significant words.
 * Words under four characters are skipped: "Lim", "Bin", "and", "Pte"
 * and "Co" are too common to strip safely, and a three-letter surname
 * standing alone in prose is usually indistinguishable from a word.
 * That is a real limitation, and it is why `company`-class tokens are
 * also removed by their distinctive words.
 */
function tokenVariants(raw: string): string[] {
    const clean = raw.trim().replace(/\s+/g, ' ');
    if (clean.length < 3) return [];
    const out = new Set<string>([clean]);
    const STOP = new Set([
        'pte', 'ltd', 'llp', 'inc', 'co', 'the', 'and', 'for', 'group',
        'holdings', 'technologies', 'technology', 'solutions', 'services',
        'consulting', 'studio', 'labs', 'my', 'our', 'with',
    ]);
    for (const word of clean.split(' ')) {
        if (word.length >= 4 && !STOP.has(word.toLowerCase())) out.add(word);
    }
    return [...out];
}

/** Escape a literal string for use inside a RegExp. */
function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PATTERNS: ReadonlyArray<{ label: RedactionLabel; re: RegExp }> = [
    // Email before URL: `name@company.com` must not half-survive as a link.
    { label: '[email]', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
    // NRIC / FIN, with or without spaces.
    { label: '[nric]', re: /\b[STFGM]\s?\d{3,4}\s?\d{3}\s?[A-Z]\b/gi },
    // Singapore mobile / fixed line, local or +65, spaced or not.
    { label: '[phone]', re: /(?:\+?65[\s-]?)?[689]\d{2}[\s-]?\d{4}\b/g },
    // Any other long digit run — an international number, an account.
    { label: '[phone]', re: /\b\d[\d\s-]{7,}\d\b/g },
    // @handles, including Telegram t.me links' usernames.
    { label: '[handle]', re: /@[A-Za-z0-9_]{3,}\b/g },
    // URLs and bare domains; a link resolves to the company it names.
    {
        label: '[link]',
        re: /(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|sg|io|co|ai|org|net)(?:\/\S*)?\b/gi,
    },
];

/**
 * Remove identities from one passage of applicant text.
 *
 * `known` is the caller's list of strings that must never survive — pass
 * every identity field on the record, not just the name. Empty strings,
 * duplicates and over-long values are ignored so the caller can pass the
 * record's fields straight through without filtering.
 *
 * All known tokens are applied in a **single pass**. Applying them one
 * after another lets a short token match inside the placeholder an
 * earlier token produced: "accountable to an accountant or law firm I can
 * name" contributed the word `name`, and a second pass over "[name]"
 * emitted "[[name]]" into a founders' briefing. One alternation, longest
 * alternative first, and the output is never re-scanned.
 */
export function redact(text: string, known: readonly string[] = []): Redaction {
    let out = text ?? '';
    let removed = 0;
    const kinds = new Set<RedactionLabel>();

    const variants = [...new Set(known.flatMap(tokenVariants))].sort(
        (a, b) => b.length - a.length,
    );

    if (variants.length) {
        const alternatives = variants.map((token) => {
            const left = /^\w/.test(token) ? '\\b' : '';
            // \b on both ends would fail for tokens with punctuation at
            // the edge ("DN&Co"), so a boundary is asserted only on the
            // sides that are word characters.
            const right = /\w$/.test(token) ? '\\b' : '';
            return `${left}${escapeRe(token)}${right}`;
        });
        out = out.replace(
            new RegExp(`(?:${alternatives.join('|')})`, 'gi'),
            () => {
                removed += 1;
                kinds.add('[name]');
                return '[name]';
            },
        );
    }

    // Companies by their own tell: a legal suffix is the applicant naming
    // the entity, which is how a reader finds the person. This catches
    // employers the form never asked for — an applicant who wrote "I ran
    // distribution planning at SP Group for six years" has named their
    // employer even though no `employer` field exists on a founder.
    out = out.replace(COMPANY_RE, () => {
        removed += 1;
        kinds.add('[company]');
        return '[company]';
    });

    for (const { label, re } of PATTERNS) {
        out = out.replace(re, () => {
            removed += 1;
            kinds.add(label);
            return label;
        });
    }

    // Collapse the debris redaction leaves behind: doubled labels, and
    // any placeholder nesting a superseded pass might have produced.
    out = out
        .replace(/\[{2,}(name|company|email|phone|nric|link|handle)\]{2,}/gi, '[$1]')
        .replace(/(\[(?:name|company)\]\s*(?:,?\s*(?:and\s+)?)?)+\[(?:name|company)\]/gi, '[name]')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return { text: out, removed, kinds: [...kinds] };
}

/**
 * A run that looks like a registered company, not a common noun.
 *
 * Deliberately narrow: it fires on a legal suffix ("Pte Ltd", "&Co",
 * "Holdings") or a corporate closing word ("Group", "Technologies"),
 * preceded by title-case words. It does not try to catch bare names —
 * "I worked at Shell" keeps "Shell", because no suffix marks it and a
 * rule loose enough to guess would start eating the substantive nouns in
 * a technical claim. That residual risk is why the extracts this feeds
 * stay internal.
 */
const COMPANY_RE =
    /\b(?:[A-Z][\w&'-]*\s+){0,3}[A-Z][\w&'-]*\s*(?:Pte\.?\s+Ltd\.?|Private Limited|Ltd\.?|LLP|LLC|Inc\.?|Pte\.|&\s*Co\b(?:\.?)?|Holdings|Technologies|Technology|Solutions|Consulting|Enterprises|Capital|Ventures|Foundation|Group)(?![a-z])/g;

/**
 * Every string on a record that identifies a person or a company.
 *
 * Exported so the check script can assert the list covers the schema,
 * and so a new identity field cannot quietly skip redaction: it has to
 * be added here or the assertion fails.
 *
 * Select answers are **not** listed, and must never be. Their values are
 * catalogue prose ("An accountant or law firm I can name"), so feeding
 * them in as tokens strips ordinary English words out of every quote.
 * Free-text content fields are not listed either — they are the payload
 * being redacted, not the vocabulary to redact with.
 */
export const IDENTITY_FIELDS: readonly string[] = [
    'fullName',
    'email',
    'phone',
    'company',
    'currentCompany',
    'ventureName',
    'employerOrClients',
    'employer',
    'contactName',
    'contactRelation',
    'referenceName',
    'referenceEmail',
    'teamMembers',
    'whatsapp',
    'telegram',
];

/** Pull the identity strings off a record and its answers. */
export function identityTokens(
    record: Record<string, unknown>,
    answers: Record<string, unknown> = {},
): string[] {
    const out: string[] = [];
    for (const src of [record, answers]) {
        for (const field of IDENTITY_FIELDS) {
            const v = src[field];
            if (typeof v === 'string' && v.trim()) out.push(v.trim());
        }
    }
    return out;
}

/**
 * Redact every listed answer once, keyed by question id.
 *
 * `interviewDraft.ts` and `oneAssessment.ts` both build a prompt from the
 * same application and both used to call `redact()` on every answer
 * themselves — harmless when only one ran per dossier build, doubled work
 * once they started running concurrently off the same input. Computing the
 * map once here and handing both builders the same object removes that
 * duplication without changing what either of them sees.
 */
export function redactAnswers(
    record: Record<string, unknown>,
    answers: Record<string, unknown>,
    ids: readonly string[],
): Record<string, string> {
    const tokens = identityTokens(record, answers);
    const out: Record<string, string> = {};
    for (const id of ids) {
        const raw = answers[id];
        const value = typeof raw === 'string' ? raw.trim() : '';
        if (value) out[id] = redact(value, tokens).text;
    }
    return out;
}
