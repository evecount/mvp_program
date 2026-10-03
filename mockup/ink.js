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
    // The stage runs from just under the floating header to the foot of the hero.
    const nav = document.getElementById("nav"), hr = hero.getBoundingClientRect();
    const top = Math.max(0, Math.round((nav ? nav.getBoundingClientRect().bottom - hr.top : 0) + 8));
    cv.style.top = `${top}px`; cv.style.height = `${hr.height - top}px`;
    const r = cv.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(devicePixelRatio || 1, 2);
    if (!W || !H) return;
    [cv, art].forEach((c) => { c.width = W * dpr; c.height = H * dpr; });
    const g = actx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = INK;
    const sx = Math.max(W / 1440, 0.4), portrait = W < H;
    let rnd = 7;
    const R = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };

    // Copy stays legible: the drawing thins to a whisper around small text and buttons.
    const quiet = [".hero-kicker", ".hero-lede", ".hero-ctas", ".hero-scroll"].flatMap((q) => [...hero.querySelectorAll(q)]).map((el) => {
      const b = el.getBoundingClientRect();
      return { l: b.left - r.left - 16, t: b.top - r.top - 14, rr: b.right - r.left + 16, b: b.bottom - r.top + 14 };
    });
    // Clear inside each copy box, feathering back to full over 28px.
    const hush = (x, y) => {
      let k = 1;
      for (const q of quiet) {
        const dx = Math.max(q.l - x, 0, x - q.rr), dy = Math.max(q.t - y, 0, y - q.b), d = Math.hypot(dx, dy);
        k = Math.min(k, d === 0 ? 0 : Math.min(1, d / 28) ** 1.5);
      }
      return k;
    };

    // Composition after the study: one great peak right of centre, a steep left
    // face, a long shoulder falling to the right edge, a far range behind it and
    // forested foothills in front.
    const PX = W * (portrait ? 0.66 : 0.7), PY = H * (portrait ? 0.06 : 0.05);
    const massif = (x) => {
      const t = x < PX ? (PX - x) / (W * (portrait ? 0.55 : 0.4)) : (x - PX) / (W * 0.34);
      const fall = x < PX ? 0.66 * Math.pow(Math.min(t, 1.3), 0.82) : 0.4 * Math.pow(Math.min(t, 1.5), 0.72);
      return PY + H * fall + H * 0.03 * (ridged(x / sx / 60, 9) - 0.45) * Math.min(1, t * 3);
    };
    const far = (x) => H * (0.36 - 0.07 * ridged(x / sx / 90, 4) + 0.12 * Math.max(0, (W * 0.8 - x) / (W * 0.2)));
    const hills = (x) => H * (0.8 - 0.06 * noise(x / sx / 160, 21) - 0.04 * noise(x / sx / 50, 22));
    const LAY = [{ y: far, a: 0.55 }, { y: massif, a: 1 }, { y: hills, a: 0.95 }];
    const owner = (x, y) => { for (let i = LAY.length - 1; i >= 0; i--) if (y >= LAY[i].y(x)) return i; return -1; };

    // Aretes: from the summit and along the shoulder, falling in long diagonals.
    const ridges = [];
    const spur = (x0, lean, len, seed) => {
      let x = x0; const y0 = massif(x0) + 1, pts = [[x, y0]];
      for (let y = y0 + 3; y < y0 + len && y < H; y += 3) { x += lean * 3 + (noise(y / 26 + seed, 31 + seed) - 0.5) * 2.4; pts.push([x, y]); }
      ridges.push(pts);
    };
    spur(PX, -0.38, H * 0.7, 1); spur(PX, 0.12, H * 0.62, 2); spur(PX, 0.85, H * 0.42, 3);
    [[-0.12, -0.15, 0.4], [-0.2, -0.3, 0.3], [0.07, 0.3, 0.5], [0.13, 0.22, 0.48], [0.19, 0.35, 0.42], [0.25, 0.18, 0.36]].forEach(([dx, lean, len], k) => spur(PX + dx * W, lean, H * len, 4 + k));
    const ridgeAt = (pts, y) => { const i = Math.round((y - pts[0][1]) / 3); return i >= 0 && i < pts.length ? i : -1; };

    const marks = [], scrib = [], trees = [];
    const step = portrait ? 2 : 2.4;
    for (let gy = 0; gy < H; gy += step) for (let gx = 0; gx < W; gx += step) {
      const x = gx + R() * step, y = gy + R() * step, li = owner(x, y);
      if (li < 0) continue;
      const L = LAY[li], tp = L.y(x), depth = (y - tp) / Math.max(H - tp, 1), q = hush(x, y);
      if (li === 1) {
        let dl = 1e9, dr = 1e9, slope = 0.3, near = 1e9;
        for (const pts of ridges) {
          const i = ridgeAt(pts, y); if (i < 0) continue;
          const d = x - pts[i][0]; near = Math.min(near, Math.abs(d));
          if (d >= 0 && d < dl) { dl = d; slope = (pts[Math.min(i + 3, pts.length - 1)][0] - pts[Math.max(i - 3, 0)][0]) / 18; }
          if (d < 0 && -d < dr) dr = -d;
        }
        if (near < 2.4 || y - tp < 1.4) continue;                       // ridgelines stay bare paper
        const t = dl > 1e8 ? 0.85 : dr > 1e8 ? 0.2 : dl / (dl + dr);
        const shade = Math.min(1, (1 - t) * 0.85 + depth * 0.2);
        if (R() > (0.03 + shade * shade * 0.7) * q) continue;
        if (depth > 0.55 && R() < 0.3 + depth * 0.3) {                  // the treeline creeps up the lower slopes
          if (R() < 0.45) trees.push([x, y, 3 + R() * 4]); else scrib.push([x, y, 5 + R() * 9, L.a]);
          continue;
        }
        const ang = Math.atan2(1, slope) + (R() - 0.5) * 0.55, len = (3 + R() * (4 + shade * 8)) * Math.min(1, 0.45 + sx * 0.55);
        marks.push([x, y, ang, len, L.a * (0.55 + 0.45 * shade)]);
        if (shade > 0.72 && R() < 0.4) marks.push([x, y, ang + 1.1 + (R() - 0.5) * 0.3, len * 0.7, L.a * 0.8]);   // cross-hatch in deep shadow
      } else if (li === 0) {
        const slope = (L.y(x + 4) - L.y(x - 4)) / 8, shade = Math.max(0, Math.min(1, slope * 2 + 0.35));
        if (y - tp < 1.2 || depth > 0.5 || R() > (0.03 + shade * 0.3) * q) continue;
        marks.push([x, y, Math.atan2(1, slope * 1.4) + (R() - 0.5) * 0.4, 2 + R() * 4, L.a]);
      } else {
        const stand = noise(x / 80, 41);
        if (R() > q) continue;
        if (stand > 0.55 && R() < 0.05 + depth * 0.05) trees.push([x, y, 3 + R() * 5 + depth * 9]);
        else if (R() < 0.02) scrib.push([x, y, 6 + R() * 14, 0.8]);
      }
    }
    // Skylines as broken quick strokes, never a clean contour.
    for (const [li, gap] of [[0, 0.4], [1, 0.15], [2, 0.5]]) for (let x = 0; x < W; x += 3) {
      const y = LAY[li].y(x);
      if (R() < gap || owner(x, y - 0.5) > li || R() > hush(x, y)) continue;
      marks.push([x, y, Math.atan2(LAY[li].y(x + 4) - y, 4), 3.5, li === 0 ? 0.6 : 1]);
    }
    // Clouds: loose scribbled wisps in the open sky right of the headline.
    const clouds = [];
    for (let c = 0; c < (portrait ? 2 : 4); c++) {
      const cx = W * (portrait ? 0.2 + R() * 0.7 : 0.6 + R() * 0.38), cy = H * (0.04 + R() * 0.24), cw = W * (0.05 + R() * 0.07);
      for (let k = 0; k < 14; k++) {
        const x = cx + (R() - 0.5) * cw * 2, y = cy + (R() - 0.5) * cw * 0.35;
        if (y < massif(x) - 6 && hush(x, y) > 0.95) clouds.push([x, y, 3 + R() * 7]);
      }
    }

    g.lineWidth = 0.75;
    for (const [x, y, a, len, al] of marks) {
      g.globalAlpha = al; g.beginPath();
      const bx = Math.cos(a) * len, by = Math.sin(a) * len, w = (R() - 0.5) * 1.2;
      g.moveTo(x, y); g.quadraticCurveTo(x + bx * 0.5 - by * 0.1 * w, y + by * 0.5 + bx * 0.1 * w, x + bx, y + by); g.stroke();
    }
    g.lineWidth = 0.7;
    for (const [x, y, wd, al] of scrib) {
      g.globalAlpha = al * 0.85; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) g.lineTo(x + (k % 2 ? wd : 0) + R() * 2, y + k * 1.3);
      g.stroke();
    }
    g.globalAlpha = 0.6; g.lineWidth = 0.65;
    for (const [x, y, wd] of clouds) {
      g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + wd * 0.3, y - 2.5, x + wd * 0.6, y + 2, x + wd, y - 0.5);
      if (R() < 0.3) g.arc(x + wd + 1.5, y - 1.5, 1.6, Math.PI, Math.PI * 2.6);
      g.stroke();
    }
    g.globalAlpha = 1; g.lineWidth = 0.8;
    for (const [x, y, h] of trees) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5), y - h);
      for (let k = 1; k < 4; k++) { const ty = y - h * (k / 4), tw = h * 0.22 * (1 - k / 5); g.moveTo(x - tw, ty + tw * 0.5); g.lineTo(x, ty); g.lineTo(x + tw, ty + tw * 0.5); }
      g.stroke();
    }
    // Tall pines stand in the foreground at the right, as in the study.
    for (let i = 0; i < (portrait ? 4 : 8); i++) {
      const x = W * (0.62 + i * 0.045) + R() * 12, h = H * (0.12 + R() * 0.12), y = H + 2;
      if (hush(x, y - h * 0.5) < 0.95 || hush(x, y - h) < 0.95) continue;
      g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h);
      for (let k = 1; k < 11; k++) { const ty = y - h * (k / 11), tw = h * 0.14 * (1 - k / 12) * (0.7 + R() * 0.5); g.moveTo(x - tw, ty + tw * 0.4); g.lineTo(x, ty); g.lineTo(x + tw, ty + tw * 0.4); }
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
    draw();                                                   // re-measure once the fonts have settled the copy
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
