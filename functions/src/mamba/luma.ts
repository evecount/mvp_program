/**
 * The next Mamba info session, read from the Cybrdeck Luma calendar.
 *
 * Luma's public calendar feed (the same one cybrdeck.com reads) lists upcoming
 * events without an API key; it sends no CORS headers, so the site asks this
 * function instead of Luma directly. The pick is the soonest upcoming event
 * whose name says "info session", so publishing the next one on Luma is all it
 * takes for the site to point at it.
 */
const CALENDAR_ID = 'cal-2AwPmMfsavuPfCh';
const FEED = `https://api.lu.ma/calendar/get-items?calendar_api_id=${CALENDAR_ID}`;

export interface InfoSession {
  name: string;
  url: string;
  startAt: string;
  endAt: string | null;
  timezone: string;
  location: string | null;
}

interface LumaEntry {
  event?: {
    name?: string;
    url?: string;
    start_at?: string;
    end_at?: string;
    timezone?: string;
    geo_address_info?: { full_address?: string; address?: string; city?: string } | null;
  };
}

export async function fetchNextInfoSession(now = Date.now()): Promise<InfoSession | null> {
  const res = await fetch(FEED, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Luma feed HTTP ${res.status}`);
  const data = (await res.json()) as { entries?: LumaEntry[] };
  const sessions = (data.entries ?? [])
    .map((e) => e.event)
    .filter((ev): ev is NonNullable<LumaEntry['event']> => Boolean(ev?.name && ev.url && ev.start_at))
    .filter((ev) => /info\s*session/i.test(ev.name!))
    // Still on (or not yet started): ends in the future, or starts in the future if no end is given.
    .filter((ev) => Date.parse(ev.end_at ?? ev.start_at!) > now)
    .sort((a, b) => Date.parse(a.start_at!) - Date.parse(b.start_at!));
  const ev = sessions[0];
  if (!ev) return null;
  const geo = ev.geo_address_info;
  return {
    name: ev.name!,
    url: `https://luma.com/${ev.url}`,
    startAt: ev.start_at!,
    endAt: ev.end_at ?? null,
    timezone: ev.timezone ?? 'Asia/Singapore',
    location: geo?.full_address || geo?.address || null,
  };
}
