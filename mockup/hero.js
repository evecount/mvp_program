/**
 * MVP mockup hero: the lava field.
 *
 * Five warm masses drift on slow Lissajous paths across a low-res canvas
 * (upscaled by the browser, so it reads as soft light); one of them leans
 * toward the pointer.
 *
 * The loop and runs only while the hero is on screen and the
 * tab is visible (threeui-canvas-craft). Reduced motion: one still frame.
 */
(function () {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  /* Field */
  const cv = hero.querySelector(".hero-field"), ctx = cv.getContext("2d");
  let W = 0, H = 0, HW = 0, HH = 0;
  const BLOBS = [
    { c: "255,182,128", r: 0.62, x: 0.82, y: 0.08, ax: 0.14, ay: 0.12, fx: 0.031, fy: 0.023, a: 0.95 },
    { c: "255,128,72", r: 0.55, x: 0.30, y: 0.30, ax: 0.20, ay: 0.16, fx: 0.019, fy: 0.027, a: 0.85 },
    { c: "226,67,26", r: 0.60, x: 0.62, y: 0.86, ax: 0.22, ay: 0.10, fx: 0.023, fy: 0.017, a: 0.9 },
    { c: "176,38,10", r: 0.42, x: 0.10, y: 0.92, ax: 0.10, ay: 0.08, fx: 0.029, fy: 0.021, a: 0.55 },
    { c: "255,220,182", r: 0.30, x: 0.70, y: 0.45, ax: 0.06, ay: 0.06, fx: 0.041, fy: 0.037, a: 0.55, follow: true },
  ];
  const size = () => {
    const r = hero.getBoundingClientRect();
    HW = r.width; HH = r.height;
    W = cv.width = Math.max(40, Math.round(HW / 8));
    H = cv.height = Math.max(40, Math.round(HH / 8));
  };
  const lean = { x: 0.7, y: 0.45 };
  const drawField = (t) => {
    const base = ctx.createLinearGradient(0, 0, W * 0.4, H);
    base.addColorStop(0, "#ff7f45"); base.addColorStop(0.45, "#fc6736"); base.addColorStop(1, "#e2431a");
    ctx.globalAlpha = 1; ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    const s = Math.max(W, H);
    BLOBS.forEach((b, i) => {
      let x = b.x + b.ax * Math.sin(t * b.fx * 0.006 + i * 1.7);
      let y = b.y + b.ay * Math.cos(t * b.fy * 0.006 + i * 2.3);
      if (b.follow) { x = x * 0.5 + lean.x * 0.5; y = y * 0.5 + lean.y * 0.5; }
      const gx = x * W, gy = y * H, gr = b.r * s;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, `rgba(${b.c},${b.a})`); g.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
  };

  let target = null, last = 0, raf = 0, visible = false;

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    const lx = target ? target.x / HW : 0.7, ly = target ? target.y / HH : 0.45;
    lean.x += (lx - lean.x) * Math.min(dt * 1.5, 1); lean.y += (ly - lean.y) * Math.min(dt * 1.5, 1);
    drawField(now);
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
  };
  const start = () => { if (!raf && !reduced && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  size();
  drawField(0);

  if (reduced) { addEventListener("resize", () => { size(); drawField(0); }); return; }

  if (finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      target = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    hero.addEventListener("pointerleave", () => (target = null));
  }
  addEventListener("resize", size);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  document.addEventListener("visibilitychange", start);
})();
