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
    for (let o = 0; o < 5; o++) { sum += a * (1 - Math.abs(noise(x * f, s + o) * 2 - 1)) ** 2; norm += a; a *= 0.5; f *= 2.07; }
    return sum / norm;
  };

  /* Drawing (CSS pixels; the offscreen canvas carries the DPR). */
  const art = document.createElement("canvas"), actx = art.getContext("2d");
  let W = 0, H = 0, dpr = 1, frags = [];
  const INK = "#0c0c0e";
  const LAYERS = [
    { base: 0.5, amp: 0.46, freq: 1 / 330, seed: 3, a: 0.32, lw: 0.6, step: 7 },
    { base: 0.6, amp: 0.48, freq: 1 / 270, seed: 7, a: 0.46, lw: 0.7, step: 6 },
    { base: 0.7, amp: 0.5, freq: 1 / 220, seed: 11, a: 0.62, lw: 0.85, step: 5 },
    { base: 0.8, amp: 0.46, freq: 1 / 190, seed: 17, a: 0.8, lw: 1, step: 4.2 },
    { base: 0.95, amp: 0.36, freq: 1 / 160, seed: 23, a: 1, lw: 1.2, step: 3.6 },
  ];
  const draw = () => {
    const r = cv.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(devicePixelRatio || 1, 2);
    if (!W || !H) return;
    [cv, art].forEach((c) => { c.width = W * dpr; c.height = H * dpr; });
    const g = actx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = INK;
    const scaleX = Math.max(W / 1440, 0.55);
    LAYERS.forEach((L, li) => {
      const ys = [];
      // A massif right of centre, foothills toward the edges, so the range has a subject.
      for (let x = -2; x <= W + 2; x += 2) {
        const env = 0.55 + 0.55 * Math.exp(-((((x / W) - 0.64) / (0.2 + li * 0.05)) ** 2)) + 0.2 * noise((x / scaleX) / 900, L.seed + 5);
        ys.push(H * (L.base - L.amp * env * ridged((x / scaleX) * L.freq + li * 9.3, L.seed)));
      }
      const Y = (x) => ys[Math.max(0, Math.min(ys.length - 1, Math.round((x + 2) / 2)))];
      // Erase whatever this range hides.
      g.globalCompositeOperation = "destination-out";
      g.beginPath(); g.moveTo(-2, H + 2);
      ys.forEach((y, i) => g.lineTo(i * 2 - 2, y));
      g.lineTo(W + 2, H + 2); g.closePath(); g.fill();
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = L.a;
      // Ridge line.
      g.lineWidth = L.lw * 1.25; g.beginPath(); ys.forEach((y, i) => (i ? g.lineTo(i * 2 - 2, y) : g.moveTo(-2, y))); g.stroke();
      // Fall-line hatching: fine, close and longer on the shadow face, sparse
      // ticks in the light; each stroke leans with its slope and tapers off.
      g.lineWidth = L.lw * 0.8;
      for (let x = 0; x < W; x += L.step * 0.38) {
        const y = Y(x), slope = (Y(x + 6) - Y(x - 6)) / 12, shade = Math.max(0, Math.min(1, slope * 1.4 + 0.1));
        const h = hash(x * 0.37 + li * 101);
        if (shade < 0.15 ? h > 0.18 : h > 0.45 + shade) continue;
        const len = Math.min((H - y) * 0.6, H * (0.025 + 0.12 * shade) * (0.6 + 0.8 * h));
        const dx = Math.max(-0.45, Math.min(0.45, slope * 0.55));
        g.beginPath(); g.moveTo(x, y + 1.2);
        g.quadraticCurveTo(x + dx * len * 0.5, y + len * 0.6, x + dx * len * 0.8, y + len); g.stroke();
        // Deep shadow gets a cross-hatch, laid across the fall line.
        if (shade > 0.6 && h < 0.5) {
          const cy = y + len * (0.3 + 0.4 * h), cl = len * 0.35;
          g.beginPath(); g.moveTo(x - cl * 0.5, cy - cl * 0.25); g.lineTo(x + cl * 0.5, cy + cl * 0.25); g.stroke();
        }
      }
      // Strata: broken contours following the ridge, only where it falls away.
      for (let k = 1; k <= 3; k++) {
        const off = k * k * 6 + 6;
        g.beginPath(); let pen = false;
        for (let x = 0; x < W; x += 3) {
          const slope = (Y(x + 4) - Y(x - 4)) / 8, on = slope > 0.12 && hash(Math.floor(x / 26) + k * 31 + li * 7) > 0.3;
          const y = Y(x) + off * (1 + slope * 0.6);
          if (on && y < H) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false;
        }
        g.stroke();
      }
    });
    // Pines along the base: erase a silhouette, then branch strokes.
    g.globalAlpha = 1;
    for (let i = 0; i < W / 14; i++) {
      // Pines grow in stands: density and height follow a slow noise.
      const x = (i + hash(i * 3.1)) * 14, stand = noise(x / 160, 77);
      if (hash(i * 9.3) > stand * 1.4) continue;
      const th = H * (0.05 + 0.13 * stand * (0.5 + hash(i * 7.7))), yb = H + 2 - hash(i * 2.2) * 6;
      g.globalCompositeOperation = "destination-out";
      g.beginPath(); g.moveTo(x, yb - th); g.lineTo(x - th * 0.28, yb); g.lineTo(x + th * 0.28, yb); g.closePath(); g.fill();
      g.globalCompositeOperation = "source-over";
      g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, yb - th); g.lineTo(x, yb);
      for (let b = 0; b < 7; b++) {
        const t = (b + 1) / 8, by = yb - th + th * t, bw = th * 0.28 * t;
        g.moveTo(x - bw, by + th * 0.06); g.lineTo(x, by); g.lineTo(x + bw, by + th * 0.06);
      }
      g.stroke();
    }
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
