/**
 * MVP mockup hero: an engraved landscape that inks itself in.
 *
 * The illustration is drawn once, procedurally and deterministically, into an
 * offscreen canvas: five mountain ranges back to front, each erasing what it
 * hides, outlined in pen and shaded with fall-line hatching and strata on the
 * shadow side (light from the upper left), with a row of pines along the base.
 *
 * On load it sweeps in from the left: a ragged edge travels across, and flakes
 * of ink drift into that edge just ahead of it, as if the drawing were being
 * blown together. The headline letters fade up out of a blur in step with the
 * edge; the dashed column guides draw down. Then the loop stops for good.
 * Reduced motion: everything in place, no sweep.
 */
(function () {
  const hero = document.querySelector(".hero");
  const cv = hero?.querySelector(".hero-ink");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  /* Deterministic noise */
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i + s * 57) * (1 - u) + hash(i + 1 + s * 57) * u; };
  const ridged = (x, s) => {
    let a = 0.55, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < 7; o++) { sum += a * (1 - Math.abs(noise(x * f, s + o) * 2 - 1)) ** 2; norm += a; a *= 0.5; f *= 2.07; }
    return sum / norm;
  };

  /* Drawing (CSS pixels; the offscreen canvas carries the DPR). */
  const art = document.createElement("canvas"), actx = art.getContext("2d");
  let W = 0, H = 0, dpr = 1, frags = [];
  const INK = "#0c0c0e";
  /* A ballpoint landscape (after a pen-on-paper study): one massif with a
     secondary ridge, a faint far range, forested foothills. Every mark is a
     short quick stroke; ridgelines are left as bare paper, shadow flanks are
     packed with strokes that run along the ridge, valleys get back-and-forth
     scribble, and stands of tiny pines climb the lower slopes. */
  const draw = () => {
    const r = cv.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(devicePixelRatio || 1, 2);
    if (!W || !H) return;
    [cv, art].forEach((c) => { c.width = W * dpr; c.height = H * dpr; });
    const g = actx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = INK;
    const sx = Math.max(W / 1440, 0.5);
    let rnd = 1;
    const R = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };

    // Silhouettes (y of the skyline at x), back to front.
    const PX = W * (W < 700 ? 0.6 : 0.6), P2 = W * 0.86;
    const far = (x) => H * (0.5 - 0.16 * ridged(x / sx / 260, 4) - 0.1 * Math.exp(-(((x - W * 0.2) / (W * 0.18)) ** 2)));
    const massif = (x) => {
      const dL = (PX - x) / (W * 0.36), dR = (x - PX) / (W * 0.3), d = x < PX ? dL : dR;
      const main = 0.04 + 0.78 * Math.pow(Math.min(Math.abs(d), 1.4), 0.9);
      const second = 0.36 + 0.5 * Math.pow(Math.min(Math.abs((x - P2) / (W * 0.13)), 1.6), 0.95);
      return H * Math.min(main, second, 0.95) + H * 0.05 * (ridged(x / sx / 70, 9) - 0.5);
    };
    const hills = (x) => H * (0.8 - 0.07 * noise(x / sx / 140, 21) - 0.05 * noise(x / sx / 45, 22));
    const LAY = [{ y: far, a: 0.5, k: 0.55 }, { y: massif, a: 1, k: 1 }, { y: hills, a: 1, k: 0.85 }];
    const owner = (x, y) => { for (let i = LAY.length - 1; i >= 0; i--) if (y >= LAY[i].y(x)) return i; return -1; };

    // Aretes: ridges falling from the summits, each a polyline x(y).
    const ridges = [];
    const spur = (x0, y0, lean, len, wob, seed) => {
      const pts = [[x0, y0]];
      let x = x0;
      for (let y = y0 + 3; y < y0 + len && y < H; y += 3) { x += lean * 3 + (noise(y / 22 + seed, 31 + seed) - 0.5) * wob; pts.push([x, y]); }
      ridges.push(pts);
    };
    const top = massif(PX), top2 = massif(P2);
    spur(PX, top, -0.62, H * 0.75, 2.2, 1); spur(PX, top, 0.7, H * 0.7, 2.2, 2);
    spur(PX, top, 0.08, H * 0.6, 3, 3); spur(PX - W * 0.08, massif(PX - W * 0.08), -0.25, H * 0.5, 2.6, 4);
    spur(PX + W * 0.09, massif(PX + W * 0.09), 0.28, H * 0.45, 2.6, 5); spur(PX - W * 0.18, massif(PX - W * 0.18), -0.1, H * 0.35, 2.4, 6);
    spur(P2, top2, -0.5, H * 0.45, 2, 7); spur(P2, top2, 0.55, H * 0.45, 2, 8); spur(P2 + W * 0.05, massif(P2 + W * 0.05), 0.15, H * 0.3, 2, 9);
    const ridgeX = (pts, y) => { const i = Math.round((y - pts[0][1]) / 3); return i >= 0 && i < pts.length ? pts[i][0] : null; };

    // Stroke field over a jittered grid.
    const marks = [], scrib = [], trees = [];
    const step = 2.6;
    for (let gy = 0; gy < H; gy += step) for (let gx = 0; gx < W; gx += step) {
      const x = gx + R() * step, y = gy + R() * step, li = owner(x, y);
      if (li < 0) continue;
      const L = LAY[li], top = L.y(x), depth = (y - top) / Math.max(H - top, 1);
      if (li === 1) {
        // Between which ridges? Shade is heavy just right of a ridge, fading to light.
        let dl = 1e9, dr = 1e9, slope = 0.4, near = 1e9;
        for (const pts of ridges) {
          const rx = ridgeX(pts, y); if (rx === null) continue;
          const d = x - rx; near = Math.min(near, Math.abs(d));
          if (d >= 0 && d < dl) { dl = d; const i = Math.round((y - pts[0][1]) / 3); slope = (pts[Math.min(i + 2, pts.length - 1)][0] - pts[Math.max(i - 2, 0)][0]) / 12; }
          if (d < 0 && -d < dr) dr = -d;
        }
        if (near < 2.2 || y - top < 1.5) continue;                     // bare paper on the ridgelines
        const t = dl > 1e8 ? 0.8 : dr > 1e8 ? 0.15 : dl / (dl + dr);
        const shade = Math.min(1, (1 - t) * 0.85 + (x > PX ? 0.2 : 0) + depth * 0.25);
        if (R() > 0.06 + shade * 0.74) continue;
        if (depth > 0.6 && R() < 0.3) { if (R() < 0.5) trees.push([x, y, 3 + R() * 4]); continue; }
        const ang = Math.atan2(1, slope) + (R() - 0.5) * 0.5, len = 3 + R() * (4 + shade * 7);
        marks.push([x, y, ang, len, L.a * (0.6 + 0.4 * shade)]);
      } else if (li === 0) {
        const slope = (L.y(x + 4) - L.y(x - 4)) / 8, shade = Math.max(0, Math.min(1, slope * 2 + 0.3));
        if (y - top < 1.2 || depth > 0.45 || R() > 0.02 + shade * 0.22) continue;
        marks.push([x, y, Math.atan2(1, slope * 1.4) + (R() - 0.5) * 0.4, 2 + R() * 3.5, L.a]);
      } else {
        // Foothills: forest, with scribbled clearings.
        const stand = noise(x / 70, 41);
        if (stand > 0.5 && R() < 0.1 + depth * 0.06) trees.push([x, y, 3 + R() * 5 + depth * 8]);
        else if (R() < 0.035) scrib.push([x, y, 6 + R() * 12]);
      }
    }
    // Skyline of the massif and hills: broken quick strokes, not a contour.
    for (const [li, gap] of [[0, 0.45], [1, 0.25], [2, 0.55]]) for (let x = 0; x < W; x += 3) {
      if (R() < gap) continue;
      const y = LAY[li].y(x);
      if (owner(x, y - 0.5) > li) continue;
      marks.push([x, y, Math.atan2(LAY[li].y(x + 4) - y, 4), 3.5, 1]);
    }

    g.lineWidth = 0.75;
    for (const [x, y, a, len, al] of marks) {
      g.globalAlpha = al; g.beginPath();
      const bx = Math.cos(a) * len, by = Math.sin(a) * len, w = (R() - 0.5) * 1.2;
      g.moveTo(x, y); g.quadraticCurveTo(x + bx * 0.5 - by * 0.1 * w, y + by * 0.5 + bx * 0.1 * w, x + bx, y + by); g.stroke();
    }
    g.globalAlpha = 0.9; g.lineWidth = 0.7;
    for (const [x, y, wd] of scrib) {
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) g.lineTo(x + (k % 2 ? wd : 0) + R() * 2, y + k * 1.4);
      g.stroke();
    }
    g.globalAlpha = 1; g.lineWidth = 0.8;
    for (const [x, y, h] of trees) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5), y - h);
      for (let k = 1; k < 4; k++) { const ty = y - h * (k / 4), tw = h * 0.22 * (1 - k / 5); g.moveTo(x - tw, ty + tw * 0.5); g.lineTo(x, ty); g.lineTo(x + tw, ty + tw * 0.5); }
      g.stroke();
    }
    // A few tall foreground pines at the edges, as in the study.
    for (let i = 0; i < 9; i++) {
      const x = (i < 5 ? 0.02 + i * 0.035 : 0.78 + (i - 5) * 0.05) * W + R() * 10, h = H * (0.18 + R() * 0.16), y = H + 2;
      g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h);
      for (let k = 1; k < 10; k++) { const ty = y - h * (k / 10), tw = h * 0.16 * (1 - k / 11) * (0.7 + R() * 0.5); g.moveTo(x - tw, ty + tw * 0.4); g.lineTo(x, ty); g.lineTo(x + tw, ty + tw * 0.4); }
      g.stroke();
    }
    g.globalAlpha = 1;
    // Flakes: short ink dashes sampled from where the drawing has ink.
    const data = g.getImageData(0, 0, W * dpr, H * dpr).data;
    frags = [];
    for (let n = 0, tries = 0; n < 340 && tries < 6000; tries++) {
      const x = hash(tries * 1.31) * W, y = hash(tries * 2.77 + 9) * H;
      if (data[(Math.floor(y * dpr) * W * dpr + Math.floor(x * dpr)) * 4 + 3] < 90) continue;
      frags.push({ x, y, dx: 30 + hash(n * 5.1) * 120, dy: -70 + hash(n * 6.3) * 90, rot: hash(n * 8.9) * Math.PI, len: 2 + hash(n * 4.4) * 5 });
      n++;
    }
  };

  /* The sweep */
  const blit = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(art, 0, 0); };
  const edgeAt = (y, e, t) => e + (noise(y * 0.035 + t * 1.5, 41) - 0.5) * 70;
  const frame = (e, t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.scale(dpr, dpr);
    ctx.beginPath(); ctx.moveTo(-10, -10);
    for (let y = -10; y <= H + 10; y += 8) ctx.lineTo(edgeAt(y, e, t), y);
    ctx.lineTo(-10, H + 10); ctx.closePath();
    ctx.save(); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(art, 0, 0); ctx.restore();
    // Flakes drift in from ahead of the edge and are absorbed as it reaches them.
    ctx.strokeStyle = INK; ctx.lineCap = "round";
    for (const f of frags) {
      const k = (edgeAt(f.y, e, t) - (f.x - 150)) / 150;
      if (k <= 0 || k >= 1) continue;
      const q = 1 - k, x = f.x + f.dx * q * q, y = f.y + f.dy * q * q, a = f.rot + q * 2.5;
      ctx.globalAlpha = Math.min(1, k * 1.6) * 0.85; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * f.len, y - Math.sin(a) * f.len); ctx.lineTo(x + Math.cos(a) * f.len, y + Math.sin(a) * f.len); ctx.stroke();
    }
    ctx.restore();
  };

  /* Headline letters (words stay unbreakable) fade up out of a blur in step. */
  const letters = [];
  hero.querySelectorAll(".hero-title .line > span").forEach((span) => {
    const words = span.textContent.split(" ");
    span.textContent = "";
    words.forEach((w, wi) => {
      const word = document.createElement("span"); word.className = "word"; word.setAttribute("aria-hidden", "true");
      [...w].forEach((c) => { const ch = document.createElement("span"); ch.className = "ch"; ch.textContent = c; word.append(ch); letters.push(ch); });
      span.append(word);
      if (wi < words.length - 1) span.append(" ");
    });
  });

  draw();
  if (reduced) { blit(); root.classList.add("inked"); addEventListener("resize", () => { draw(); blit(); }); return; }

  root.classList.add("inking");
  const DUR = 1900;
  const start = () => {
    const t0 = performance.now(), hr = hero.getBoundingClientRect();
    letters.forEach((ch) => {
      const x = ch.getBoundingClientRect().left - hr.left;
      ch.animate(
        [{ opacity: 0, filter: "blur(10px)", transform: "translateY(.08em)" }, { opacity: 1, filter: "blur(0)", transform: "none" }],
        { duration: 700, delay: 120 + (x / hr.width) * DUR * 0.8, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" },
      );
    });
    root.classList.add("inked");
    const tick = (now) => {
      const p = Math.min((now - t0) / DUR, 1), e = (1 - (1 - p) ** 2.2) * (W + 220) - 110;
      frame(e, (now - t0) / 1000);
      if (p < 1 && !document.hidden) requestAnimationFrame(tick); else blit();
    };
    requestAnimationFrame(tick);
  };
  (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(start));
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { draw(); blit(); }, 120); });
})();
