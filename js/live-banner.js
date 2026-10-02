/**
 * Mamba MVP — header live banner.
 *
 * Hides each banner item once its `data-until` moment has passed, and the
 * whole banner when nothing is left, so a past info session never lingers.
 * The items and their dates live in index.html.
 */
(function () {
  const banner = document.getElementById("live-banner");
  if (!banner) return;
  const now = Date.now();
  let shown = 0;
  banner.querySelectorAll("[data-until]").forEach((item) => {
    const until = Date.parse(item.dataset.until);
    const over = Number.isFinite(until) && until < now;
    item.hidden = over;
    if (!over) shown += 1;
  });
  banner.hidden = shown === 0;
})();
