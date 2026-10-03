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
  /* The drawing itself: a ballpoint study lifted off its lined paper and re-inked
     in black (assets/art/range-study.png). Placed right of centre so the summit
     sits just behind the end of the headline and the sky stays under the header. */
  const study = new Image();
  study.src = "../assets/art/range-study.png";
  const ready = study.decode().catch(() => null);
  const draw = () => {
    const nav = document.getElementById("nav"), hr = hero.getBoundingClientRect();
    const top = Math.max(0, Math.round((nav ? nav.getBoundingClientRect().bottom - hr.top : 0) + 8));
    cv.style.top = `${top}px`; cv.style.height = `${hr.height - top}px`;
    const r = cv.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); dpr = Math.min(devicePixelRatio || 1, 2);
    if (!W || !H || !study.naturalWidth) return;
    [cv, art].forEach((c) => { c.width = W * dpr; c.height = H * dpr; });
    const g = actx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const ar = study.naturalWidth / study.naturalHeight, portrait = W < H;
    let dh = H * 1.04, dw = dh * ar;
    if (portrait) { dw = W * 1.35; dh = dw / ar; }
    const dx = portrait ? W - dw * 0.86 : Math.max(W - dw + W * 0.04, W * 0.34), dy = portrait ? H * 0.02 : 0;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(study, dx, dy, dw, dh);
    // Copy stays legible: feathered clearings around the small text and buttons.
    g.globalCompositeOperation = "destination-out";
    g.filter = "blur(14px)";
    [".hero-kicker", ".hero-lede", ".hero-ctas", ".hero-scroll", ...(portrait ? [".hero-title"] : [])].forEach((q) => hero.querySelectorAll(q).forEach((el) => {
      const b = el.getBoundingClientRect();
      g.fillRect(b.left - r.left - 18, b.top - r.top - 16, b.width + 36, b.height + 32);
    }));
    g.filter = "none"; g.globalCompositeOperation = "source-over";
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

  ready.then(() => {
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
  });
})();
