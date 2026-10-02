/**
 * Mamba MVP — what happens after someone applies.
 *
 * The site files each application straight into `mvp_applications` (the rules
 * allow create and nothing else). This trigger picks up every new document and
 * runs the same pipeline as cybrdeck.com's POST /api/mamba/apply:
 *
 *   1. validate it against the catalogue (a forged write is marked, not mailed)
 *   2. score it on the seven readiness axes and screen it against the grants
 *   3. have One review the rule-based score: it reads the de-identified
 *      application and may move each axis by at most 15 points, with a reason
 *   4. build the dossier PDF from the blended score — the application as
 *      written, then the private assessment with the 3D readiness radar
 *   5. file the PDF in the Mamba shared drive (DRIVE_FOLDER_ID)
 *   6. mail the reviewers with the PDF attached and a link to the Drive copy,
 *      and send the applicant a receipt
 *
 *      alongside 3, the same model drafts 3–5 follow-up interview questions, each
 *      grounded in answers the applicant actually gave (an annotation, never a score)
 *
 * The modules under ./mamba are copied from cybrdeck-website/src/lib/mamba so
 * the score, One's review, the drafted questions, the radar and the PDF match
 * what cybrdeck.com produces.
 *
 * Drive filing is best-effort too: a failed upload is recorded as `driveError`
 * and the reviewers still get the PDF as an attachment.
 *
 * Both model passes are best-effort, as on cybrdeck.com: if Qwen is slow or
 * down, the rule-based score and interview sheet stand and the email says so.
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
import { dossierFilename, interviewSheet, matchGrants, scoreApplication } from './mamba/assessment';
import { buildDossierPdf, pdfText } from './mamba/dossierPdf';
import { buildConfirmationEmail } from './mamba/confirmationEmail';
import { blendAssessment, reviewAssessmentWithOne } from './mamba/oneAssessment';
import { redactAnswers } from './mamba/deidentify';
import { draftInterviewQuestions } from './mamba/interviewDraft';
import { fileDossier } from './mamba/drive';

initializeApp();
const db = getFirestore();

const COLLECTION = 'mvp_applications';

const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '587' });
const SMTP_USER = defineString('SMTP_USER');
const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');
/** Alibaba Model Studio key One's review runs on (DASHSCOPE_BASE_URL is in .env). */
const DASHSCOPE_API_KEY = defineSecret('DASHSCOPE_API_KEY');
/** Comma-separated. Everyone here gets the dossier PDF. */
const REVIEWER_EMAILS = defineString('REVIEWER_EMAILS');
/** The Mamba shared drive (or a folder in it) the dossier PDFs are filed in. */
const DRIVE_FOLDER_ID = defineString('DRIVE_FOLDER_ID');

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
    secrets: [SMTP_PASSWORD, DASHSCOPE_API_KEY],
    memory: '512MiB',
    // One's review alone may take its full 40s budget.
    timeoutSeconds: 180,
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
    const baseline = scoreApplication(answers, submission.track);
    const grants = matchGrants(answers, submission.track);

    /* Same shape and order as cybrdeck's dossier-build.ts: the two model
       passes read the same redacted answers concurrently, the review given a
       short head start delay so the two calls don't land on the shared Qwen
       workspace in the same instant. */
    const flatGrants = grants.map((m) => ({ id: m.program.id, name: m.program.name, verdict: m.verdict, gap: m.gap ?? null }));
    const redactedAnswers = redactAnswers(stored, answers, QUESTION_IDS);
    const [draftOutcome, oneOutcome] = await Promise.all([
      draftInterviewQuestions({
        record: stored,
        answers,
        track: submission.track,
        assessment: baseline,
        grants: flatGrants,
        deterministic: interviewSheet(answers, submission.track, flatGrants),
        redactedAnswers,
      }).catch((err: Error) => ({ ok: false as const, reason: `drafting threw: ${err?.message ?? err}` })),
      new Promise((resolve) => setTimeout(resolve, 300))
        .then(() =>
          reviewAssessmentWithOne({ record: stored, answers, track: submission.track, assessment: baseline, redactedAnswers }),
        )
        .catch((err: Error) => ({ ok: false as const, reason: `One's review threw: ${err?.message ?? err}` })),
    ]);
    const draft = draftOutcome.ok ? draftOutcome.draft : null;
    if (!draftOutcome.ok) logger.warn('[mvp] interview draft unavailable', { id: ref.id, reason: draftOutcome.reason });
    const oneReview = oneOutcome.ok ? oneOutcome.result : null;
    if (!oneOutcome.ok) logger.warn("[mvp] One's review unavailable", { id: ref.id, reason: oneOutcome.reason });
    const assessment = oneReview ? blendAssessment(baseline, oneReview) : baseline;
    const moved = baseline.axes.flatMap((b) => {
      const adj = oneReview?.axes[b.axis];
      return adj ? [{ axis: b, adj }] : [];
    });
    const pct = (n: number) => Math.round(n * 100);
    const filename = dossierFilename(
      pdfText(answers.ideaTitle),
      pdfText(submission.fullName) || 'Untitled application',
    );
    const pdf = Buffer.from(buildDossierPdf({ record: stored, answers, assessment, grants, draft }));

    let driveFileId: string | null = null;
    let driveError: string | null = null;
    try {
      driveFileId = await fileDossier(pdf, filename, DRIVE_FOLDER_ID.value());
    } catch (err) {
      driveError = (err as Error)?.message || String(err);
      logger.error('[mvp] Drive filing failed', { id: ref.id, error: driveError });
    }

    const mail = transport();
    const from = `"Mamba Venture Program" <${SMTP_USER.value()}>`;
    const name = submission.fullName || 'Applicant';
    const idea = answers.ideaTitle || 'Untitled';

    const reviewerMail = mail
      .sendMail({
        from,
        to: REVIEWER_EMAILS.value(),
        replyTo: submission.email,
        subject: `MVP application: ${name} — ${idea} (${assessment.bandLabel}, ${pct(assessment.overall)})`,
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
          `Readiness: ${pct(assessment.overall)} / 100 — ${assessment.bandLabel}${oneReview && moved.length ? ' (after One\'s review)' : ''}`,
          `Grant liability risk: ${assessment.grantRisk}`,
          ...assessment.axes.map((a) => `  ${a.label.padEnd(24)} ${pct(a.score)}`),
          '',
          ...(oneReview
            ? [
                `One's review (${oneReview.model}): rule-based ${pct(baseline.overall)} -> ${pct(assessment.overall)}`,
                ...(moved.length
                  ? moved.map(
                      ({ axis, adj }) =>
                        `  ${axis.label}: ${pct(axis.score)} -> ${pct(Math.min(1, Math.max(0, axis.score + adj.adjust)))}. ${adj.reason}`,
                    )
                  : ['  Left every axis at the rule-based reading.']),
                ...(oneReview.summary ? ['', `One's read: ${oneReview.summary}`] : []),
              ]
            : [`One's review: unavailable (${oneOutcome.ok ? '' : oneOutcome.reason}). The score is the rule-based reading.`]),
          '',
          draft
            ? `Interview: ${draft.questions.length} model-drafted follow-up questions are on the dossier's interview page.`
            : `Interview: no drafted questions (${draftOutcome.ok ? '' : draftOutcome.reason}); the rule-based sheet is in the dossier.`,
          '',
          'The attached dossier has the full application, the readiness radar and the grant screen.',
          driveFileId
            ? `Drive copy: https://drive.google.com/file/d/${driveFileId}/view`
            : `Drive copy: not filed (${driveError})`,
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
        assessmentReviewedByOne: moved.length > 0,
        oneAssessment: oneReview
          ? { summary: oneReview.summary, axes: oneReview.axes, model: oneReview.model, generatedAt: oneReview.generatedAt }
          : null,
        oneAssessmentReason: oneOutcome.ok ? null : oneOutcome.reason,
        interviewDraft: draft
          ? { questions: draft.questions, model: draft.model, generatedAt: draft.generatedAt, dropped: draft.dropped }
          : null,
        draftReason: draftOutcome.ok ? null : draftOutcome.reason,
        baselineAssessment: {
          overall: baseline.overall,
          band: baseline.band,
          bandLabel: baseline.bandLabel,
          axes: baseline.axes,
        },
        dossierName: filename,
        driveFileId,
        driveFolderId: driveFileId ? DRIVE_FOLDER_ID.value() : null,
        driveError,
        reviewerMailError: reviewerError,
        ...(receiptError ? { receiptError } : { receiptSentAt: FieldValue.serverTimestamp() }),
        processedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  },
);
