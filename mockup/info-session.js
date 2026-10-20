/**
 * MVP mockup: the next info session, live from Luma.
 *
 * Asks /api/next-info-session (a Cloud Function reading the Cybrdeck Luma
 * calendar) for the soonest upcoming info session and writes its date, time,
 * place and RSVP link into every [data-info] slot: the announcement strip, the
 * facts band card and the closer's RSVP button. The HTML carries the current
 * session as a fallback, so a slow or failed lookup still shows something true.
 * The HTML's session is set by hand, so it stands until its `data-until` has
 * passed, even if Luma lists nothing; after that the session slots step aside
 * and RSVP links open the Cybrdeck calendar. Every page with an RSVP link
 * loads this.
 */
(function () {
  const slots = (k) => document.querySelectorAll(`[data-info="${k}"]`);
  if (!slots("link").length) return;
  const CALENDAR = "https://luma.com/cybrdeck";
  const fmt = (iso, tz, opts) => new Intl.DateTimeFormat("en-SG", { timeZone: tz, ...opts }).format(new Date(iso));

  // The apply page's header banner (js/live-banner.js): the event item lives
  // until the session ends, or goes when nothing is scheduled.
  const banner = (until) => {
    const box = document.getElementById("live-banner");
    if (!box) return;
    box.querySelectorAll('[data-until][data-info="link"]').forEach((n) => { n.hidden = !until; if (until) n.dataset.until = until; });
    box.hidden = ![...box.querySelectorAll("[data-until]")].some((n) => !n.hidden);
  };

  // The strip's dot and separator belong to the session text and go with it.
  const strip = (show) => {
    slots("strip").forEach((n) => {
      n.hidden = !show;
      n.closest(".strip")?.querySelectorAll(".strip-dot, .strip-sep").forEach((m) => (m.hidden = !show));
    });
    slots("fact").forEach((n) => (n.hidden = !show));
  };
  // Nothing scheduled: RSVP links open the Cybrdeck calendar instead of a past event.
  const none = () => {
    slots("link").forEach((a) => (a.href = CALENDAR));
    strip(false);
    banner(null);
  };

  // A fallback whose session is over never shows, even if Luma can't be reached.
  const until = Date.parse(document.querySelector("[data-info][data-until]")?.dataset.until);
  const over = Number.isFinite(until) && until < Date.now();
  if (over) none();

  fetch("/api/next-info-session", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(({ next }) => {
      if (!next) return over ? none() : undefined;
      strip(true);
      const tz = next.timezone || "Asia/Singapore";
      const day = fmt(next.startAt, tz, { day: "2-digit" }), month = fmt(next.startAt, tz, { month: "2-digit" });
      const time = fmt(next.startAt, tz, { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(/\s/g, "").toLowerCase();
      const short = fmt(next.startAt, tz, { day: "numeric", month: "short" });
      const place = next.location ? next.location.split(",")[0] : null;
      const num = (next.name.match(/#\s*\d+/) || [""])[0].replace(/\s/g, "");
      const kind = /open\s*house/i.test(next.name) ? "Open House" : "Info session";

      slots("link").forEach((a) => (a.href = next.url));
      slots("date").forEach((n) => (n.textContent = short));
      slots("detail").forEach((n) => (n.textContent = place ? `${time} at ${place}` : `${time}, venue shared on RSVP`));
      slots("kicker").forEach((n) => (n.textContent = `${kind}${num ? " " + num : ""}`));
      slots("when").forEach((n) => (n.textContent = `${short}, ${time}${place ? " · " + place : ""}`));
      banner(next.endAt || next.startAt);
      slots("strip").forEach((n) => {
        n.innerHTML = "";
        const b = document.createElement("b"); b.textContent = `${kind}${num ? " " + num : ""}`;
        n.append(b, ` · ${short}, ${time}${place ? " · " + place : ""}`);
      });
    })
    .catch(() => { /* keep the fallback in the HTML */ });
})();
