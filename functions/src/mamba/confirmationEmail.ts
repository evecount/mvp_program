/**
 * Mamba Venture Program — the applicant confirmation email.
 *
 * One builder, two consumers: @/lib/mamba/applicantMail mails exactly this on
 * the way through POST /api/mamba/apply, and the dev preview (`?demo=email` on
 * the register page) renders exactly this, so what gets reviewed is
 * byte-identical to what goes out. Plain text on purpose — the same register as
 * the reviewer alert, with no HTML template to drift away from the program
 * facts.
 */
import { PROGRAM_TERMS, currentCohort } from './program';

export interface ConfirmationEmailInput {
  fullName: string;
  trackLabel: string;
  /** The reply-to address the applicant filed on the form. */
  replyTo: string;
  /** The intake length the applicant chose ("1 Month" / "3 Month"). When
   *  present the confirmation names it, so the mail never reads as both. */
  intake?: string;
  /** Base URL of the register page, e.g. https://cybrdeck.com/venture-program/register. */
  editUrl?: string;
  /** The private revision token. When present the "change something" line links
   *  straight back to this application instead of describing the process. */
  editToken?: string;
}

export function buildConfirmationEmail({
  fullName,
  trackLabel,
  replyTo,
  intake,
  editUrl,
  editToken,
}: ConfirmationEmailInput) {
  const first = fullName.trim().split(/\s+/)[0] || 'there';
  const trackClause = trackLabel.trim() ? `, queued under the ${trackLabel.trim()} track` : '';
  const cohort = currentCohort();
  const chosen = intake?.trim();
  const durationLine = chosen
    ? `You applied for the ${chosen.toLowerCase()} intake${cohort ? `, for the cohort that begins ${cohort.startsLabel}` : ''}`
    : PROGRAM_TERMS.duration;
  const revision =
    editUrl && editToken
      ? `Need to change something? Use your private link to reopen this application — editing it does not put you at the back of the queue: ${editUrl}?edit=${editToken}`
      : 'Need to change something? Reply to this email and tell us what to update — it does not put you at the back of the queue.';
  return {
    subject: 'We have your Mamba Venture Program application',
    text: [
      `Hi ${first},`,
      '',
      `Your application for the Mamba Venture Program is in${trackClause}.`,
      '',
      `What happens next: a first read takes a few days, not weeks. If it looks like a match, we write to ${replyTo} to arrange a conversation.`,
      '',
      `${durationLine}.`,
      '',
      revision,
      '',
      '— The Mamba review team, Cybrdeck',
    ].join('\n'),
  };
}
