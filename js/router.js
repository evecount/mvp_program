/**
 * Mamba MVP — apply page router.
 *
 * apply.html is only the application now (the landing page lives at /), so
 * every visit shows the form; #apply stays in the URL for links that use it.
 */
(function () {
  function route() {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-apply"));
    document.body.dataset.screen = "screen-apply";
    document.dispatchEvent(new CustomEvent("mvp:route", { detail: "apply" }));
  }
  addEventListener("hashchange", route);
  route();
})();
