/**
 * MVP mockup: the next info session, live from Luma.
 *
 * Asks /api/next-info-session (a Cloud Function reading the Cybrdeck Luma
 * calendar) for the soonest upcoming info session and writes its date, time,
 * place and RSVP link into every [data-info] slot: the announcement strip, the
 * facts band card and the closer's RSVP button. The HTML carries the current
 * session as a fallback, so a slow or failed lookup still shows something true.
 * When Luma has no upcoming session, the session slots step aside.
 */
(function () {
  const slots = (k) => document.querySelectorAll(`[data-info="${k}"]`);
  if (!slots("link").length) return;
  const fmt = (iso, tz, opts) => new Intl.DateTimeFormat("en-SG", { timeZone: tz, ...opts }).format(new Date(iso));

  fetch("/api/next-info-session", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(({ next }) => {
      if (!next) {
        slots("strip").forEach((n) => (n.hidden = true));
        slots("fact").forEach((n) => (n.hidden = true));
        return;
      }
      const tz = next.timezone || "Asia/Singapore";
      const day = fmt(next.startAt, tz, { day: "2-digit" }), month = fmt(next.startAt, tz, { month: "2-digit" });
      const time = fmt(next.startAt, tz, { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").replace(/\s/g, "").toLowerCase();
      const short = fmt(next.startAt, tz, { day: "numeric", month: "short" });
      const place = next.location ? next.location.split(",")[0] : null;
      const num = (next.name.match(/#\s*\d+/) || [""])[0].replace(/\s/g, "");

      slots("link").forEach((a) => (a.href = next.url));
      slots("date").forEach((n) => (n.textContent = `${day}.${month}`));
      slots("detail").forEach((n) => (n.textContent = place ? `${time} at ${place}` : `${time}, venue shared on RSVP`));
      slots("strip").forEach((n) => {
        n.innerHTML = "";
        const b = document.createElement("b"); b.textContent = `Info session${num ? " " + num : ""}`;
        n.append(b, ` · ${short}, ${time}${place ? " · " + place : ""}`);
      });
    })
    .catch(() => { /* keep the fallback in the HTML */ });
})();
