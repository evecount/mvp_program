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

  /* Keep the address bar in step with the page: the nav section in view goes
     in the hash, and back at the top the hash clears, so the URL never names
     a section you have scrolled away from. */
  const spots = [...document.querySelectorAll('.nav-glass a[href^="#"]')].map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  let shownHash = location.hash.slice(1), spyQueued = false;
  const spy = () => {
    spyQueued = false;
    // The nav's order isn't the page's order, so take the section nearest above the reading line.
    let id = "", best = -Infinity;
    for (const s of spots) { const t = s.getBoundingClientRect().top; if (t <= innerHeight * 0.35 && t > best) { best = t; id = s.id; } }
    if (id === shownHash) return;
    shownHash = id;
    history.replaceState(history.state, "", id ? `#${id}` : location.pathname + location.search);
  };
  addEventListener("scroll", () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }, { passive: true });

  /* Segmented control (Apple motion): the pill's two edges ride their own
     springs. The leading edge is stiffer, so the pill stretches toward the new
     tab and the trailing edge catches up; a tap mid-flight retargets with the
     velocity it already has. The dark label is a copy of the row clipped to
     the pill, so text changes colour exactly where the pill is, mid-move too.
     The panel slides in from the direction of travel. */
  const seg = document.getElementById("seg");
  const tabs = [...seg.querySelectorAll('[role="tab"]')];
  const indicator = seg.querySelector(".seg-indicator");
  const ink = document.createElement("div");
  ink.className = "seg-ink"; ink.setAttribute("aria-hidden", "true");
  tabs.forEach((t) => { const c = t.cloneNode(true); c.removeAttribute("id"); c.removeAttribute("role"); c.removeAttribute("aria-controls"); c.removeAttribute("aria-selected"); c.tabIndex = -1; ink.append(c); });
  seg.append(ink);
  const twins = [...ink.children];
  tabs.forEach((t, i) => {
    t.addEventListener("pointerdown", () => twins[i].classList.add("press"));
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => t.addEventListener(ev, () => twins[i].classList.remove("press")));
  });

  const edge = (k, zeta) => ({ x: 0, v: 0, to: 0, k, c: 2 * zeta * Math.sqrt(k) });
  let L = edge(300, 0.92), R = edge(300, 0.92), raf = 0, last = 0;
  const render = () => {
    const l = L.x, r = Math.max(R.x, l + 24), W = seg.clientWidth, H = seg.clientHeight;
    indicator.style.transform = `translateX(${l}px)`; indicator.style.width = `${r - l}px`;
    ink.style.clipPath = `inset(6px ${W - r}px ${6}px ${l}px round ${(H - 12) / 2}px)`;
  };
  const step = (now) => {
    const dt = Math.min((now - (last || now)) / 1000, 1 / 30); last = now;
    let moving = false;
    for (const e of [L, R]) {
      for (let i = 0; i < 4; i++) { const h = dt / 4, a = -e.k * (e.x - e.to) - e.c * e.v; e.v += a * h; e.x += e.v * h; }
      if (Math.abs(e.x - e.to) > 0.05 || Math.abs(e.v) > 0.5) moving = true; else { e.x = e.to; e.v = 0; }
    }
    render();
    raf = moving ? requestAnimationFrame(step) : (last = 0, 0);
  };
  const place = (tab, animate) => {
    const l = tab.offsetLeft, r = l + tab.offsetWidth;
    if (!animate) { L.x = L.to = l; R.x = R.to = r; L.v = R.v = 0; cancelAnimationFrame(raf); raf = 0; render(); return; }
    // The edge heading toward the new tab leads; the other follows softer.
    const right = (l + r) / 2 > (L.to + R.to) / 2;
    const lead = edge(520, 0.78), trail = edge(230, 0.9);
    Object.assign(L, right ? trail : lead, { x: L.x, v: L.v, to: l });
    Object.assign(R, right ? lead : trail, { x: R.x, v: R.v, to: r });
    if (!raf) raf = requestAnimationFrame(step);
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
    place(tab, !reduced() && from >= 0);
    if (focus) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "center", behavior: reduced() ? "auto" : "smooth" });
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (!reduced() && panel.animate) {
      const dir = to > from ? 1 : -1;
      panel.animate(
        [{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: "none" }],
        { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
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
  const settle = () => place(tabs.find((t) => t.getAttribute("aria-selected") === "true"), false);
  settle();
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
