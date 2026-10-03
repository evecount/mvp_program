/**
 * MVP mockup: rim light for the black pills, borrowed from Cybrdeck's
 * ContourGlassButton `rim` effect (cybrdeck-glass-buttons skill).
 *
 * A faint spectral band sits around the whole perimeter; a blown-out white
 * specular head orbits the rim (~1 pass per PERIOD), leaning toward the
 * pointer, dragging a bloom stretched along the edge and a warm-inside /
 * cool-outside fringe. The light stays on the rim; the label stays on dark
 * glass. Each button's canvas runs only while it is on screen and the tab is
 * visible; reduced motion parks the head at the upper left.
 */
(function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PERIOD = 4.6, PULL = 0.28, PAD = 30, FLOOR = 0.18, ENV_R = 2.4, CORE_A = 1, CA_A = 0.55;
  const SPECTRUM = ["#ff9a5a", "#ffd27a", "#fff4e0", "#9fe8ff", "#8fb0ff", "#c6a3ff", "#ff9ad5", "#ff9a5a"];

  // The pill outline walked by arc length: point(u) -> position + outward normal.
  const geom = (W, H) => {
    const r = H / 2, s = Math.max(W - H, 0), L = 2 * s + 2 * Math.PI * r;
    const point = (u) => {
      let d = (((u % 1) + 1) % 1) * L;
      if (d < s) return { x: r + d, y: 0, nx: 0, ny: -1 };
      d -= s;
      if (d < Math.PI * r) { const a = -Math.PI / 2 + d / r; return { x: W - r + Math.cos(a) * r, y: r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }; }
      d -= Math.PI * r;
      if (d < s) return { x: W - r - d, y: H, nx: 0, ny: 1 };
      d -= s;
      const a = Math.PI / 2 + d / r;
      return { x: r + Math.cos(a) * r, y: r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) };
    };
    return { W, H, r, point };
  };
  const ring = (ctx, g, k) => { ctx.beginPath(); ctx.roundRect(PAD - k, PAD - k, g.W + 2 * k, g.H + 2 * k, g.r + k); };

  const buttons = [...document.querySelectorAll(".pill--black")];
  buttons.forEach((btn, bi) => {
    const cv = document.createElement("canvas");
    cv.className = "rim-fx"; cv.setAttribute("aria-hidden", "true");
    btn.prepend(cv);
    const ctx = cv.getContext("2d");
    let g = null, dpr = 1, raf = 0, visible = false, hover = 0, hoverTo = 0, ptr = null, phase = 0.04, last = 0;

    const size = () => {
      const W = btn.offsetWidth, H = btn.offsetHeight;
      if (g && g.W === W && g.H === H) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = (W + 2 * PAD) * dpr; cv.height = (H + 2 * PAD) * dpr;
      g = geom(W, H);
    };
    const nearestU = (px, py) => {
      let best = 0, bd = 1e9;
      for (let i = 0; i < 48; i++) { const p = g.point(i / 48), d = (p.x - px) ** 2 + (p.y - py) ** 2; if (d < bd) { bd = d; best = i / 48; } }
      return best;
    };

    const paint = (now) => {
      size();
      let u = phase;
      if (ptr && !reduced) {
        // Lean toward the pointer the short way round; ease the pull to nothing
        // near the antipode so the head never snaps across the pill.
        let d = nearestU(ptr.x, ptr.y) - phase; d -= Math.round(d);
        u = phase + d * PULL * Math.cos(Math.min(Math.abs(d) * 2, 1) * Math.PI / 2) * 2;
      }
      const I = 0.6 + 0.4 * hover, head = g.point(u), hx = PAD + head.x, hy = PAD + head.y;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, g.W + 2 * PAD, g.H + 2 * PAD);

      // The spectral band, faint all round, lifted around the head.
      const conic = ctx.createConicGradient(-Math.PI / 2, PAD + g.W / 2, PAD + g.H / 2);
      SPECTRUM.forEach((c, i) => conic.addColorStop(i / (SPECTRUM.length - 1), c));
      ctx.lineWidth = 1.6; ctx.strokeStyle = conic; ctx.globalAlpha = FLOOR * I; ring(ctx, g, 0); ctx.stroke();
      const env = ctx.createRadialGradient(hx, hy, 0, hx, hy, g.H * ENV_R);
      env.addColorStop(0, "rgba(255,255,255,1)"); env.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 0.55 * I; ctx.strokeStyle = conic; ctx.lineWidth = 2; ring(ctx, g, 0); ctx.stroke();
      ctx.globalCompositeOperation = "destination-in"; ctx.globalAlpha = 1; ctx.fillStyle = env; ctx.fillRect(0, 0, g.W + 2 * PAD, g.H + 2 * PAD);
      ctx.globalCompositeOperation = "source-over";
      // Base band again (destination-in removed it far from the head).
      ctx.globalAlpha = FLOOR * I; ctx.lineWidth = 1.2; ctx.strokeStyle = conic; ring(ctx, g, 0); ctx.stroke();

      // Fringe: warm just inside, cool just outside, brightest at the head's shoulders.
      const fringe = (k, rgb) => {
        const gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, g.H * 1.4);
        gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.35, `rgba(${rgb},${CA_A * I})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        ctx.globalAlpha = 1; ctx.strokeStyle = gr; ctx.lineWidth = 1.1; ring(ctx, g, k); ctx.stroke();
      };
      fringe(-1.5, "255,214,160"); fringe(1.5, "160,200,255");
      // Specular core along the rim.
      const core = ctx.createRadialGradient(hx, hy, 0, hx, hy, g.H * 0.9);
      core.addColorStop(0, `rgba(255,255,255,${CORE_A * I})`); core.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = core; ctx.lineWidth = 1.6; ring(ctx, g, 0); ctx.stroke();

      // Bloom: light off an edge, stretched along the tangent.
      const ang = Math.atan2(head.nx, -head.ny);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.scale(2.2, 1);
      const out = ctx.createRadialGradient(0, -4, 0, 0, -4, g.H * 0.55);
      out.addColorStop(0, `rgba(175,205,255,${0.13 * I})`); out.addColorStop(1, "rgba(175,205,255,0)");
      ctx.fillStyle = out; ctx.fillRect(-g.H, -g.H, g.H * 2, g.H * 2);
      const inn = ctx.createRadialGradient(0, 2, 0, 0, 2, g.H * 0.28);
      inn.addColorStop(0, `rgba(255,238,205,${0.44 * I})`); inn.addColorStop(1, "rgba(255,238,205,0)");
      ctx.fillStyle = inn; ctx.fillRect(-g.H, -g.H, g.H * 2, g.H * 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const frame = (now) => {
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
      if (now - last < 15) return;
      const dt = last ? Math.min(now - last, 50) / 1000 : 0; last = now;
      // Still at rest: the light only travels while the pointer is on it.
      hover += (hoverTo - hover) * 0.12;
      phase = (phase + (dt / PERIOD) * hover) % 1;
      paint(now);
      if (!hoverTo && hover < 0.01) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    };
    const start = () => { if (reduced || (!hoverTo && hover < 0.01)) { if (visible) paint(performance.now()); return; } if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    btn.addEventListener("pointerenter", () => { hoverTo = 1; start(); });
    btn.addEventListener("pointerleave", () => { hoverTo = 0; ptr = null; });
    btn.addEventListener("pointermove", (e) => { const r = btn.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    btn.addEventListener("focus", () => { hoverTo = 1; start(); });
    btn.addEventListener("blur", () => (hoverTo = 0));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(btn);
    document.addEventListener("visibilitychange", start);
  });
})();
