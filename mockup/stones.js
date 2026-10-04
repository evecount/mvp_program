/**
 * MVP mockup: three stepping stones in still water, engraved like the hero's
 * mountains, rising from bottom left to top right beside the statement.
 *
 * Each stone is a flat river rock: an irregular top face with contour shading
 * on its shadow side, a hatched side band, a crack or two and a broken
 * waterline, set in engraved water (broken horizontal strokes that thicken near
 * the stones). Hovering a stone lifts it a touch, tightens its shadow and sends
 * one ripple across the water; leaving settles it. The line work inks itself in
 * the first time the section is seen. Deterministic; no animation loop.
 */
(function () {
  const host = document.querySelector(".stones");
  if (!host) return;
  const f = (n) => +n.toFixed(2);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ink = (d, k = "") => `<path class="ink ${k}" d="${d}" pathLength="1"/>`;
  const W = 520, H = 420;

  // Back to front: furthest (smallest) top right, nearest bottom left.
  const STONES = [
    { x: 418, y: 116, rx: 50, ry: 17, t: 15, seed: 3 },
    { x: 282, y: 222, rx: 64, ry: 22, t: 20, seed: 7 },
    { x: 128, y: 328, rx: 82, ry: 28, t: 26, seed: 11 },
  ];
  // An irregular rim: an ellipse pushed in and out by a few low harmonics.
  const rim = (s, a) => {
    const k = 1 + 0.07 * Math.sin(a * 2 + s.seed) + 0.05 * Math.sin(a * 3 + s.seed * 1.7) + 0.03 * Math.sin(a * 5 + s.seed * 0.3);
    return [s.x + Math.cos(a) * s.rx * k, s.y + Math.sin(a) * s.ry * k];
  };
  const loop = (s, dy = 0, grow = 1) => {
    let d = "";
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, [x, y] = rim(s, a); d += (i ? "L" : "M") + f(s.x + (x - s.x) * grow) + " " + f(s.y + (y - s.y) * grow + dy); }
    return d + "Z";
  };

  const stone = (s, i) => {
    const front = [], back = [];
    for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI, [x, y] = rim(s, a); front.push([x, y]); }
    // Side band: the front half of the rim dropped by the stone's thickness.
    const side = "M" + front.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "L" + front.slice().reverse().map(([x, y]) => `${f(x)} ${f(y + s.t)}`).join("L") + "Z";
    const sideHatch = [];
    // The side bulges like a boulder's flank; hatching is irregular, slants
    // with the curve and is dense on the shadow (right) side, sparse in light.
    for (let k = 1; k < 64; k++) {
      const a = (k / 64) * Math.PI, [x, y] = rim(s, a), shade = 0.25 + 0.75 * (1 - k / 64);
      if (hash(k * 1.7 + s.seed) > shade + 0.1) continue;
      const len = s.t * (0.35 + 0.6 * shade) * (0.7 + 0.5 * hash(k + s.seed * 2)), lean = Math.cos(a) * 2.2;
      sideHatch.push(`M${f(x)} ${f(y + 1.2)}Q${f(x + lean * 0.4)} ${f(y + len * 0.5)} ${f(x + lean)} ${f(y + len)}`);
      if (shade > 0.75 && hash(k * 3.1 + s.seed) < 0.35) sideHatch.push(`M${f(x - 2)} ${f(y + len * 0.45)}l${f(4)} ${f(1.5)}`);
    }
    // A stratum line across the flank and stipple where it turns into shadow.
    let strat = "";
    for (let k = 2; k < 30; k++) { const [x, y] = front[k]; strat += (k === 2 ? "M" : "L") + f(x) + " " + f(y + s.t * (0.5 + 0.12 * Math.sin(k * 0.7 + s.seed))); }
    sideHatch.push(strat);
    for (let k = 0; k < 14; k++) {
      const a = -0.2 + hash(k + s.seed * 5) * 1.3, g = 0.7 + hash(k * 2 + s.seed) * 0.25, [x, y] = rim(s, a);
      sideHatch.push(`M${f(s.x + (x - s.x) * g)} ${f(s.y + (y - s.y) * g)}h.6`);
    }
    // Contour shading on the top face, stronger to the lower right.
    const contours = [];
    for (let c = 1; c <= 3; c++) {
      const g = 1 - c * 0.17;
      let d = "", pen = false;
      for (let k = 0; k <= 48; k++) {
        const a = -0.6 + (k / 48) * 2.2, [x, y] = rim(s, a);
        const px = s.x + (x - s.x) * g, py = s.y + (y - s.y) * g;
        const on = hash(Math.floor(k / 6) + c * 13 + s.seed) > 0.25;
        if (on) { d += (pen ? "L" : "M") + f(px) + " " + f(py); pen = true; } else pen = false;
      }
      contours.push(d);
    }
    const crack = (() => {
      let x = s.x - s.rx * 0.2 + hash(s.seed) * s.rx * 0.3, y = s.y - s.ry * 0.35, d = `M${f(x)} ${f(y)}`;
      for (let k = 0; k < 4; k++) { x += s.rx * 0.08 + hash(s.seed + k) * s.rx * 0.06; y += s.ry * 0.18 * (hash(s.seed * 3 + k) - 0.2); d += `L${f(x)} ${f(y)}`; }
      return d;
    })();
    const waterline = (() => {
      let d = "";
      for (let k = 0; k < 7; k++) {
        const a0 = 0.15 + k * 0.42, a1 = a0 + 0.26, p0 = rim(s, a0), p1 = rim(s, a1);
        d += `M${f(s.x + (p0[0] - s.x) * 1.14)} ${f(s.y + (p0[1] - s.y) * 1.14 + s.t + 2)}L${f(s.x + (p1[0] - s.x) * 1.14)} ${f(s.y + (p1[1] - s.y) * 1.14 + s.t + 2)}`;
      }
      return d;
    })();
    return `<g class="stone" style="--i:${i}">
      <path class="stone-shadow" d="${loop(s, s.t + 4, 1.08)}"/>
      <ellipse class="ripple" cx="${s.x}" cy="${s.y + s.t + 2}" rx="${f(s.rx * 1.25)}" ry="${f(s.ry * 1.25)}" pathLength="1"/>
      <ellipse class="ripple ripple--2" cx="${s.x}" cy="${s.y + s.t + 2}" rx="${f(s.rx * 1.25)}" ry="${f(s.ry * 1.25)}" pathLength="1"/>
      <g class="stone-body">
        <path class="wash" d="${side}"/><path class="wash" d="${loop(s)}"/>
        ${ink(side, "o")}${ink(sideHatch.join(""), "h")}
        ${ink(loop(s), "o")}${ink(contours.join(""), "h")}${ink(crack, "h")}
      </g>
      ${ink(waterline, "h")}
      <ellipse class="stone-hit" cx="${s.x}" cy="${s.y + s.t / 2}" rx="${s.rx * 1.1}" ry="${s.ry * 1.6 + s.t}"/>
    </g>`;
  };

  // Engraved water: broken horizontal strokes, denser and longer near stones,
  // stepping clear of each stone's footprint.
  const water = (() => {
    let d = "";
    for (let y = 60; y < H - 8; y += 7) {
      for (let x = 10 + hash(y) * 30; x < W - 10;) {
        const near = Math.max(...STONES.map((s) => Math.exp(-(((x - s.x) / (s.rx * 2.2)) ** 2 + ((y - s.y - s.t) / (s.ry * 4)) ** 2))));
        const len = 6 + 22 * near + hash(x * 0.3 + y) * 18;
        const inside = STONES.some((s) => ((x + len / 2 - s.x) / (s.rx * 1.18)) ** 2 + ((y - s.y - s.t / 2) / (s.ry * 1.25 + s.t * 0.6)) ** 2 < 1);
        // Keep the upper left calm: the water fades out toward the text.
        const keep = hash(x * 1.7 + y * 0.9) < 0.25 + 0.75 * near && !inside && (x / W + (H - y) / H) < 1.55;
        if (keep) d += `M${f(x)} ${f(y + (hash(x + y) - 0.5) * 1.2)}h${f(len)}`;
        x += len + 8 + hash(y * 2.3 + x) * 26;
      }
    }
    return d;
  })();

  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${ink(water, "h water")}${STONES.map(stone).join("")}</svg>`;
  host.querySelectorAll(".ink, .wash").forEach((el, i) => el.style.setProperty("--dl", `${Math.min(i * 40, 1100)}ms`));

  const sec = host.closest("section");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) sec.classList.add("inked");
  else new IntersectionObserver(([e], o) => { if (e.isIntersecting) { sec.classList.add("inked"); o.disconnect(); } }, { threshold: 0.3 }).observe(sec);

  // A stone answers the pointer: lift + one ripple; restarting the ripple on each entry.
  host.querySelectorAll(".stone").forEach((g) => {
    g.addEventListener("pointerenter", () => { g.classList.remove("stepped"); void g.getBoundingClientRect(); g.classList.add("stepped", "hover"); });
    g.addEventListener("pointerleave", () => g.classList.remove("hover"));
  });

  // Easter egg: tap the furthest stone ten times (no more than 2s between
  // taps) and a checkered flag on a pole rises out of it: you made it across.
  const far = host.querySelector(".stone"), s = STONES[0], top = 34, fx = s.x + 0.6, fy = top + 2, SQ = 4;
  let checks = "";
  for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) checks += `M${f(fx + c * SQ)} ${f(fy + r * SQ)}h${SQ}v${SQ}h-${SQ}Z`;
  far.querySelector(".stone-body").insertAdjacentHTML("beforeend", `
    <clipPath id="egg-clip"><rect x="${s.x - 40}" y="-40" width="120" height="${s.y + 42}"/></clipPath>
    <g class="egg" clip-path="url(#egg-clip)"><g class="egg-rise">
      <path class="egg-pole" d="M${s.x} ${s.y + 2}V${top}"/><circle class="egg-knob" cx="${s.x}" cy="${top - 1.6}" r="1.8"/>
      <g class="egg-flag"><rect class="egg-cloth" x="${fx}" y="${fy}" width="${8 * SQ}" height="${5 * SQ}"/><path class="egg-checks" d="${checks}"/></g>
    </g></g>`);
  let taps = 0, last = 0;
  far.addEventListener("click", () => {
    if (far.classList.contains("won")) return;
    const now = performance.now();
    taps = now - last < 2000 ? taps + 1 : 1; last = now;
    if (taps >= 10) far.classList.add("won");
  });
})();
