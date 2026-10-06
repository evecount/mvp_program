/**
 * Mamba Venture Program — the application dossier PDF.
 *
 * Two documents in one file, deliberately:
 *
 *   Page 1+  the application as the applicant wrote it — every question from
 *            `questionnaire.ts`, in section order, with the verbatim answer
 *            underneath. Nothing is summarised away, because the whole point
 *            of the assessment is that a reviewer can check it against the
 *            words on the page.
 *
 *   Then     the private assessment: the readiness radar (one spoke per axis
 *            in ASSESSMENT_AXES — the geometry follows the catalogue, not a
 *            fixed count), the axis breakdown, the band, the grant-liability
 *            risk, the thin answers worth pressing on in interview, and the
 *            EnterpriseSG / EDB scheme screen. Marked internal on every page
 *            — the applicant never sees this half, and the PDF only ever
 *            lands in the reviewers' Drive.
 *
 * The radar is drawn as vectors rather than rasterised from the dashboard's
 * recharts chart: no headless browser, no canvas, no new dependency, and it
 * stays sharp at any zoom. The "3D" read comes from a slab — the data polygon
 * is extruded downward by a few millimetres, with the underside and the walls
 * drawn in pre-blended brass tones before the top face, so no transparency
 * group is needed against the known dark page.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';
import {
  ASSESSMENT_AXES,
  AXIS_LABEL,
  AXIS_SHORT,
  QUESTION_SECTIONS,
  appliesToTrack,
  getQuestion,
} from './questionnaire';
import {
  AXIS_WEIGHT,
  VERDICT_LABEL,
  interviewSheet,
  type Assessment,
  type AxisScore,
  type GrantMatch,
} from './assessment';
import type { InterviewDraft } from './interviewDraft';
import { ICP_CRITERIA, bare, type IcpScreen } from './oneScreen';

/* ── Palette ───────────────────────────────────────────────────────────
 * The dashboard's editorial dark, as RGB triples. jsPDF has no reliable
 * alpha in the default backend, so every "translucent" tone here is the
 * result already blended over the page background. */

const BG: [number, number, number] = [10, 10, 15];
const PANEL: [number, number, number] = [18, 18, 26];
const PANEL_EDGE: [number, number, number] = [52, 52, 62];
const GRID: [number, number, number] = [63, 63, 70];
const BRASS: [number, number, number] = [216, 166, 87];
/** brass at 18% over BG — the radar's top face. */
const BRASS_WASH: [number, number, number] = [47, 38, 28];
/** the extruded underside, darker again. */
const BRASS_UNDER: [number, number, number] = [92, 70, 36];
/** the extruded walls, between the two. */
const BRASS_WALL: [number, number, number] = [128, 99, 49];
const INK: [number, number, number] = [228, 228, 231];
const MUTED: [number, number, number] = [161, 161, 170];
const FAINT: [number, number, number] = [113, 113, 122];
const GOOD: [number, number, number] = [110, 190, 130];
const WARN: [number, number, number] = [226, 176, 92];
const BAD: [number, number, number] = [226, 110, 110];

/* ── Page geometry (A4 portrait, millimetres) ─────────────────────────── */

const W = 210;
const H = 297;
const M = 16;
const CW = W - M * 2;

/**
 * jsPDF's built-in fonts are WinAnsi, so anything outside printable ASCII is
 * dropped rather than drawn. Simply stripping it would mangle the copy —
 * "6–12 months" would become "612 months" — so the characters that actually
 * appear in the questionnaire and the grant catalogue are transliterated
 * first, and only the leftovers are removed.
 */
const TRANSLIT: Record<string, string> = {
  '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'",
  '\u201c': '"', '\u201d': '"', '\u2022': '-', '\u2026': '...',
  '\u00a0': ' ', '\u2192': '->', '\u2265': '>=', '\u2264': '<=',
  '\u00d7': 'x', '\u00b7': '-', '\u2028': ' ', '\u2029': ' ',
};

