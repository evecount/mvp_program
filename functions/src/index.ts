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
 *   6. mail the reviewers with the PDF attached, and send the applicant a receipt
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
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';
import { parseApplicationSubmission } from './mamba/application';
import { COHORTS, MAMBA_TRACKS, cohortClosesAt } from './mamba/program';
import { QUESTION_IDS } from './mamba/questionnaire';
import { dossierFilename, interviewSheet, matchGrants, scoreApplication } from './mamba/assessment';
import { buildDossierPdf, pdfText } from './mamba/dossierPdf';
import { buildConfirmationEmail } from './mamba/confirmationEmail';
import { blendAssessment, reviewAssessmentWithOne } from './mamba/oneAssessment';
import { redactAnswers } from './mamba/deidentify';
import { draftInterviewQuestions } from './mamba/interviewDraft';
import { fileDossier } from './mamba/drive';
import { fetchNextInfoSession, type InfoSession } from './mamba/luma';

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
    /* The rules already refuse a closed cohort; this catches anything that
       reached the database another way (an admin import, a rules rollback). */
    const filedAt = record.createdAt instanceof Timestamp ? record.createdAt.toMillis() : Date.now();
    const cohort = COHORTS.find((c) => c.starts === record.cohort);
    if (!cohort || filedAt >= cohortClosesAt(cohort)) {
      logger.warn('[mvp] application for a closed or unknown cohort, not mailed', { id: ref.id, cohort: record.cohort });
      await ref.set({ rejected: ['cohort closed'], processedAt: FieldValue.serverTimestamp() }, { merge: true });
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
          // No Drive link here: Gmail renders it as a second PDF card beside the
          // attachment, and not every reviewer is a member of the shared drive.
          driveFileId ? 'A copy is filed in the Mamba shared drive.' : `Not filed in the shared drive (${driveError}).`,
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


/* ── Next info session (Luma) ───────────────────────────────────────────
   Served at /api/next-info-session through a Hosting rewrite. The site fills
   its info-session date, time and RSVP link from this, so publishing the next
   session on Luma updates the site with no code change. Cached in memory and
   at the CDN; a Luma outage serves the last good answer if there is one. */
let infoCache: { at: number; next: InfoSession | null } | null = null;

export const nextInfoSession = onRequest(
  { region: 'asia-southeast1', memory: '256MiB', maxInstances: 5, cors: true },
  async (_req, res) => {
    const fresh = infoCache && Date.now() - infoCache.at < 10 * 60 * 1000;
    if (!fresh) {
      try {
        infoCache = { at: Date.now(), next: await fetchNextInfoSession() };
      } catch (err) {
        logger.warn('Luma feed unavailable', { error: String(err) });
        if (!infoCache) {
          res.set('Cache-Control', 'no-store').status(502).json({ next: null });
          return;
        }
      }
    }
    res.set('Cache-Control', 'public, max-age=300, s-maxage=900');
    res.json({ next: infoCache!.next });
  },
);

/* ── Contact enquiries ─────────────────────────────────────────────────
   Served at /api/contact through a Hosting rewrite. A public enquiry is
   validated, kept in mvp_enquiries (the record our data protection policy
   describes) and mailed to the reviewers through the same SMTP account, with
   Reply-To set to the sender so a reply goes straight back. Nothing is mailed
   to the sender, so the form can't be used to send mail to a stranger.
   Abuse guards: a honeypot field, a minimum time on the page, length limits,
   and at most 3 enquiries per address and 10 per IP per day. */
const ENQUIRIES = 'mvp_enquiries';
const ENQUIRY_TOPICS = ['Applying to the programme', 'Schools and universities', 'Enterprise', 'Partnering or mentoring', 'Media', 'Something else'];
/* The network form (partner.html): people who want to mentor, invest or build with the programme. */
const NETWORK_ROLES = ['Mentor or domain advisor', 'Angel investor', 'VC fund', 'Venture builder or studio', 'Incubator or ecosystem partner', 'Venture or commercial partner', 'Corporate or service partner'];
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const contactEnquiry = onRequest(
  { region: 'asia-southeast1', memory: '256MiB', maxInstances: 3, secrets: [SMTP_PASSWORD] },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const str = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '');
    const name = str('name', 120), email = str('email', 200).toLowerCase(), organisation = str('organisation', 160);
    const topic = str('topic', 80), message = str('message', 4000), website = str('website', 200);
    const elapsed = Number(b.elapsed) || 0;
    const linkedin = str('linkedin', 300);
    const network = NETWORK_ROLES.includes(topic);

    // Bots fill the hidden field or submit instantly: answer as if it worked.
    if (website || elapsed < 3000) { res.json({ ok: true }); return; }
    const reasons: string[] = [];
    if (name.length < 2) reasons.push('name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) reasons.push('email');
    if (!ENQUIRY_TOPICS.includes(topic) && !network) reasons.push('topic');
    if (linkedin && !/^https?:\/\/\S+$/.test(linkedin)) reasons.push('linkedin');
    if (message.length < 10) reasons.push('message');
    if (b.acceptTerms !== true) reasons.push('acceptTerms');
    if (b.acceptPrivacy !== true) reasons.push('acceptPrivacy');
    if (reasons.length) { res.status(400).json({ ok: false, reasons }); return; }

    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim();
    const since = Timestamp.fromMillis(Date.now() - RECEIPT_WINDOW_MS);
    const [byEmail, byIp] = await Promise.all([
      db.collection(ENQUIRIES).where('email', '==', email).get(),
      db.collection(ENQUIRIES).where('ip', '==', ip).get(),
    ]);
    const recent = (s: FirebaseFirestore.QuerySnapshot) => s.docs.filter((d) => { const t = d.get('createdAt'); return t instanceof Timestamp && t >= since; }).length;
    if (recent(byEmail) >= 3 || recent(byIp) >= 10) { res.status(429).json({ ok: false, reasons: ['rate'] }); return; }

    const ref = await db.collection(ENQUIRIES).add({ name, email, organisation, topic, linkedin, kind: network ? 'network' : 'enquiry', message, ip, acceptedTerms: true, acceptedPrivacy: true, createdAt: FieldValue.serverTimestamp() });
    const to = REVIEWER_EMAILS.value().split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await transport().sendMail({
        from: `"Mamba Venture Program" <${SMTP_USER.value()}>`,
        to,
        replyTo: { name, address: email },
        subject: `[MVP ${network ? 'network' : 'enquiry'}] ${topic}: ${name}${organisation ? `, ${organisation}` : ''}`,
        text: `${message}\n\n—\n${name}\n${email}${organisation ? `\n${organisation}` : ''}${linkedin ? `\n${linkedin}` : ''}\nTopic: ${topic}\n\nReply to this email to answer ${name} directly.`,
        html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#0c0c0e">
          <p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(message)}</p>
          <p style="margin:0;color:#3a3a40">— <strong>${escapeHtml(name)}</strong><br>${escapeHtml(email)}${organisation ? `<br>${escapeHtml(organisation)}` : ''}${linkedin ? `<br><a href="${escapeHtml(linkedin)}">${escapeHtml(linkedin)}</a>` : ''}<br>Topic: ${escapeHtml(topic)}</p>
          <p style="margin:20px 0 0;color:#8a8a90;font-size:13px">Reply to this email to answer ${escapeHtml(name)} directly.</p></div>`,
      });
      await ref.set({ mailedAt: FieldValue.serverTimestamp() }, { merge: true });
      res.json({ ok: true });
    } catch (err) {
      logger.error('[mvp] enquiry mail failed', { id: ref.id, error: String(err) });
      await ref.set({ mailError: String(err) }, { merge: true });
      res.status(502).json({ ok: false, reasons: ['mail'] });
    }
  },
);
