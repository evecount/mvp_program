/**
 * Public evidence for the background check: only what the applicant gave us.
 *
 * Name-based web search was tried and dropped: the Qwen workspace either
 * refused to search or came back after ~110s with URLs nobody could verify,
 * and a background check that cites pages that may not exist is worse than
 * none. So this reads the links the applicant put on the form, and nothing
 * else: their portfolio or product page, and their public GitHub profile.
 * LinkedIn sits behind a login wall, so it is listed for a human to open.
 *
 * Each fetch is short, bounded and never throws; a dead link is itself
 * evidence ("the product link they gave returns 404"), so failures come back
 * as findings, not errors. Text is redacted by the caller before any of it
 * reaches a model prompt.
 */

const FETCH_TIMEOUT_MS = 8_000;
const TEXT_CAP = 1_500;
const UA = 'MambaVentureProgram-ApplicationReview/1.0 (+https://mambaventureprogram.web.app)';

export interface SiteEvidence {
  url: string;
  ok: boolean;
  status: number | null;
  title: string;
  description: string;
  text: string;
  note: string;
}

export interface GithubEvidence {
  login: string;
  ok: boolean;
  note: string;
  createdAt?: string;
  publicRepos?: number;
  followers?: number;
  bio?: string;
  /** Most recently pushed own (non-fork) repos. */
  repos?: { name: string; description: string; language: string; stars: number; pushedAt: string; fork: boolean }[];
}

export interface PublicEvidence {
  site: SiteEvidence | null;
  github: GithubEvidence | null;
  /** Links a human has to open themselves (LinkedIn). */
  manual: string[];
}

const http = (s: string) => /^https?:\/\//i.test(s);

async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': UA, ...(init.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const meta = (html: string, name: string) =>
  decode(
    html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)`, 'i'))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'))?.[1] ??
      '',
  );

/** Is this host something we should never fetch from a server (SSRF guard)? */
function privateHost(u: URL): boolean {
  const h = u.hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === 'metadata.google.internal' ||
    /^(10|127|0)\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    h.includes(':')
  );
}

export async function fetchSite(raw: string): Promise<SiteEvidence | null> {
  const url = raw.trim();
  if (!url) return null;
  const base: SiteEvidence = { url, ok: false, status: null, title: '', description: '', text: '', note: '' };
  let u: URL;
  try {
    u = new URL(http(url) ? url : `https://${url}`);
  } catch {
    return { ...base, note: 'not a valid link' };
  }
  if (privateHost(u)) return { ...base, note: 'points at a private address, not fetched' };
  if (/(^|\.)linkedin\.com$/i.test(u.hostname)) return { ...base, note: 'LinkedIn link, open it manually' };
  try {
    const res = await timedFetch(u.toString(), { headers: { Accept: 'text/html,*/*;q=0.5' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok) return { ...base, status: res.status, note: `returned HTTP ${res.status}` };
    if (!/html|text/i.test(type)) return { ...base, ok: true, status: res.status, note: `loads, but is ${type.split(';')[0] || 'not a web page'}` };
    const html = (await res.text()).slice(0, 400_000);
    const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const description = meta(html, 'description') || meta(html, 'og:description');
    const text = decode(
      html
        .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ).slice(0, TEXT_CAP);
    const thin = text.length < 200;
    return {
      ...base,
      ok: true,
      status: res.status,
      title,
      description,
      text,
      note: thin ? 'loads, but has almost no readable text (may be a script-rendered app or a placeholder)' : 'loads',
    };
  } catch (err) {
    const msg = (err as Error)?.name === 'AbortError' ? 'timed out' : 'could not be reached';
    return { ...base, note: msg };
  }
}

export async function fetchGithub(raw: string): Promise<GithubEvidence | null> {
  const s = raw.trim();
  if (!s) return null;
  const login = s.match(/github\.com\/([A-Za-z0-9-]{1,39})(?:[/?#]|$)/i)?.[1] ?? (/^[A-Za-z0-9-]{1,39}$/.test(s) ? s : '');
  if (!login) return { login: '', ok: false, note: 'not a GitHub profile link' };
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    const [userRes, repoRes] = await Promise.all([
      timedFetch(`https://api.github.com/users/${login}`, { headers }),
      timedFetch(`https://api.github.com/users/${login}/repos?sort=pushed&per_page=10`, { headers }),
    ]);
    if (userRes.status === 404) return { login, ok: false, note: 'no such GitHub account' };
    if (!userRes.ok) return { login, ok: false, note: `could not be read just now (HTTP ${userRes.status}); says nothing either way, check by hand` };
    const user = (await userRes.json()) as Record<string, unknown>;
    const repos = repoRes.ok ? ((await repoRes.json()) as Record<string, unknown>[]) : [];
    return {
      login,
      ok: true,
      note: 'public profile read',
      createdAt: String(user.created_at ?? ''),
      publicRepos: Number(user.public_repos ?? 0),
      followers: Number(user.followers ?? 0),
      bio: typeof user.bio === 'string' ? user.bio : '',
      repos: repos.map((r) => ({
        name: String(r.name ?? ''),
        description: typeof r.description === 'string' ? r.description : '',
        language: typeof r.language === 'string' ? r.language : '',
        stars: Number(r.stargazers_count ?? 0),
        pushedAt: String(r.pushed_at ?? ''),
        fork: r.fork === true,
      })),
    };
  } catch (err) {
    return { login, ok: false, note: (err as Error)?.name === 'AbortError' ? 'GitHub timed out' : 'GitHub could not be reached' };
  }
}

/** Gather everything at once; bounded by the per-fetch timeout, never throws. */
export async function gatherPublicEvidence(links: { linkedin?: string; portfolio?: string; github?: string }): Promise<PublicEvidence> {
  const [site, github] = await Promise.all([
    fetchSite(links.portfolio ?? '').catch(() => null),
    fetchGithub(links.github ?? '').catch(() => null),
  ]);
  const manual = links.linkedin?.trim() ? [links.linkedin.trim()] : [];
  return { site, github, manual };
}

/** The evidence as prompt lines, ready for redaction by the caller. */
export function evidenceLines(e: PublicEvidence): string[] {
  const out: string[] = [];
  if (e.site) {
    out.push(`Portfolio/product link: ${e.site.note}${e.site.status ? ` (HTTP ${e.site.status})` : ''}.`);
    if (e.site.title) out.push(`  Page title: ${e.site.title}`);
    if (e.site.description) out.push(`  Page description: ${e.site.description}`);
    if (e.site.text) out.push(`  Page text (start): ${e.site.text}`);
  } else out.push('Portfolio/product link: none given.');
  if (e.github) {
    if (!e.github.ok) out.push(`GitHub: ${e.github.note}.`);
    else {
      const own = (e.github.repos ?? []).filter((r) => !r.fork);
      out.push(
        `GitHub: account created ${e.github.createdAt?.slice(0, 10)}, ${e.github.publicRepos} public repos, ${e.github.followers} followers, ${own.length} of the 10 most recently pushed are their own (not forks).`,
      );
      if (e.github.bio) out.push(`  Bio: ${e.github.bio}`);
      for (const r of own.slice(0, 6)) {
        out.push(`  - repo pushed ${r.pushedAt.slice(0, 10)}, ${r.language || 'no language'}, ${r.stars} stars${r.description ? `: ${r.description}` : ''}`);
      }
    }
  } else out.push('GitHub: none given.');
  out.push(e.manual.length ? 'LinkedIn: given, not readable automatically (a reviewer opens it).' : 'LinkedIn: none given.');
  return out;
}