export const pdfText = (value: unknown): string => {
  if (value == null) return '';
  const raw = typeof value === 'string' ? value : String(value);
  return raw
    .replace(/[\u00a0\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2192\u2265\u2264\u00d7\u00b7\u2028\u2029]/g, (c) => TRANSLIT[c] ?? c)
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

/** Firestore timestamps arrive as `Timestamp`, `Date` or an ISO string. */
const stamp = (value: unknown): string => {
  const seconds = (value as { seconds?: unknown })?.seconds;
  const date =
    typeof seconds === 'number'
      ? new Date(seconds * 1000)
      : value instanceof Date
        ? value
        : typeof value === 'string'
          ? new Date(value)
          : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
};

/* The site's own palette (css/apply.css), for the page styled like the site. */
const SITE = {
  paper: [244, 242, 238] as [number, number, number],
  card: [250, 249, 247] as [number, number, number],
  ink: [12, 12, 14] as [number, number, number],
  muted: [102, 102, 108] as [number, number, number],
  hair: [220, 218, 214] as [number, number, number],
  orange: [252, 103, 54] as [number, number, number],
  orangeText: [194, 65, 12] as [number, number, number],
  orangeWash: [255, 241, 234] as [number, number, number],
  green: [31, 122, 77] as [number, number, number],
  greenWash: [227, 241, 232] as [number, number, number],
  greyWash: [235, 232, 226] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/* ── The drawing surface ─────────────────────────────────────────────── */

interface DossierInput {
  /** The stored `mamba_registrations/{uid}` document, flat. */
  record: Record<string, unknown>;
  /** The same document reduced to string answers, keyed by question id. */
  answers: Record<string, string>;
  assessment: Assessment;
  grants: GrantMatch[];
  /**
   * Model-drafted follow-ups, when the draft succeeded. Absent or null
   * leaves the deterministic sheet as the whole of the interview section,
   * which is the correct outcome: a missing annotation is not a defect.
   */
  draft?: InterviewDraft | null;
  /** One's ICP screen; printed first, since it decides whether the rest is read. */
  screen?: IcpScreen | null;
}

/**
 * A running cursor with a page break built in. Every block asks for the space
 * it needs before drawing, so the questionnaire and the grant table can be as
 * long as the answers are without any of them knowing where the fold falls.
 */
class Sheet {
  readonly doc: jsPDF;
  y = 0;
  private page = 0;

  /** Site-styled paper page (the ICP screen) rather than the editorial dark. */
  light: boolean;

  constructor(private readonly footerNote: string, light = false) {
    this.light = light;
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.page = 1;
    this.paint();
    this.y = M + 4;
  }

  newPage(light = this.light) {
    if (this.page > 0) this.finish();
    this.light = light;
    this.page += 1;
    this.doc.addPage();
    this.paint();
    this.y = M + 4;
  }

  private paint() {
    const { doc } = this;
    doc.setFillColor(...(this.light ? SITE.paper : BG));
    doc.rect(0, 0, W, H, 'F');
    // Hairline across the top: the house accent, used once.
    doc.setFillColor(...(this.light ? SITE.orange : BRASS));
    doc.rect(0, 0, W, 2.4, 'F');
  }

  /**
   * Stamp the footer on the current page. Called on every page break, and once
   * more at the end — the last page is the one no break ever closes out.
   */
  finish() {
    const { doc } = this;
    doc.setDrawColor(...(this.light ? SITE.hair : PANEL_EDGE));
    doc.setLineWidth(0.2);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...(this.light ? SITE.muted : FAINT));
    doc.text(pdfText(this.footerNote), M, H - 9.5);
    doc.text(`Page ${this.page}`, W - M, H - 9.5, { align: 'right' });
  }

  /** Advance to a fresh page unless `mm` still fits on this one. */
  need(mm: number) {
    if (this.y + mm > H - 20) this.newPage();
  }

  gap(mm = 3) {
    this.y += mm;
  }

  fill(c: [number, number, number]) {
    this.doc.setFillColor(...c);
  }

  stroke(c: [number, number, number], width = 0.3) {
    this.doc.setDrawColor(...c);
    this.doc.setLineWidth(width);
  }

  ink(c: [number, number, number]) {
    this.doc.setTextColor(...c);
  }

  text(value: string, x: number, y: number, size: number, weight: 'normal' | 'bold' = 'normal', color = INK, align?: 'left' | 'right' | 'center') {
    this.doc.setFont('helvetica', weight);
    this.doc.setFontSize(size);
    this.ink(color);
    this.doc.text(pdfText(value), x, y, align ? { align } : undefined);
  }

  /**
   * Wrap `value` to `width` and return the lines.
   *
   * The font is set *before* measuring, not after: `splitTextToSize` reads the
   * document's current font, so measuring at whatever size the previous block
   * happened to leave behind wraps the text at the wrong metrics and it then
   * overflows every box whose height was computed from that measurement. This
   * is the one helper that knows the size, so every measurement goes through
   * it and every drawn box agrees with its contents.
   */
  measure(value: string, width: number, size: number, weight: 'normal' | 'bold' = 'normal'): string[] {
    this.doc.setFont('helvetica', weight);
    this.doc.setFontSize(size);
    return this.doc.splitTextToSize(pdfText(value) || '-', width) as string[];
  }

  /** Wrapped body copy. Returns the y after the last line. */
  wrap(value: string, x: number, width: number, size: number, color = MUTED, weight: 'normal' | 'bold' = 'normal', leading = size * 0.46): number {
    const lines = this.measure(value, width, size, weight);
    this.ink(color);
    let y = this.y;
    for (const line of lines) {
      this.doc.text(line, x, y);
      y += leading;
    }
    return y;
  }

  /** The height a wrapped block will occupy, without drawing it. */
  heightOf(value: string, width: number, size: number, weight: 'normal' | 'bold' = 'normal', leading = size * 0.46): number {
    return this.measure(value, width, size, weight).length * leading;
  }

  panel(x: number, y: number, w: number, h: number, fillC = PANEL, edge = PANEL_EDGE) {
    this.fill(fillC);
    this.stroke(edge, 0.25);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'DF');
  }
}

/* ── Header ──────────────────────────────────────────────────────────── */

function masthead(sheet: Sheet, kicker: string, title: string, meta: string[]) {
  const { doc } = sheet;
  sheet.text(kicker.toUpperCase(), M, sheet.y + 4, 7, 'bold', BRASS);
  sheet.y += 10;
  for (const line of sheet.measure(title, CW, 19, 'bold')) {
    sheet.text(line, M, sheet.y + 7, 19, 'bold', INK);
    sheet.y += 8.4;
  }
  sheet.y += 1;
  sheet.text(meta.filter(Boolean).join('    '), M, sheet.y + 3, 7.5, 'normal', FAINT);
  sheet.y += 8;
  sheet.stroke(BRASS, 0.4);
  doc.line(M, sheet.y, W - M, sheet.y);
  sheet.y += 7;
}

/**
 * A section heading, optionally keeping company with the block that follows.
 *
 * `keepWith` is the height of that first block: a heading stranded at the foot
 * of a page with its content on the next reads as a missing card, and nothing
 * in a review document should read as a bug. Callers that can measure their
 * first block pass it; the rest accept the head travelling alone.
 */
function sectionHead(sheet: Sheet, title: string, note?: string, keepWith = 0) {
  sheet.need(16 + keepWith);
  sheet.gap(2);
  sheet.text(title.toUpperCase(), M, sheet.y + 3.4, 8.5, 'bold', BRASS);
  if (note) sheet.text(note, W - M, sheet.y + 3.4, 7, 'normal', FAINT, 'right');
  sheet.y += 6;
  sheet.stroke(PANEL_EDGE, 0.25);
  sheet.doc.line(M, sheet.y, W - M, sheet.y);
  sheet.y += 5;
}

/** A label/value pair, label small and faint above the value. */
function fieldBlock(sheet: Sheet, label: string, value: string, size = 8.5) {
  const body = pdfText(value) || 'Not answered';
  sheet.need(9 + sheet.heightOf(body, CW, size));
  sheet.text(label.toUpperCase(), M, sheet.y + 2.8, 6.5, 'bold', FAINT);
  sheet.y += 5.6;
  sheet.y = sheet.wrap(body, M, CW, size, value ? INK : FAINT);
  sheet.y += 4.5;
}

/* ── Page 1: the application, as written ─────────────────────────────── */

