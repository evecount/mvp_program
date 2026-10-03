/**
 * Mamba MVP — hash router.
 *
 * Keeps the landing page light: one audience tab visible at a time, and the
 * application on its own screen, reachable by link.
 *
 *   #apply              → Apply to MVP (the application form)
 *   #section-<audience> → landing page with that audience tab open
 *   (anything else)     → landing page, Founders tab
 */
(function () {
  const SCREENS = { apply: "screen-apply" };

  function show(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === screenId));
    document.body.dataset.screen = screenId;
  }

  const chips = () => [...document.querySelectorAll(".audience-chip")];
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function selectTab(sectionId) {
    const panels = document.querySelectorAll(".audience-panel");
    if (![...panels].some((p) => p.id === sectionId)) sectionId = "section-founders";
    panels.forEach((p) => {
      p.hidden = p.id !== sectionId;
      p.setAttribute("role", "tabpanel");
    });
    chips().forEach((chip) => {
      const on = chip.getAttribute("href") === `#${sectionId}`;
      chip.classList.toggle("active", on);
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", String(on));
      chip.setAttribute("aria-controls", chip.getAttribute("href").slice(1));
      chip.tabIndex = on ? 0 : -1;
    });
    chips()[0]?.parentElement?.setAttribute("role", "tablist");
    return sectionId;
  }

  /* A tab change slides the panel in the direction of travel (styled in
     style.css under ::view-transition). Without View Transitions, or with
     reduced motion, it swaps instantly. */
  function switchTab(id) {
    const list = chips();
    const from = list.findIndex((c) => c.classList.contains("active"));
    const to = list.findIndex((c) => c.getAttribute("href") === `#${id}`);
    if (from === to) return;
    if (!document.startViewTransition || reducedMotion()) return selectTab(id);
    document.documentElement.dataset.vtDir = to < from ? "back" : "forward";
    document.startViewTransition(() => selectTab(id));
  }

  function route() {
    const hash = location.hash.replace(/^#/, "");
    if (SCREENS[hash]) {
      show(SCREENS[hash]);
      window.scrollTo({ top: 0 });
      document.dispatchEvent(new CustomEvent("mvp:route", { detail: hash }));
      return;
    }

    const wasLanding = document.body.dataset.screen === "screen-orientation";
    show("screen-orientation");
    const tab = selectTab(hash.startsWith("section-") ? hash : "section-founders");
    if (hash.startsWith("section-")) {
      // Bring the tab strip into view so the newly opened panel is visible.
      const strip = document.querySelector(".audience-nav-strip");
      strip?.scrollIntoView({ behavior: wasLanding ? "smooth" : "auto", block: "start" });
    } else if (!wasLanding) {
      window.scrollTo({ top: 0 });
    }
    return tab;
  }

  // Tabs switch in place without jumping the page.
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".audience-chip");
    if (chip) {
      e.preventDefault();
      const id = chip.getAttribute("href").slice(1);
      history.replaceState(null, "", id === "section-founders" ? location.pathname : `#${id}`);
      switchTab(id);
      return;
    }
    // "Back to the program" links use href="#": clear the hash entirely.
    const back = e.target.closest('a[href="#"]');
    if (back && !back.closest(".brand-badge")) {
      e.preventDefault();
      history.pushState(null, "", location.pathname);
      route();
    }
  });

  // Arrow keys move between tabs, as in any tab list.
  document.addEventListener("keydown", (e) => {
    const chip = e.target.closest?.(".audience-chip");
    if (!chip || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const list = chips();
    const i = list.indexOf(chip);
    const next = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: list.length - 1 }[e.key];
    const target = list[(next + list.length) % list.length];
    target.focus();
    target.click();
  });

  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  document.addEventListener("DOMContentLoaded", route);
  window.mvpRoute = route;
})();
