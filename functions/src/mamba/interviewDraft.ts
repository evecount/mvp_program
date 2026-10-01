/**
 * The shape of cybrdeck.com's model-drafted interview questions, kept so
 * dossierPdf.ts compiles unchanged. The MVP pipeline has no model pass, so the
 * dossier is always built with `draft: null` and prints the deterministic
 * interview sheet only.
 */
export interface DraftedQuestion {
  question: string;
  why: string;
  reveals: string;
  sourceIds: string[];
}

export interface InterviewDraft {
  questions: DraftedQuestion[];
  model: string;
  generatedAt: string;
  dropped: number;
}