const IDENTITY: Array<{ key: string; label: string }> = [
  { key: 'fullName', label: 'Applicant' },
  { key: 'email', label: 'Reply-to email' },
  { key: 'phone', label: 'Phone' },
  { key: 'trackLabel', label: 'Track' },
  { key: 'intake', label: 'Intake track' },
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'yearsExperience', label: 'Experience' },
  { key: 'howHeard', label: 'Heard via' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'github', label: 'GitHub' },
];

const ESSAYS: Array<{ key: string; label: string }> = [
  { key: 'currentSituation', label: 'What they are working on today, and what they want to change' },
  { key: 'motivation', label: 'What they want out of the program, and what they will bring' },
];

function applicationPages(sheet: Sheet, record: Record<string, unknown>, answers: Record<string, string>, track: string) {
  const idea = answers.ideaTitle || pdfText(record.fullName) || 'Untitled application';

  masthead(sheet, 'Mamba Venture Program - application dossier', idea, [
    pdfText(record.fullName) || 'Unknown applicant',
    pdfText(record.trackLabel) || track,
    pdfText(record.intake) ? `${pdfText(record.intake)} intake` : '',
    record.createdAt ? `Filed ${stamp(record.createdAt)}` : '',
    record.updatedAt ? `Revised ${stamp(record.updatedAt)}` : '',
    `Status: ${pdfText(record.status) || 'pending'}`,
  ]);

  /* Two-up identity grid: the short facts, so the reviewer is not scrolling
     for who this is. Rows are measured before the heading so the heading can
     keep company with the first of them. */
  const colW = (CW - 8) / 2;
  const cells = IDENTITY.filter((f) => pdfText(record[f.key]));
  const rows: Array<{ cells: typeof cells; height: number }> = [];
  for (let i = 0; i < cells.length; i += 2) {
    const row = cells.slice(i, i + 2);
    rows.push({
      cells: row,
      height: Math.max(
        ...row.map((f) => 9 + sheet.heightOf(String(record[f.key] ?? ''), colW - 6, 8.5, 'normal', 4)),
      ),
    });
  }
  sectionHead(sheet, 'The applicant', undefined, (rows[0]?.height ?? 0) + 3);
  for (const { cells: row, height } of rows) {
    sheet.need(height + 2);
    row.forEach((f, idx) => {
      const x = M + idx * (colW + 8);
      sheet.panel(x, sheet.y, colW, height);
      sheet.text(f.label.toUpperCase(), x + 3, sheet.y + 4.4, 6, 'bold', FAINT);
      const saved = sheet.y;
      sheet.y = saved + 9;
      sheet.wrap(String(record[f.key] ?? ''), x + 3, colW - 6, 8.5, INK, 'normal', 4);
      sheet.y = saved;
    });
    sheet.y += height + 3;
  }
  sheet.gap(2);

  /* The two long hand-written answers. */
  for (const essay of ESSAYS) {
    fieldBlock(sheet, essay.label, pdfText(record[essay.key]));
  }

  /* Then the questionnaire itself — every question this track was asked, in
     catalogue order, grouped exactly as the form grouped them. Cards are
     measured up front so each title, section and question, can keep company
     with its first card rather than stranding at a page foot. */
  const sections = QUESTION_SECTIONS.map((section) => {
    const questions = section.questions
      .map(getQuestion)
      .filter((q): q is NonNullable<typeof q> => q != null && appliesToTrack(q, track));
    return {
      section,
      cards: questions.map((question) => {
        const answer = pdfText(answers[question.id]) || 'Not answered';
        const height =
          5.6 +
          sheet.heightOf(question.label, CW - 6, 8.5, 'bold', 4.2) +
          1.2 +
          sheet.heightOf(answer, CW - 6, 8.5, 'normal', 4.2) +
          4;
        return { question, answer, height };
      }),
    };
  }).filter((entry) => entry.cards.length > 0);

  const opening = sections[0];
  sectionHead(
    sheet,
    'The questionnaire',
    'Verbatim answers',
    opening
      ? 7.4 +
        (opening.section.intro ? sheet.heightOf(opening.section.intro, CW, 7, 'normal', 3.4) : 0) +
        3 +
        opening.cards[0]!.height
      : 0,
  );

  for (const { section, cards } of sections) {
    sheet.need(14 + cards[0]!.height);
    sheet.gap(1);
    sheet.text(section.title, M, sheet.y + 3.6, 10, 'bold', INK);
    sheet.y += 6.4;
    if (section.intro) {
      sheet.y = sheet.wrap(section.intro, M, CW, 7, FAINT, 'normal', 3.4);
    }
    sheet.y += 3;

    for (const { question, answer, height } of cards) {
      sheet.need(height);
      sheet.panel(M, sheet.y, CW, height);
      const top = sheet.y;
      sheet.y = top + 5.6;
      sheet.y = sheet.wrap(question.label, M + 3, CW - 6, 8.5, BRASS, 'bold', 4.2);
      sheet.y += 1.2;
      sheet.wrap(answer, M + 3, CW - 6, 8.5, answers[question.id] ? INK : FAINT, 'normal', 4.2);
      sheet.y = top + height + 3;
    }
    sheet.gap(2);
  }
}

/* ── The radar ───────────────────────────────────────────────────────── */

type Pt = [number, number];

function polygon(doc: jsPDF, points: Pt[], style: 'S' | 'F' | 'DF') {
  const segments: number[][] = [];
  for (let i = 1; i < points.length; i += 1) {
    segments.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }
  doc.lines(segments, points[0][0], points[0][1], [1, 1], style, true);
}

/**
 * The readiness radar, extruded — one spoke per axis in `axes`.
 *
 * Drawn back-to-front: the base slab, the grid on the top plane, then the
 * data slab (underside, walls, top face) and the vertex dots. Because the
 * walls are drawn for every edge and the top face lands over them, only the
 * walls below the silhouette survive — which is what makes it read as a solid
 * rather than a flat shape, with no blending mode anywhere.
 */
