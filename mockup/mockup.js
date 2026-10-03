/* MVP redesign mockup: glass lens map, hero entrance, tab morph, nav theme. */
(function () {
  const root = document.documentElement;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");

  /* Liquid glass lens map (cybrdeck-liquid-glass): R bends x, G bends y,
     128 is neutral, curvature only in the outer lip. */
  const lens = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90" viewBox="0 0 300 90" preserveAspectRatio="none"><defs><linearGradient id="x" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(0,0,0)"/><stop offset="0.06" stop-color="rgb(64,0,0)"/><stop offset="0.17" stop-color="rgb(128,0,0)"/><stop offset="0.83" stop-color="rgb(128,0,0)"/><stop offset="0.94" stop-color="rgb(192,0,0)"/><stop offset="1" stop-color="rgb(255,0,0)"/></linearGradient><linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(0,0,0)"/><stop offset="0.10" stop-color="rgb(0,64,0)"/><stop offset="0.30" stop-color="rgb(0,128,0)"/><stop offset="0.70" stop-color="rgb(0,128,0)"/><stop offset="0.90" stop-color="rgb(0,192,0)"/><stop offset="1" stop-color="rgb(0,255,0)"/></linearGradient></defs><rect width="300" height="90" fill="url(#x)"/><rect width="300" height="90" fill="url(#y)" style="mix-blend-mode:screen"/></svg>`;
  const href = "data:image/svg+xml;utf8," + encodeURIComponent(lens);
  document.querySelectorAll("#lens-map-a, #lens-map-b").forEach((n) => n.setAttribute("href", href));

  /* The one authored moment: the hero headline rises out of its line masks. */
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));

  /* Lists appear as lists, once, as they reach the viewport. */
  const io = "IntersectionObserver" in window && !reduced()
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const sibs = [...e.target.parentElement.children].filter((n) => n.classList.contains("reveal"));
        e.target.style.transitionDelay = `${Math.min(sibs.indexOf(e.target), 4) * 60}ms`;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }), { rootMargin: "0px 0px -10% 0px" })
    : null;
  document.querySelectorAll(".reveal").forEach((n) => (io ? io.observe(n) : n.classList.add("in")));

  /* Segmented control: the orange indicator morphs between tabs on a spring;
     the panel slides in from the direction of travel. */
  const seg = document.getElementById("seg");
  const tabs = [...seg.querySelectorAll('[role="tab"]')];
  const indicator = seg.querySelector(".seg-indicator");
  const place = (tab) => {
    indicator.style.width = `${tab.offsetWidth}px`;
    indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
  };
  const select = (tab, focus) => {
    const from = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const to = tabs.indexOf(tab);
    if (from === to) return;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    place(tab);
    if (focus) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced() ? "auto" : "smooth" });
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (!reduced() && panel.animate) {
      const dir = to > from ? 1 : -1;
      panel.animate(
        [{ opacity: 0, transform: `translateX(${dir * 32}px)` }, { opacity: 1, transform: "none" }],
        { duration: 460, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    }
  };
  tabs.forEach((t) => t.addEventListener("click", () => select(t)));
  seg.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(tabs[(next + tabs.length) % tabs.length], true);
  });
  const settle = () => place(tabs.find((t) => t.getAttribute("aria-selected") === "true"));
  indicator.style.transition = "none";
  settle();
  requestAnimationFrame(() => (indicator.style.transition = ""));
  addEventListener("resize", settle);
  document.fonts?.ready.then(settle);

  /* The floating header reads what is under it and picks glass to match. */
  const nav = document.getElementById("nav");
  const tone = (el) => {
    const s = el?.closest("section, footer, .strip");
    if (!s) return "light";
    if (s.matches(".hero, .closer")) return "orange";
    if (s.matches(".audiences, .foot, .strip")) return "dark";
    return "light";
  };
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = nav.getBoundingClientRect();
    nav.style.visibility = "hidden";
    const under = document.elementFromPoint(innerWidth / 2, r.top + r.height / 2);
    nav.style.visibility = "";
    nav.dataset.on = tone(under);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  /* Lit pills: each comes into focus as it enters the light (the viewport);
     on hover the simulated light source follows the pointer along the top. */
  document.querySelectorAll(".pill--black").forEach((b) => {
    if (io) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { setTimeout(() => b.classList.add("lit"), 250); o.disconnect(); } }, { threshold: 0.6 }).observe(b);
    else b.classList.add("lit");
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty("--lx", `${Math.round(Math.min(Math.max((e.clientX - r.left) / r.width, 0.08), 0.92) * 100)}%`);
    });
    b.addEventListener("pointerleave", () => b.style.removeProperty("--lx"));
  });

  /* Header CTA. No duplicates: it waits offstage while the hero's (or the
     closer's) Apply button is on screen. When that leaves, it arrives as an
     orb and stretches once into the full pill (the Search-to-Siri morph), and
     from then on it simply stays a pill; it never folds while you read. */
  const cta = document.getElementById("nav-cta");
  const onStage = new Set();
  let morph = 0;
  const stage = () => {
    const away = onStage.size === 0;
    if (away === !cta.classList.contains("is-hidden")) return;
    clearTimeout(morph);
    if (!away) { cta.classList.add("is-hidden"); return; }
    if (reduced()) { cta.classList.remove("is-hidden", "is-orb"); return; }
    cta.classList.add("is-orb");
    cta.classList.remove("is-hidden");
    morph = setTimeout(() => cta.classList.remove("is-orb"), 260);
  };
  if ("IntersectionObserver" in window) {
    const watch = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? onStage.add(e.target) : onStage.delete(e.target))); stage(); });
    document.querySelectorAll(".hero-ctas .pill--black").forEach((b) => watch.observe(b));
  } else cta.classList.remove("is-hidden");
})();
