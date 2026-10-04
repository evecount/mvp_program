/**
 * MVP mockup: the next info session, live from Luma.
 *
 * Asks /api/next-info-session (a Cloud Function reading the Cybrdeck Luma
 * calendar) for the soonest upcoming info session and writes its date, time,
 * place and RSVP link into every [data-info] slot: the announcement strip, the
 * facts band card and the closer's RSVP button. The HTML carries the current
 * session as a fallback, so a slow or failed lookup still shows something true.
 * When Luma has no upcoming session, the session slots step aside and RSVP
 * links open the Cybrdeck calendar. Every page with an RSVP link loads this.
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

  fetch("/api/next-info-session", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(({ next }) => {
      if (!next) {
        // Nothing scheduled: RSVP links open the Cybrdeck calendar instead of a past event.
        slots("link").forEach((a) => (a.href = CALENDAR));
        slots("strip").forEach((n) => (n.hidden = true));
        slots("fact").forEach((n) => (n.hidden = true));
        banner(null);
        return;
      }
      const tz = next.timezone || "Asia/Singapore";
      const day = fmt(next.startAt, tz, { day: "2-digit" }), month = fmt(next.startAt, tz, { month: "2-digit" });
      const time = fmt(next.startAt, tz, { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(/\s/g, "").toLowerCase();
      const short = fmt(next.startAt, tz, { day: "numeric", month: "short" });
      const place = next.location ? next.location.split(",")[0] : null;
      const num = (next.name.match(/#\s*\d+/) || [""])[0].replace(/\s/g, "");

      slots("link").forEach((a) => (a.href = next.url));
      slots("date").forEach((n) => (n.textContent = short));
      slots("detail").forEach((n) => (n.textContent = place ? `${time} at ${place}` : `${time}, venue shared on RSVP`));
      slots("kicker").forEach((n) => (n.textContent = `Info session${num ? " " + num : ""}`));
      slots("when").forEach((n) => (n.textContent = `${short}, ${time}${place ? " · " + place : ""}`));
      banner(next.endAt || next.startAt);
      slots("strip").forEach((n) => {
        n.innerHTML = "";
        const b = document.createElement("b"); b.textContent = `Info session${num ? " " + num : ""}`;
        n.append(b, ` · ${short}, ${time}${place ? " · " + place : ""}`);
      });
    })
    .catch(() => { /* keep the fallback in the HTML */ });
})();