function drawRadar(sheet: Sheet, cx: number, cy: number, radius: number, axes: AxisScore[]) {
  const { doc } = sheet;
  const n = axes.length;
  const DEPTH = 4.5;
  const angle = (i: number) => ((-90 + i * (360 / n)) * Math.PI) / 180;
  const at = (i: number, r: number, dy = 0): Pt => [
    cx + Math.cos(angle(i)) * r,
    cy + Math.sin(angle(i)) * r + dy,
  ];

  /* Base slab: the outer hexagon pushed down, so the chart sits on something. */
  sheet.fill([15, 15, 21]);
  sheet.stroke(GRID, 0.25);
  polygon(doc, axes.map((_, i) => at(i, radius, DEPTH)), 'DF');

  /* Grid rings at every 20%. */
  for (let step = 1; step <= 5; step += 1) {
    const r = (radius * step) / 5;
    sheet.stroke(step === 5 ? GRID : [44, 44, 54], step === 5 ? 0.35 : 0.2);
    polygon(doc, axes.map((_, i) => at(i, r)), 'S');
  }

  /* Spokes. */
  sheet.stroke([44, 44, 54], 0.2);
  for (let i = 0; i < n; i += 1) {
    const [x, y] = at(i, radius);
    doc.line(cx, cy, x, y);
  }

  /* The data slab. */
  const top = axes.map((axis, i) => at(i, Math.max(radius * axis.score, radius * 0.03)));
  const under = top.map(([x, y]) => [x, y + DEPTH] as Pt);

  sheet.fill(BRASS_UNDER);
  polygon(doc, under, 'F');

  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    sheet.fill(BRASS_WALL);
    polygon(doc, [top[i], top[j], under[j], under[i]], 'F');
  }

  sheet.fill(BRASS_WASH);
  sheet.stroke(BRASS, 0.5);
  polygon(doc, top, 'DF');

  /* Vertex dots, then the axis name and its percentage outside the ring.
     Short labels only: the breakdown panel sits to the right of this chart,
     and a full label like "Evidence of execution" runs straight through the
     divider and lands on top of its own row. */
  for (let i = 0; i < n; i += 1) {
    const [x, y] = top[i];
    sheet.fill(BG);
    doc.circle(x, y, 1.5, 'F');
    sheet.fill(BRASS);
    doc.circle(x, y, 1, 'F');

    const [lx, ly] = at(i, radius + 5.5);
    const cos = Math.cos(angle(i));
    const sin = Math.sin(angle(i));
    const align: 'left' | 'right' | 'center' = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
    const lift = sin < -0.3 ? -1.6 : sin > 0.3 ? 3.4 : 1;
    sheet.text(AXIS_SHORT[axes[i].axis], lx, ly + lift, 6.2, 'bold', MUTED, align);
    sheet.text(`${Math.round(axes[i].score * 100)}%`, lx, ly + lift + 3.4, 7.5, 'bold', BRASS, align);
  }
}

/* ── Page 2: the private assessment ──────────────────────────────────── */

const BAND_COLOR: Record<string, [number, number, number]> = {
  'cohort-ready': GOOD,
  strong: GOOD,
  conditional: WARN,
  'not-this-cohort': BAD,
};

const RISK_COLOR: Record<string, [number, number, number]> = {
  low: GOOD,
  watch: WARN,
  high: BAD,
};

function axisBreakdown(sheet: Sheet, x: number, y: number, width: number, axes: AxisScore[]): number {
  let cursor = y;
  const barW = width - 6;
  for (const axis of axes) {
    const pct = Math.round(axis.score * 100);
    sheet.text(axis.label, x + 3, cursor + 3.4, 8, 'bold', INK);
    sheet.text(`${pct}%`, x + width - 3, cursor + 3.4, 8, 'bold', pct >= 70 ? GOOD : pct >= 45 ? WARN : BAD, 'right');

    const barY = cursor + 5.2;
    sheet.fill([30, 30, 38]);
    sheet.doc.roundedRect(x + 3, barY, barW, 1.8, 0.9, 0.9, 'F');
    if (axis.score > 0.02) {
      sheet.fill(BRASS);
      sheet.doc.roundedRect(x + 3, barY, Math.max(barW * axis.score, 1.8), 1.8, 0.9, 0.9, 'F');
    }

    /* The single answer that moved this axis most: where a reviewer starts
       reading. One line under a full-width bar — one of these per axis has
       to fit beside the radar, and a caption sharing the row with the bar
       and the percentage has nowhere to go but on top of one of them. */
    const caption = sheet.measure(`Strongest signal: ${axis.evidence}`, barW, 6.2);
    const oneLine =
      caption.length > 1 ? `${(caption[0] ?? '').replace(/\s*\S*$/, '')} ...` : (caption[0] ?? '');
    sheet.text(oneLine, x + 3, barY + 5.2, 6.2, 'normal', FAINT);

    cursor += 13.4;
  }
  return cursor;
}

function callout(sheet: Sheet, title: string, color: [number, number, number], lines: string[]) {
  const body = lines.flatMap((line) => sheet.measure(line, CW - 10, 7.4));
  const height = 10 + body.length * 3.6 + 3;
  sheet.need(height);
  sheet.panel(M, sheet.y, CW, height);
  sheet.fill(color);
  sheet.doc.rect(M, sheet.y, 1.2, height, 'F');
  sheet.text(title.toUpperCase(), M + 5, sheet.y + 5, 7.5, 'bold', color);
  let cursor = sheet.y + 9.4;
  sheet.doc.setFont('helvetica', 'normal');
  sheet.doc.setFontSize(7.4);
  sheet.ink(MUTED);
  for (const line of body) {
    sheet.doc.text(line, M + 5, cursor);
    cursor += 3.6;
  }
  sheet.y += height + 3;
}

