/**
 * Application deadline countdown.
 *
 * Applications for each cohort close 72 hours before it starts. The calendar
 * comes from js/cohorts.js (generated from functions/src/mamba/program.ts,
 * which the Firestore rules and the Cloud Function enforce too); the countdown
 * follows the first cohort still open, so when one closes the next takes over.
 * [data-cohort="start"] gets that cohort's start date. Every [data-countdown]
 * element gets the remaining time:
 *   data-countdown="clock"  → 112d 04h 12m 08s (ticking each second)
 *   data-countdown="days"   → "in 112 days" / "in 5 hours" (updates each minute)
 *   data-countdown="date"   → "23 Jan 2027, 9am SGT"
 * [data-countdown-open] / [data-countdown-closed] are shown before / after.
 * Ticks only while the tab is visible.
 */
(function () {
  const OPEN = (window.MVP_COHORTS || []).find((c) => c.closesAt > Date.now()) || null;
  const CLOSE = OPEN ? OPEN.closesAt : 0;
  window.MVP_OPEN_COHORT = OPEN;
  if (OPEN) document.querySelectorAll('[data-cohort="start"]').forEach((n) => (n.textContent = OPEN.startsLabel));

  const nodes = () => document.querySelectorAll("[data-countdown]");
  if (!nodes().length) return;
  const pad = (n) => String(n).padStart(2, "0");
  const dateText = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric", hour: "numeric", hour12: true })
    .format(new Date(CLOSE)).replace(/\s?am$/i, "am").replace(/\s?pm$/i, "pm").replace(/:00/, "") + " SGT";

  let timer = 0;
  const render = () => {
    const left = Math.max(0, CLOSE - Date.now());
    const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const closed = left === 0;
    if (closed && OPEN && !window.__mvpRolled) { window.__mvpRolled = true; location.reload(); return true; }   // roll over to the next cohort
    document.querySelectorAll("[data-countdown-open]").forEach((n) => (n.hidden = closed));
    document.querySelectorAll("[data-countdown-closed]").forEach((n) => (n.hidden = !closed));
    nodes().forEach((n) => {
      const kind = n.dataset.countdown;
      if (kind === "date") n.textContent = dateText;
      else if (kind === "days") n.textContent = d >= 2 ? `in ${d} days` : d === 1 ? "in 1 day" : h >= 1 ? `in ${h} hour${h > 1 ? "s" : ""}` : "within the hour";
      else if (kind === "clock") {
        n.innerHTML = [[d, "days"], [pad(h), "hrs"], [pad(m), "min"], [pad(sec), "sec"]]
          .map(([v, u]) => `<span class="cd-unit"><b>${v}</b><small>${u}</small></span>`).join("");
        n.setAttribute("aria-label", `${d} days, ${h} hours and ${m} minutes until applications close`);
      }
    });
    return closed;
  };
  const tick = () => {
    clearTimeout(timer);
    if (render() || document.hidden) return;
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  document.addEventListener("visibilitychange", tick);
  tick();
})();
