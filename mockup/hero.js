/**
 * MVP mockup hero: a lava field and a jelly lens.
 *
 *   Field - five warm masses drift on slow Lissajous paths across a low-res
 *           canvas (upscaled by the browser, so it reads as soft light); one
 *           of them leans toward the pointer.
 *   Jelly - a drop of liquid glass whose backdrop is bent by a spherical
 *           displacement map, so the headline swells under it. It follows the
 *           pointer on an underdamped spring, squashes along its velocity and
 *           jiggles when you press.
 *
 * One rAF loop drives both and runs only while the hero is on screen and the
 * tab is visible (threeui-canvas-craft). Reduced motion: one still frame.
 */
(function () {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  /* Spherical lens map: R/G push each sample toward the centre, gently in the
     middle and hard at the rim, like looking through a drop of water. */
  (function lensMap() {
    const N = 256, c = document.createElement("canvas");
    c.width = c.height = N;
    const g = c.getContext("2d"), img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const nx = ((i + 0.5) / N) * 2 - 1, ny = ((j + 0.5) / N) * 2 - 1, r = Math.hypot(nx, ny);
      let dx = 0, dy = 0;
      if (r < 1) {
        const k = 0.5 + (r > 1e-3 ? (0.85 * (1 - Math.sqrt(1 - r * r))) / r : 0);
        dx = Math.max(-1, Math.min(1, -nx * k)); dy = Math.max(-1, Math.min(1, -ny * k));
      }
      const o = (j * N + i) * 4;
      img.data[o] = 128 + 127 * dx; img.data[o + 1] = 128 + 127 * dy; img.data[o + 2] = 128; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    document.getElementById("lens-map-c")?.setAttribute("href", c.toDataURL());
  })();

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

  /* Jelly */
  const jelly = hero.querySelector(".jelly");
  const p = { x: 0, y: 0, vx: 0, vy: 0, s: 1, vs: 0 };
  let target = null, last = 0, raf = 0, visible = false;
  const home = (t) => ({
    x: HW * (HW < 700 ? 0.68 : 0.72) + Math.sin(t * 0.00045) * HW * 0.04,
    y: HH * (HW < 700 ? 0.3 : 0.5) + Math.cos(t * 0.00061) * HH * 0.035,
  });
  /* Chromium paints a backdrop filter's feImage at its own size, so the map
     is pinned to the lens's pixel box (and re-pinned on resize). */
  const map = document.getElementById("lens-map-c");
  const title = hero.querySelector(".hero-title");
  const clone = title.cloneNode(true);
  clone.removeAttribute("id");
  const lensText = jelly.querySelector(".jelly-text"), lensBg = jelly.querySelector(".jelly-bg"), bctx = lensBg.getContext("2d");
  lensText.append(clone);
  const MAG = 1.22;
  let tx = 0, ty = 0;
  const measure = () => {
    const h = hero.getBoundingClientRect(), t = title.getBoundingClientRect();
    tx = t.left - h.left; ty = t.top - h.top;
    clone.style.width = `${t.width}px`;
    lensBg.width = lensBg.height = Math.max(32, Math.round(jelly.offsetWidth / 4));
  };
  const fitMap = () => { const S = jelly.offsetWidth; ["x", "y"].forEach((k) => map?.setAttribute(k, 0)); map?.setAttribute("width", S); map?.setAttribute("height", S); };
  const placeJelly = () => {
    const S = jelly.offsetWidth, sp = Math.hypot(p.vx, p.vy);
    // The lens shows what is under its centre, magnified: the headline copy is
    // laid where the real one sits, and the field is sampled around the centre.
    clone.style.transform = `translate(${tx - (p.x - S / 2)}px, ${ty - (p.y - S / 2)}px)`;
    const span = S / MAG, k = W / HW;
    bctx.drawImage(cv, (p.x - span / 2) * k, (p.y - span / 2) * k, span * k, span * k, 0, 0, lensBg.width, lensBg.height);
    const amt = Math.min(sp / 2600, 0.22), ang = Math.atan2(p.vy, p.vx);
    jelly.style.transform =
      `translate3d(${p.x - S / 2}px, ${p.y - S / 2}px, 0) rotate(${ang}rad) scale(${(1 + amt) * p.s}, ${(1 - amt * 0.8) * p.s}) rotate(${-ang}rad)`;
  };

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    const h = home(now), tg = target || h;
    // Underdamped spring: it overshoots a little and settles, like jelly.
    const K = 70, C = 9;
    p.vx += (K * (tg.x - p.x) - C * p.vx) * dt; p.vy += (K * (tg.y - p.y) - C * p.vy) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vs += (260 * (1 - p.s) - 10 * p.vs) * dt; p.s += p.vs * dt;
    const lx = target ? target.x / HW : 0.7, ly = target ? target.y / HH : 0.45;
    lean.x += (lx - lean.x) * Math.min(dt * 1.5, 1); lean.y += (ly - lean.y) * Math.min(dt * 1.5, 1);
    drawField(now);
    placeJelly();
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
  };
  const start = () => { if (!raf && !reduced && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  size(); fitMap(); measure();
  document.fonts?.ready.then(() => { measure(); placeJelly(); });
  const h0 = home(0); p.x = h0.x; p.y = h0.y;
  drawField(0); placeJelly();

  if (reduced) { addEventListener("resize", () => { size(); fitMap(); measure(); const h = home(0); p.x = h.x; p.y = h.y; drawField(0); placeJelly(); }); return; }

  if (finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      target = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    hero.addEventListener("pointerleave", () => (target = null));
  }
  hero.addEventListener("pointerdown", () => (p.vs -= 3.2));
  addEventListener("resize", () => { size(); fitMap(); measure(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  document.addEventListener("visibilitychange", start);
})();