function assessmentPage(sheet: Sheet, input: DossierInput) {
  const { record, assessment, grants } = input;

  sheet.newPage();
  masthead(
    sheet,
    'Internal - not shared with the applicant',
    'Readiness assessment and grant screen',
    [
      pdfText(record.fullName) || 'Unknown applicant',
      pdfText(record.trackLabel) || assessment.track,
      `Scored ${stamp(assessment.scoredAt)}`,
    ],
  );

  /* Radar left, breakdown right, on one panel so the two halves read as one
     instrument rather than a chart and a table that happen to be adjacent.
     Height follows the axis count: the breakdown list (13.4pt per row) is
     the taller of the two halves, so a fixed height here is what silently
     overflows the panel border the day an axis is added or removed. */
  const panelH = 15.6 + assessment.axes.length * 13.4;
  sheet.need(panelH + 4);
  sheet.panel(M, sheet.y, CW, panelH);
  const panelTop = sheet.y;
  const colSplit = M + 88;

  drawRadar(sheet, M + 45, panelTop + 48, 22, assessment.axes);

  sheet.stroke(PANEL_EDGE, 0.25);
  sheet.doc.line(colSplit, panelTop + 6, colSplit, panelTop + panelH - 6);

  sheet.text('METRICS BREAKDOWN', colSplit + 5, panelTop + 8, 7, 'bold', BRASS);
  axisBreakdown(sheet, colSplit + 2, panelTop + 13, W - M - colSplit - 2, assessment.axes);

  sheet.y = panelTop + panelH + 6;

  /* The verdict, in one line, with the number that produced it. */
  const overallPct = Math.round(assessment.overall * 100);
  const bandColor = BAND_COLOR[assessment.band] ?? WARN;
  const weightSentence = `${ASSESSMENT_AXES.length} axes, weighted: ${ASSESSMENT_AXES.map(
    (a) => `${AXIS_LABEL[a].toLowerCase()} ${Math.round(AXIS_WEIGHT[a] * 100)}`,
  ).join(', ')}.`;
  callout(sheet, `Readiness ${overallPct}% - ${assessment.bandLabel}`, bandColor, [
    weightSentence,
    'Free text can never max an axis on its own, so this ranks the queue - it does not decide it. Read the answers on page 1 before acting on the number.',
  ]);

  callout(
    sheet,
    `Grant-liability risk: ${assessment.grantRisk}`,
    RISK_COLOR[assessment.grantRisk] ?? GOOD,
    assessment.grantRiskReasons.length
      ? assessment.grantRiskReasons
      : ['No answer in this application reads as treating public money as free money.'],
  );

  if (assessment.verificationGaps.length) {
    callout(sheet, 'Press on these in interview', WARN, assessment.verificationGaps.map((gap) => `${gap.label} - answered at ${Math.round(gap.score * 100)}% evidence`));
  }

  /* ── The scheme screen ─────────────────────────────────────────────── */
  const grantCards = grants.map((match) => {
    const reasons = match.reasons.flatMap((r) => sheet.measure(r, CW - 10, 7.4));
    return { match, reasons, height: 11 + reasons.length * 3.6 + (match.gap ? 6 : 0) + 3 };
  });
  sectionHead(
    sheet,
    'EnterpriseSG and EDB schemes',
    grants.length ? `${grants.length} screened` : '',
    grantCards[0]?.height ?? 18,
  );

  if (!grantCards.length) {
    sheet.need(20);
    sheet.panel(M, sheet.y, CW, 18);
    sheet.y = sheet.wrap(
      'No scheme screen for this track. Every grant in the catalogue is issued to a Singapore-registered company, and this applicant is not asking to run one - the useful levers here are the program itself, a role at Cybrdeck, or a later move onto the founder track.',
      M + 4,
      CW - 8,
      8,
      MUTED,
    );
    sheet.y += 6;
  } else {
    for (const { match, reasons, height } of grantCards) {
      sheet.need(height);

      const color = match.verdict === 'eligible' ? GOOD : match.verdict === 'conditional' ? WARN : BAD;
      sheet.panel(M, sheet.y, CW, height);
      sheet.fill(color);
      sheet.doc.rect(M, sheet.y, 1.2, height, 'F');

      const top = sheet.y;
      sheet.text(match.program.name, M + 5, top + 5.4, 9, 'bold', INK);
      sheet.text(VERDICT_LABEL[match.verdict].toUpperCase(), W - M - 4, top + 5.4, 7, 'bold', color, 'right');
      sheet.text(`${match.program.agency}   ${pdfText(match.program.support)}`, M + 5, top + 9.6, 6.6, 'normal', FAINT);

      sheet.doc.setFont('helvetica', 'normal');
      sheet.doc.setFontSize(7.4);
      sheet.ink(MUTED);
      let cursor = top + 14.4;
      for (const line of reasons) {
        sheet.doc.text(line, M + 5, cursor);
        cursor += 3.6;
      }
      if (match.gap) {
        sheet.text(`Next step: ${pdfText(match.gap)}`, M + 5, cursor + 1, 7.4, 'bold', BRASS);
      }
      sheet.y = top + height + 2.5;
    }

    sheet.gap(2);
    sheet.y = sheet.wrap(
      'Screened against published eligibility as at September 2026. Amounts and support rates change; confirm on enterprisesg.gov.sg or edb.gov.sg before quoting any of this to an applicant.',
      M,
      CW,
      6.6,
      FAINT,
      'normal',
      3.2,
    );
  }

  /* ── The interview sheet ─────────────────────────────────────────────
   * Last on the internal half because everything above is the reasoning and
   * this is the action: questions that exist only because of what this
   * applicant wrote, each naming the answer it came from so it can be checked
   * against page 1 before it is asked. */
  const questions = interviewSheet(
    input.answers,
    assessment.track,
    grants.map((match) => ({
      id: match.program.id,
      name: match.program.name,
      verdict: match.verdict,
      gap: match.gap ?? null,
    })),
    typeof input.record.intake === 'string' ? input.record.intake : undefined,
  );
  const cards = questions.map((item) => {
    const qLines = sheet.measure(item.question, CW - 14, 8.4);
    const bLines = sheet.measure(`From their answer: ${item.because}`, CW - 14, 6.6);
    /* The number and the probe tag own the first row; the question starts
       below them. Sharing the row looks fine in the source and overprints in
       the PDF, because the question's first line runs the full measure and the
       tag is right-aligned into exactly that space. */
    return { item, qLines, bLines, height: 10.2 + qLines.length * 4 + 0.8 + bLines.length * 3.2 + 3 };
  });
  sectionHead(sheet, 'Interview sheet', `${questions.length} for this applicant`, cards[0]?.height ?? 0);
  cards.forEach(({ item, qLines, bLines, height }, index) => {
    sheet.need(height);

    const top = sheet.y;
    sheet.panel(M, top, CW, height);
    sheet.text(String(index + 1), M + 4, top + 5.6, 9, 'bold', BRASS);
    sheet.text(item.probe.toUpperCase(), W - M - 4, top + 5.2, 6.5, 'bold', FAINT, 'right');

    let cursor = top + 10.2;
    for (const line of qLines) {
      sheet.text(line, M + 10, cursor, 8.4, 'normal', INK);
      cursor += 4;
    }
    cursor += 0.8;
    for (const line of bLines) {
      sheet.text(line, M + 10, cursor, 6.6, 'normal', FAINT);
      cursor += 3.2;
    }
    sheet.y = top + height + 2.5;
  });

  /* ── Model-drafted follow-ups ─────────────────────────────
   * The rules above find what they were written to find. This block is a
   * model reading the same answers and proposing what to ask next. It is
   * an annotation: it never moves a score, and it is labelled with the
   * model that wrote it so a reviewer knows which half is arithmetic and
   * which half is judgement. Every question here cited the answers it
   * came from or it was discarded before printing. */
  const draft = input.draft;
  if (draft && draft.questions.length) {
    const draftCards = draft.questions.map((q) => {
      const qLines = sheet.measure(q.question, CW - 14, 8.4);
      const from = q.sourceIds
        .map((id) => getQuestion(id)?.label ?? id)
        .map((label) => (label.length > 34 ? `${label.slice(0, 33)}…` : label))
        .join(' · ');
      const fLines = sheet.measure(`Asked because: ${from}`, CW - 14, 6.6);
      const wLines = q.why ? sheet.measure(`In their words: ${q.why}`, CW - 14, 6.6) : [];
      const rLines = q.reveals
        ? sheet.measure(`A good answer shows: ${q.reveals}`, CW - 14, 6.6)
        : [];
      return {
        qLines,
        fLines,
        wLines,
        rLines,
        height:
          10.2 +
          qLines.length * 4 +
          0.8 +
          (fLines.length + wLines.length + rLines.length) * 3.2 +
          3,
      };
    });

    sectionHead(
      sheet,
      'Model-drafted follow-ups',
      `${draft.model} · ${draft.questions.length} drafted${draft.dropped ? `, ${draft.dropped} discarded as ungrounded` : ''} · a prompt, not a verdict`,
      draftCards[0]?.height ?? 0,
    );
    draftCards.forEach(({ qLines, fLines, wLines, rLines, height }, index) => {
      sheet.need(height);

      const top = sheet.y;
      sheet.panel(M, top, CW, height);
      sheet.text(String(index + 1), M + 4, top + 5.6, 9, 'bold', BRASS);
      sheet.text('MODEL', W - M - 4, top + 5.2, 6.5, 'bold', FAINT, 'right');

      let cursor = top + 10.2;
      for (const line of qLines) {
        sheet.text(line, M + 10, cursor, 8.4, 'normal', INK);
        cursor += 4;
      }
      cursor += 0.8;
      for (const line of [...fLines, ...wLines, ...rLines]) {
        sheet.text(line, M + 10, cursor, 6.6, 'normal', FAINT);
        cursor += 3.2;
      }
      sheet.y = top + height + 2.5;
    });
  }
}

