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

  function selectTab(sectionId) {
    const panels = document.querySelectorAll(".audience-panel");
    if (![...panels].some((p) => p.id === sectionId)) sectionId = "section-founders";
    panels.forEach((p) => (p.hidden = p.id !== sectionId));
    document.querySelectorAll(".audience-chip").forEach((chip) => {
      const on = chip.getAttribute("href") === `#${sectionId}`;
      chip.classList.toggle("active", on);
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", String(on));
    });
    return sectionId;
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
      selectTab(id);
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

  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  document.addEventListener("DOMContentLoaded", route);
  window.mvpRoute = route;
})();
