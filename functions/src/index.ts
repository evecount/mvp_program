/**
 * Mamba MVP — what happens after someone applies.
 *
 * The site files each application straight into `mvp_applications` (the rules
 * allow create and nothing else). This trigger picks up every new document and
 * runs the same pipeline as cybrdeck.com's POST /api/mamba/apply:
 *
 *   1. validate it against the catalogue (a forged write is marked, not mailed)
 *   2. score it on the seven readiness axes and screen it against the grants
 *   3. build the dossier PDF — the application as written, then the private
 *      assessment with the 3D readiness radar
 *   4. mail the reviewers with the PDF attached, and send the applicant a receipt
 *
 * The modules under ./mamba are copied from cybrdeck-website/src/lib/mamba so
 * the score, the radar and the PDF match what cybrdeck.com produces. What is
 * left out: the model passes (One's review, the drafted interview questions)
 * and Drive filing — the PDF travels as an attachment instead.
 *
 * Every mail failure is recorded on the document rather than thrown: a retry
 * would re-score and re-mail an application that is already safely stored.
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';
import { parseApplicationSubmission } from './mamba/application';
import { MAMBA_TRACKS } from './mamba/program';
import { QUESTION_IDS } from './mamba/questionnaire';
import { dossierFilename, matchGrants, scoreApplication } from './mamba/assessment';
import { buildDossierPdf, pdfText } from './mamba/dossierPdf';
import { buildConfirmationEmail } from './mamba/confirmationEmail';

initializeApp();
const db = getFirestore();

const COLLECTION = 'mvp_applications';

const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '587' });
const SMTP_USER = defineString('SMTP_USER');
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');
/** Comma-separated. Everyone here gets the dossier PDF. */
const REVIEWER_EMAILS = defineString('REVIEWER_EMAILS');

/** One receipt per address per day: the form is public, and the receipt goes to
 *  whatever address was typed, so this keeps it from being used to mail-bomb. */
const RECEIPT_WINDOW_MS = 24 * 60 * 60 * 1000;

function transport() {
  const port = Number(SMTP_PORT.value()) || 587;
  return nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port,
    secure: port === 465,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASSWORD.value() },
  });
}

/** The document as `parseApplicationSubmission` expects it: answers nested. */
function asSubmission(record: Record<string, unknown>) {
  const answers: Record<string, unknown> = {};
  for (const id of QUESTION_IDS) answers[id] = record[id];
  return { ...record, answers };
}

async function receiptAlreadySent(email: string, docId: string): Promise<boolean> {
  // Filtered by date here rather than in the query, which would need a
  // composite index; one address only ever has a handful of applications.
  const since = Timestamp.fromMillis(Date.now() - RECEIPT_WINDOW_MS);
  const sameAddress = await db.collection(COLLECTION).where('email', '==', email).get();
  return sameAddress.docs.some((d) => {
    const sentAt = d.get('receiptSentAt');
    return d.id !== docId && sentAt instanceof Timestamp && sentAt >= since;
  });
}

export const onApplicationFiled = onDocumentCreated(
  {
    document: `${COLLECTION}/{applicationId}`,
    region: 'asia-southeast1',
    secrets: [SMTP_PASSWORD],
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const ref = snap.ref;
    const record = snap.data() as Record<string, unknown>;

    const parsed = parseApplicationSubmission(asSubmission(record));
    if (!parsed.ok) {
      // The site validates the same catalogue, so this is a hand-crafted write.
      logger.warn('[mvp] invalid application, not mailed', { id: ref.id, reasons: parsed.reasons });
      await ref.set({ rejected: parsed.reasons, processedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }
    const { submission } = parsed;
    const trackLabel = MAMBA_TRACKS.find((t) => t.id === submission.track)?.label ?? '';
    const stored = { ...record, trackLabel };

    const answers = submission.answers;
    const assessment = scoreApplication(answers, submission.track);
    const grants = matchGrants(answers, submission.track);
    const filename = dossierFilename(
      pdfText(answers.ideaTitle),
      pdfText(submission.fullName) || 'Untitled application',
    );
    const pdf = Buffer.from(buildDossierPdf({ record: stored, answers, assessment, grants, draft: null }));

    const mail = transport();
    const from = `"Mamba Venture Program" <${SMTP_USER.value()}>`;
    const name = submission.fullName || 'Applicant';
    const idea = answers.ideaTitle || 'Untitled';

    const reviewerMail = mail
      .sendMail({
        from,
        to: REVIEWER_EMAILS.value(),
        replyTo: submission.email,
        subject: `MVP application: ${name} — ${idea} (${assessment.bandLabel}, ${Math.round(assessment.overall * 100)})`,
        text: [
          'A new Mamba Venture Program application came in through the MVP site.',
          '',
          `Name:      ${name}`,
          `Reply-to:  ${submission.email}`,
          `Phone:     ${submission.phone}`,
          `Track:     ${trackLabel}`,
          `Intake:    ${submission.intake}`,
          `Idea:      ${idea}`,
          '',
          `Readiness: ${Math.round(assessment.overall * 100)} / 100 — ${assessment.bandLabel}`,
          `Grant liability risk: ${assessment.grantRisk}`,
          ...assessment.axes.map((a) => `  ${a.label.padEnd(24)} ${Math.round(a.score * 100)}`),
          '',
          'The attached dossier has the full application, the readiness radar and the grant screen.',
          `Firestore: mvp_applications/${ref.id}`,
        ].join('\n'),
        attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
      })
      .then(() => null)
      .catch((err: Error) => err.message || String(err));

    const receiptMail = receiptAlreadySent(submission.email, ref.id)
      .then((sent) => {
        if (sent) return 'skipped: a receipt already went to this address today';
        const { subject, text } = buildConfirmationEmail({
          fullName: submission.fullName,
          trackLabel,
          replyTo: submission.email,
          intake: submission.intake,
        });
        return mail.sendMail({ from, to: submission.email, subject, text }).then(() => null);
      })
      .catch((err: Error) => err.message || String(err));

    const [reviewerError, receiptError] = await Promise.all([reviewerMail, receiptMail]);
    if (reviewerError) logger.error('[mvp] reviewer mail failed', { id: ref.id, error: reviewerError });
    if (receiptError) logger.warn('[mvp] receipt not sent', { id: ref.id, error: receiptError });

    await ref.set(
      {
        trackLabel,
        assessment: {
          overall: assessment.overall,
          band: assessment.band,
          bandLabel: assessment.bandLabel,
          axes: assessment.axes,
          grantRisk: assessment.grantRisk,
          grantRiskReasons: assessment.grantRiskReasons,
          verificationGaps: assessment.verificationGaps,
          scoredAt: assessment.scoredAt,
        },
        grantMatches: grants.map((m) => ({
          id: m.program.id,
          name: m.program.name,
          agency: m.program.agency,
          verdict: m.verdict,
          gap: m.gap ?? null,
        })),
        dossierName: filename,
        reviewerMailError: reviewerError,
        ...(receiptError ? { receiptError } : { receiptSentAt: FieldValue.serverTimestamp() }),
        processedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  },
);