/* ── Page 0: the ICP screen, styled like the site ────────────────────────
 * The rest of the dossier is the dashboard's editorial dark; this page is
 * the one a reviewer reads first and decides on, so it wears the site:
 * paper, ink, the orange accent, Big Shoulders for the headline, DM Sans
 * for copy and DM Mono for labels. The fonts ship in functions/assets/fonts
 * (SIL Open Font License); if they cannot be read the page still renders,
 * in Helvetica, rather than costing the reviewer the dossier. */

const FONT_DIR = join(__dirname, '..', '..', 'assets', 'fonts');
const FONT_FILES = {
  display: 'BigShouldersDisplay-ExtraBold.ttf',
  sans: 'DMSans-Regular.ttf',
  sansBold: 'DMSans-SemiBold.ttf',
  mono: 'DMMono-Medium.ttf',
} as const;
type Face = keyof typeof FONT_FILES;

let fontData: Record<string, string> | null | undefined;
function siteFontData(): Record<string, string> | null {
  if (fontData !== undefined) return fontData;
  try {
    fontData = Object.fromEntries(Object.values(FONT_FILES).map((f) => [f, readFileSync(join(FONT_DIR, f)).toString('base64')]));
  } catch {
    fontData = null;
  }
  return fontData;
}

/** The embedded fonts carry real glyphs, so only control characters need stripping. */
const siteText = (value: unknown): string =>
  value == null
    ? ''
    : String(value)
        .replace(/[\u00a0\u2028\u2029\t]/g, ' ')
        .replace(/[^\x20-\x7E\u00a3\u00b7\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u2192]/g, '')
        .replace(/ {2,}/g, ' ')
        .trim();

class SitePen {
  readonly fonts: boolean;
  constructor(readonly sheet: Sheet) {
    const data = siteFontData();
    if (data) {
      for (const [face, file] of Object.entries(FONT_FILES)) {
        sheet.doc.addFileToVFS(file, data[file]);
        sheet.doc.addFont(file, face, 'normal');
      }
    }
    this.fonts = Boolean(data);
  }
  face(f: Face, size: number) {
    const { doc } = this.sheet;
    if (this.fonts) doc.setFont(f, 'normal');
    else doc.setFont('helvetica', f === 'sans' || f === 'mono' ? 'normal' : 'bold');
    doc.setFontSize(size);
  }
  clean(v: unknown) {
    return this.fonts ? siteText(v) : pdfText(v);
  }
  lines(v: unknown, width: number, f: Face, size: number): string[] {
    this.face(f, size);
    return this.sheet.doc.splitTextToSize(this.clean(v) || '-', width) as string[];
  }
  width(v: string, f: Face, size: number, charSpace = 0) {
    this.face(f, size);
    const t = this.clean(v);
    return this.sheet.doc.getTextWidth(t) + charSpace * Math.max(0, t.length - 1);
  }
  text(v: unknown, x: number, y: number, f: Face, size: number, color: [number, number, number], charSpace = 0) {
    this.face(f, size);
    this.sheet.ink(color);
    this.sheet.doc.text(this.clean(v), x, y, charSpace ? { charSpace } : undefined);
  }
  /** Wrapped lines from the top-left baseline; returns the y after the block. */
  block(lines: string[], x: number, y: number, f: Face, size: number, color: [number, number, number], leading: number) {
    this.face(f, size);
    this.sheet.ink(color);
    for (const line of lines) {
      this.sheet.doc.text(line, x, y);
      y += leading;
    }
    return y;
  }
}

