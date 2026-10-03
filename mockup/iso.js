/**
 * MVP mockup: Rubik's cube "How MVP works" scenes.
 *
 * Each step is the same isometric 3x3x3 cube at a different stage of being
 * solved. Solved, the cube reads:
 *   top   - plain orange
 *   left  - black, with the Mamba Partners emblem in orange across the face
 *   right - white, with the Cybrdeck "d" mark in orange across the face
 * Scrambled, those logo pieces are scattered as fragments, so the marks only
 * come together when the cube is solved (step 03).
 *
 * Activating a step (hover/focus on desktop, scroll on mobile) solves it a
 * little further: the stickers that change flip over on the press spring, and
 * a short burst of orange motes rises. The particle loop follows the threeui-
 * canvas-craft rAF laws: it runs only while motes live, stops on hidden tabs,
 * caps DPR at 2, and reduced motion skips it (the cube stays a still frame).
 */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ORANGE = "#fc6736", INK = "#0c0c0e", WHITE = "#f7f5f1";

  /* How solved each step is, at rest and when lit (0 = scrambled, 1 = solved). */
  const PROGRESS = [[0, 0.3], [0.45, 0.72], [0.85, 1]];

  const S = 32, C = Math.cos(Math.PI / 6), N = 3;
  const ox = N * S * C + 4, oy = N * S + 4;
  const iso = (x, y, z) => [ox + (x - y) * S * C, oy + (x + y) * S * 0.5 - z * S];
  const W = Math.round(2 * N * S * C + 8), H = Math.round(2 * N * S + 8);
  const el = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* Face-local coordinates are 0..3 x 0..3; a matrix maps them onto the cube. */
  const FACES = [
    { origin: [0, 0, 3], u: [1, 0, 0], w: [0, 1, 0] },          // top
    { origin: [0, 3, 3], u: [1, 0, 0], w: [0, 0, -1] },         // left  (y = 3)
    { origin: [3, 3, 3], u: [0, -1, 0], w: [0, 0, -1] },        // right (x = 3)
  ];
  const matrix = (f) => {
    const o = iso(...f.origin);
    const u = iso(...f.origin.map((v, i) => v + f.u[i]));
    const w = iso(...f.origin.map((v, i) => v + f.w[i]));
    return `matrix(${u[0] - o[0]} ${u[1] - o[1]} ${w[0] - o[0]} ${w[1] - o[1]} ${o[0]} ${o[1]})`;
  };

  /* Deterministic scramble (no Math.random): a fixed shuffle of 27 stickers. */
  const HOME = Array.from({ length: 27 }, (_, i) => i);
  const SCRAMBLE = (() => {
    const a = HOME.slice();
    let seed = 20270126;
    for (let i = a.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const j = seed % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  })();
  /* Cells settle in this order as the cube solves: top first, then the faces. */
  const ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7, 13, 9, 11, 15, 17, 10, 12, 14, 16, 22, 18, 20, 24, 26, 19, 21, 23, 25];
  function arrangement(t) {
    const fixed = new Set(ORDER.slice(0, Math.round(t * 27)));
    const rest = SCRAMBLE.filter((s) => !fixed.has(s));
    return HOME.map((cell) => (fixed.has(cell) ? cell : rest.shift()));
  }

  /* What a sticker looks like is decided by where it belongs when solved. */
  function sticker(source, cell, id) {
    const face = Math.floor(source / 9), k = source % 9;
    const cx = cell % 3, cy = Math.floor(cell / 3);
    const sx = k % 3, sy = Math.floor(k / 3);
    const g = el("g", { class: "stk" });
    const fill = face === 0 ? ORANGE : face === 1 ? INK : WHITE;
    g.append(el("rect", { x: cx + 0.07, y: cy + 0.07, width: 0.86, height: 0.86, rx: 0.13, fill }));
    if (face > 0) {
      const art = el("g", { "clip-path": `url(#clip-${id}-${cell})` });
      const inner = el("g", { transform: `translate(${cx - sx} ${cy - sy})` });
      inner.append(face === 1 ? mambaEmblem() : cybrdeckMark(id));
      art.append(inner);
      g.append(art);
    }
    return g;
  }

  /* Mamba Partners emblem (assets/brand/mamba-emblem.svg), redrawn in orange. */
  function mambaEmblem() {
    const g = el("g", { transform: "translate(0.42 0.42) scale(0.0037)", fill: "none", stroke: ORANGE, "stroke-width": 50, "stroke-linecap": "round", "stroke-linejoin": "round" });
    g.append(
      el("line", { x1: 26, y1: 26, x2: 554, y2: 554 }),
      el("polyline", { points: "26,554 26,192 198,364" }),
      el("polyline", { points: "382,216 554,26 554,388" }),
    );
    return g;
  }

  /* Cybrdeck "d" (cybrdeck-website/public/cybrdeck-logo), recoloured orange. */
  function cybrdeckMark(id) {
    const h = 2.05, w = h * (320 / 401);
    return el("image", { href: "assets/cybrdeck-d.png", x: (3 - w) / 2, y: (3 - h) / 2, width: w, height: h, filter: `url(#ink-${id})` });
  }

  function build(host, index) {
    const id = `c${index}`;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "iso-svg" });
    const defs = el("defs");
    const ink = el("filter", { id: `ink-${id}`, "color-interpolation-filters": "sRGB" });
    ink.append(el("feColorMatrix", { type: "matrix", values: "0 0 0 0 0.988  0 0 0 0 0.404  0 0 0 0 0.212  0 0 0 1 0" }));
    defs.append(ink);
    for (let cell = 0; cell < 9; cell++) {
      const cp = el("clipPath", { id: `clip-${id}-${cell}`, clipPathUnits: "userSpaceOnUse" });
      cp.append(el("rect", { x: (cell % 3) + 0.07, y: Math.floor(cell / 3) + 0.07, width: 0.86, height: 0.86, rx: 0.13 }));
      defs.append(cp);
    }
    svg.append(defs);

    // Black plastic body, with a hairline catching the light on the near edges.
    const p = (...v) => iso(...v).join(",");
    svg.append(el("polygon", { class: "rc-body", points: [p(0, 0, 3), p(3, 0, 3), p(3, 0, 0), p(3, 3, 0), p(0, 3, 0), p(0, 3, 3)].join(" ") }));

    const [rest, lit] = PROGRESS[index].map(arrangement);
    const faces = FACES.map((f) => {
      const g = el("g", { transform: matrix(f), class: "rc-face" });
      svg.append(g);
      return g;
    });
    let k = 0;
    for (let cell = 0; cell < 27; cell++) {
      const face = faces[Math.floor(cell / 9)], local = cell % 9;
      const slot = el("g", { class: "slot" });
      // Clip ids are per face-local cell, shared by the three faces.
      const a = sticker(rest[cell], local, id);
      a.classList.add("rest");
      slot.append(a);
      if (lit[cell] !== rest[cell]) {
        const b = sticker(lit[cell], local, id);
        b.classList.add("lit");
        a.classList.add("goes");
        slot.style.setProperty("--d", `${k++ * 45}ms`);
        slot.append(b);
      }
      face.append(slot);
    }
    svg.append(el("polyline", { class: "rc-edge", points: [p(0, 3, 3), p(3, 3, 3), p(3, 0, 3)].join(" ") }));
    svg.append(el("polyline", { class: "rc-edge", points: [p(3, 3, 3), p(3, 3, 0)].join(" ") }));

    host.append(svg);
    const canvas = document.createElement("canvas");
    canvas.className = "iso-fx";
    host.append(canvas);
    return { svg, canvas, top: iso(1.5, 1.5, 3) };
  }

  /* Orange motes rising off the cube; the loop ends when the last one does. */
  function burst(scene) {
    if (reduced() || document.hidden) return;
    const { canvas } = scene;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = r.width / W, sy = r.height / H;
    const motes = Array.from({ length: 22 }, (_, i) => {
      const a = (i * 2.399) % (Math.PI * 2);
      return {
        x: (scene.top[0] + Math.cos(a) * (14 + (i % 5) * 10)) * sx,
        y: (scene.top[1] + Math.sin(a) * 12) * sy,
        vx: Math.cos(a) * 0.25, vy: -(0.6 + (i % 7) * 0.12),
        r: 1.2 + (i % 4) * 0.55, life: 0, max: 900 + (i % 6) * 120,
      };
    });
    let last = performance.now();
    cancelAnimationFrame(scene.raf);
    const tick = (now) => {
      const dt = Math.min(now - last, 32); last = now;
      ctx.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      for (const m of motes) {
        m.life += dt;
        if (m.life > m.max) continue;
        alive++;
        m.x += m.vx * dt * 0.06; m.y += m.vy * dt * 0.06; m.vy *= 0.995;
        const t = m.life / m.max;
        ctx.globalAlpha = (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8) * 0.9;
        ctx.fillStyle = t < 0.5 ? ORANGE : "#ff9b63";
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
      scene.raf = alive && !document.hidden ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, r.width, r.height), 0);
    };
    scene.raf = requestAnimationFrame(tick);
  }

  const steps = [...document.querySelectorAll(".jstep")];
  const scenes = steps.map((li) => build(li.querySelector(".iso"), +li.dataset.step));
  const rail = [...document.querySelectorAll(".journey-rail span")];
  const setActive = (i, withFx = true) => {
    steps.forEach((li, j) => {
      const on = j === i;
      if (on && !li.classList.contains("on") && withFx) burst(scenes[j]);
      li.classList.toggle("on", on);
    });
    rail.forEach((d, j) => d.classList.toggle("on", j <= i));
  };

  const mobile = matchMedia("(max-width: 900px)");

  /* Desktop: hover or focus lights a column; leaving the row settles it. */
  steps.forEach((li, i) => {
    li.addEventListener("pointerenter", () => !mobile.matches && setActive(i));
    li.addEventListener("focus", () => !mobile.matches && setActive(i));
  });
  document.querySelector(".journey-grid").addEventListener("pointerleave", () => !mobile.matches && setActive(-1));

  /* Mobile: the section pins; scroll progress through the track picks the step. */
  const track = document.getElementById("journey-track");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    if (!mobile.matches) return;
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = Math.min(Math.max(-r.top / (span || 1), 0), 0.999);
    const i = r.top > innerHeight * 0.4 ? -1 : Math.floor(p * steps.length);
    const current = steps.findIndex((li) => li.classList.contains("on"));
    if (i !== current) setActive(i);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  mobile.addEventListener("change", () => { setActive(-1, false); onScroll(); });
  document.addEventListener("visibilitychange", () => document.hidden && scenes.forEach((s) => cancelAnimationFrame(s.raf)));
  onScroll();
})();
