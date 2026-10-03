/**
 * Application deadline countdown.
 *
 * Applications for each cohort close 72 hours before the cohort starts. The
 * cohort start is the one fact to edit when a new intake opens; the deadline
 * is derived. Every [data-countdown] element gets the remaining time:
 *   data-countdown="clock"  → 112d 04h 12m 08s (ticking each second)
 *   data-countdown="days"   → "in 112 days" / "in 5 hours" (updates each minute)
 *   data-countdown="date"   → "23 Jan 2027, 9am SGT"
 * [data-countdown-open] / [data-countdown-closed] are shown before / after.
 * Ticks only while the tab is visible.
 */
(function () {
  const COHORT = { n: 2, start: "2027-01-26T09:00:00+08:00" };
  const CLOSE = Date.parse(COHORT.start) - 72 * 3600 * 1000;
  window.MVP_DEADLINE = { cohort: COHORT, closesAt: CLOSE };

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