type Tone = { fill: [number, number, number]; text: [number, number, number] };
const TONE = {
  good: { fill: SITE.greenWash, text: SITE.green },
  caution: { fill: SITE.orangeWash, text: SITE.orangeText },
  bad: { fill: SITE.ink, text: SITE.white },
  neutral: { fill: SITE.greyWash, text: SITE.muted },
} satisfies Record<string, Tone>;
const VERDICT_TONE: Record<string, Tone> = { yes: TONE.good, unclear: TONE.caution, no: TONE.bad };
const CHECK_TONE: Record<string, Tone> = { confirmed: TONE.good, unverified: TONE.neutral, contradicted: TONE.bad };
const MARKET_TONE: Record<string, Tone> = { promising: TONE.good, unproven: TONE.caution, weak: TONE.bad };
const REC_FILL: Record<string, [number, number, number]> = { interview: SITE.green, maybe: SITE.orange, pass: SITE.ink };

const MONO_SPACE = 0.35;

function chip(pen: SitePen, label: string, x: number, top: number, w: number, tone: Tone) {
  const { doc } = pen.sheet;
  const h = 4.8;
  doc.setFillColor(...tone.fill);
  doc.roundedRect(x, top, w, h, h / 2, h / 2, 'F');
  const t = label.toUpperCase();
  const tw = pen.width(t, 'mono', 6.2, MONO_SPACE);
  pen.text(t, x + (w - tw) / 2, top + 3.35, 'mono', 6.2, tone.text, MONO_SPACE);
}

function card(sheet: Sheet, x: number, top: number, w: number, h: number) {
  sheet.doc.setFillColor(...SITE.card);
  sheet.doc.setDrawColor(...SITE.hair);
  sheet.doc.setLineWidth(0.25);
  sheet.doc.roundedRect(x, top, w, h, 2.5, 2.5, 'DF');
}

/** A mono label like the site's `.mono.label`, kept on the page with the card under it. */
function siteHead(pen: SitePen, title: string, firstBlock: number, aside?: () => void) {
  const { sheet } = pen;
  sheet.need(9 + Math.min(firstBlock, 120));
  pen.text(title.toUpperCase(), M, sheet.y + 3, 'mono', 7, SITE.muted, 0.5);
  aside?.();
  sheet.y += 6.5;
}

const SANS = 8.6;
const LEAD = 3.9;

function screenPage(sheet: Sheet, record: Record<string, unknown>, s: IcpScreen) {
  const pen = new SitePen(sheet);
  const { doc } = sheet;
  const ink = SITE.ink;

  /* Masthead: kicker, the headline in the site's display face, the verdict as a pill. */
  pen.text('INTERNAL · NOT SHARED WITH THE APPLICANT', M, sheet.y + 3, 'mono', 6.8, SITE.muted, 0.5);
  const brand = 'MAMBA VENTURE PROGRAM';
  pen.text(brand, W - M - pen.width(brand, 'mono', 6.8, 0.5), sheet.y + 3, 'mono', 6.8, SITE.muted, 0.5);
  sheet.y += 8;

  pen.text('ICP SCREEN', M, sheet.y + 13, 'display', 42, ink);
  const rec = s.recommendation.toUpperCase();
  const pillW = pen.width(rec, 'display', 19) + 14;
  const pillTop = sheet.y + 2;
  doc.setFillColor(...(REC_FILL[s.recommendation] ?? ink));
  doc.roundedRect(W - M - pillW, pillTop, pillW, 12, 6, 6, 'F');
  pen.text(rec, W - M - pillW + 7, pillTop + 8.7, 'display', 19, SITE.white);
  sheet.y += 20;

  const meta = [pdfText(record.fullName) || 'Unknown applicant', pdfText(record.trackLabel), `Read by ${s.model}`, 'a triage read, not a verdict']
    .filter(Boolean)
    .join('  ·  ');
  pen.text(meta, M, sheet.y, 'sans', 8.4, SITE.muted);
  sheet.y += 4.5;
  if (s.modelRecommendation !== s.recommendation) {
    pen.text(`One said ${s.modelRecommendation}; a hard gate from the form set it to ${s.recommendation}.`, M, sheet.y, 'sansBold', 8.4, SITE.orangeText);
    sheet.y += 4.5;
  }
  sheet.y += 1.5;
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.35);
  doc.line(M, sheet.y, W - M, sheet.y);
  sheet.y += 7;

  /* Why. */
  if (s.reasons.length) {
    const rows = s.reasons.map((r) => pen.lines(r, CW - 17, 'sans', 9.2));
    const h = 5 + rows.reduce((n, l) => n + l.length * 4.2 + 1.8, 0) + 2.4;
    siteHead(pen, 'Why', h);
    sheet.need(h);
    card(sheet, M, sheet.y, CW, h);
    let y = sheet.y + 8.2;
    for (const lines of rows) {
      doc.setFillColor(...SITE.orange);
      doc.rect(M + 6, y - 2.2, 1.8, 1.8, 'F');
      y = pen.block(lines, M + 11, y, 'sans', 9.2, ink, 4.2) + 1.8;
    }
    sheet.y += h + 6;
  }

  /* Fit with the ideal applicant: one row per criterion. */
  {
    const rows = ICP_CRITERIA.map(({ id, label }) => {
      const l = pen.lines(label, 50, 'sansBold', SANS);
      const e = pen.lines(s.icp[id].evidence || '-', CW - 90, 'sans', 8.2);
      return { l, e, verdict: s.icp[id].verdict, h: Math.max(l.length * LEAD, e.length * 3.7, 4.8) + 5.4 };
    });
    const h = rows.reduce((n, r) => n + r.h, 0) + 2;
    siteHead(pen, 'Fit with the ideal applicant', h);
    sheet.need(h);
    card(sheet, M, sheet.y, CW, h);
    let top = sheet.y + 1;
    rows.forEach((r, i) => {
      if (i) {
        doc.setDrawColor(...SITE.hair);
        doc.setLineWidth(0.2);
        doc.line(M + 6, top, W - M - 6, top);
      }
      pen.block(r.l, M + 6, top + 6, 'sansBold', SANS, ink, LEAD);
      chip(pen, r.verdict, M + 60, top + 2.9, 20, VERDICT_TONE[r.verdict] ?? TONE.neutral);
      pen.block(r.e, M + 84, top + 6, 'sans', 8.2, SITE.muted, 3.7);
      top += r.h;
    });
    sheet.y += h + 6;
  }

  /* Possible overstatement: the claim, why it does not hold up, what to ask. */
  if (s.overstatements.length) {
    const items = s.overstatements.map((o) => {
      const c = pen.lines(o.claim, CW - 12, 'sansBold', SANS);
      const w = pen.lines(o.concern, CW - 12, 'sans', 8.2);
      const a = pen.lines(o.ask, CW - 26, 'sans', SANS);
      return { c, w, a, h: c.length * LEAD + w.length * 3.7 + a.length * LEAD + 9 };
    });
    const h = items.reduce((n, it) => n + it.h, 0) + 3;
    siteHead(pen, 'Possible overstatement', h);
    sheet.need(h);
    card(sheet, M, sheet.y, CW, h);
    let top = sheet.y + 1.5;
    items.forEach((it, i) => {
      if (i) {
        doc.setDrawColor(...SITE.hair);
        doc.setLineWidth(0.2);
        doc.line(M + 6, top, W - M - 6, top);
      }
      let y = pen.block(it.c, M + 6, top + 5.4, 'sansBold', SANS, ink, LEAD);
      y = pen.block(it.w, M + 6, y + 0.2, 'sans', 8.2, SITE.muted, 3.7);
      pen.text('ASK', M + 6, y + 1.6, 'mono', 6.8, SITE.orangeText, 0.5);
      pen.block(it.a, M + 20, y + 1.6, 'sans', SANS, ink, LEAD);
      top += it.h;
    });
    sheet.y += h + 6;
  }

  /* Market viability. */
  {
    const m = s.market;
    const rows = [
      ['Who pays', m.whoPays],
      ['Competition', m.competition],
      ['Demand signal', m.sizeSignal],
      ...m.risks.map((r) => ['Risk', r]),
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => ({ k, v: pen.lines(v, CW - 48, 'sans', SANS) }));
    const h = rows.reduce((n, r) => n + r.v.length * LEAD + 2.6, 0) + 8;
    siteHead(pen, 'Market viability', h, () => chip(pen, m.verdict, W - M - 24, sheet.y - 0.2, 24, MARKET_TONE[m.verdict] ?? TONE.neutral));
    sheet.need(h);
    card(sheet, M, sheet.y, CW, h);
    let y = sheet.y + 7;
    for (const r of rows) {
      pen.text(r.k.toUpperCase(), M + 6, y, 'mono', 6.6, SITE.muted, 0.4);
      y = pen.block(r.v, M + 42, y, 'sans', SANS, ink, LEAD) + 2.6;
    }
    sheet.y += h + 6;
  }

  /* Claim checks against the links they gave. */
  if (s.claimChecks.length) {
    const rows = s.claimChecks.map((c) => {
      const cl = pen.lines(bare(c.claim), CW - 42, 'sansBold', SANS);
      const b = c.basis ? pen.lines(c.basis, CW - 42, 'sans', 8.2) : [];
      return { status: c.status, cl, b, h: cl.length * LEAD + b.length * 3.7 + 5.4 };
    });
    const h = rows.reduce((n, r) => n + r.h, 0) + 2;
    siteHead(pen, 'Claim checks against the links they gave', h);
    sheet.need(h);
    card(sheet, M, sheet.y, CW, h);
    let top = sheet.y + 1;
    rows.forEach((r, i) => {
      if (i) {
        doc.setDrawColor(...SITE.hair);
        doc.setLineWidth(0.2);
        doc.line(M + 6, top, W - M - 6, top);
      }
      chip(pen, r.status, M + 6, top + 2.9, 26, CHECK_TONE[r.status] ?? TONE.neutral);
      const y = pen.block(r.cl, M + 36, top + 6, 'sansBold', SANS, ink, LEAD);
      pen.block(r.b, M + 36, y, 'sans', 8.2, SITE.muted, 3.7);
      top += r.h;
    });
    sheet.y += h + 6;
  }

  /* Flags, side by side. */
  {
    const colW = (CW - 5) / 2;
    const col = (items: string[]) => (items.length ? items : ['None noted.']).map((f) => pen.lines(f, colW - 15, 'sans', 8.4));
    const red = col(s.redFlags);
    const green = col(s.greenFlags);
    const height = (ls: string[][]) => 12 + ls.reduce((n, l) => n + l.length * 3.8 + 1.6, 0) + 2;
    const h = Math.max(height(red), height(green));
    sheet.need(h + 2);
    const draw = (x: number, title: string, dot: [number, number, number], ls: string[][], empty: boolean) => {
      card(sheet, x, sheet.y, colW, h);
      doc.setFillColor(...dot);
      doc.circle(x + 7, sheet.y + 6.4, 1.2, 'F');
      pen.text(title, x + 10.5, sheet.y + 7.4, 'mono', 7, ink, 0.5);
      let y = sheet.y + 13.6;
      for (const lines of ls) {
        if (!empty) {
          doc.setFillColor(...SITE.muted);
          doc.rect(x + 6.4, y - 1.8, 1.2, 1.2, 'F');
        }
        y = pen.block(lines, x + 10.5, y, 'sans', 8.4, empty ? SITE.muted : ink, 3.8) + 1.6;
      }
    };
    draw(M, 'RED FLAGS', [214, 69, 54], red, !s.redFlags.length);
    draw(M + colW + 5, 'GREEN FLAGS', SITE.green, green, !s.greenFlags.length);
    sheet.y += h + 4;
  }
}

/* ── Entry point ─────────────────────────────────────────────────────── */

/** Build the dossier and return the PDF bytes, ready to hand to Drive. */
export function buildDossierPdf(input: DossierInput): ArrayBuffer {
  const applicant = pdfText(input.record.fullName) || 'Unknown applicant';
  const sheet = new Sheet(`Mamba Venture Program - ${applicant} - internal review copy`, Boolean(input.screen));

  if (input.screen) {
    screenPage(sheet, input.record, input.screen);
    sheet.newPage(false);
  }
  applicationPages(sheet, input.record, input.answers, input.assessment.track);
  assessmentPage(sheet, input);
  sheet.finish();

  return sheet.doc.output('arraybuffer') as ArrayBuffer;
}
