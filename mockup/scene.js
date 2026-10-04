/**
 * MVP mockup: "How MVP works" as one rocket, engraved in pen and ink to match
 * the hero, fuelled and flown to the moon.
 *
 *   01 Fuel up     - the hose pumps and the tank fills
 *   02 Countdown   - topped up; vapour vents once, the gantry arm swings clear
 *                    and a dial sweeps 3 / 2 / 1 / GO
 *   03 To the moon - ignition (a shake, smoke rolling off the pad), a slow
 *                    start, a cruise and a slow touchdown upright on the moon,
 *                    an ink-dash exhaust, a puff of dust, then the flag
 *
 * Line work draws itself in (stroke-dashoffset on pathLength=1) the first time
 * the section comes into view; fills wash in after. Every moment plays once
 * and settles. The flight and its exhaust share one rAF timeline that runs
 * only while needed and stops on hidden tabs (threeui-canvas-craft). Reduced
 * motion: every frame jumps to its settled state.
 */
(function () {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ORANGE = "#fc6736";
  const f = (n) => +n.toFixed(2);
  const poly = (pts, close) => "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + (close ? "Z" : "");
  const seg = (list) => list.map(([x1, y1, x2, y2]) => `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`).join("");
  // One stroked path that draws itself in; `k` picks the weight (o outline, h hatch).
  const ink = (d, k = "", extra = "") => `<path class="ink ${k}" d="${d}" pathLength="1" ${extra}/>`;
  const wash = (d, cls = "") => `<path class="wash ${cls}" d="${d}"/>`;

  /* ── The rocket, drawn nose-up in a 200 x 220 frame, placed at 80% ── */
  const noseHW = (y) => 22 * Math.sqrt(Math.max(0, 1 - ((80 - y) / 46) ** 2));
  const noseL = [], noseR = [];
  for (let y = 34; y <= 80; y += 2) { noseL.unshift([100 - noseHW(y), y]); noseR.push([100 + noseHW(y), y]); }
  const HULL = poly([[78, 160], ...noseL, ...noseR, [122, 160]], true);
  const NOSE = poly([...noseL, ...noseR], true);
  const hullHatch = seg([0.46, 0.58, 0.68, 0.76, 0.83, 0.88, 0.92, 0.955, 0.98].map((u) => {
    const x = 100 + 22 * u, top = 80 - 46 * Math.sqrt(1 - u * u) + 1.5;
    return [x, top, x, 159];
  }).concat([[100 - 22 * 0.9, 118, 100 - 22 * 0.9, 150], [100 - 22 * 0.95, 96, 100 - 22 * 0.95, 112]]));
  const finR = [[122, 126], [142, 158], [142, 174], [122, 162]], finL = finR.map(([x, y]) => [200 - x, y]);
  const finHatch = seg([125, 128, 131, 134, 137, 140].map((x) => [x, 126 + (x - 122) * 1.6 + 1, x, 162 + (x - 122) * 0.6 - 0.5]).concat([[61, 158, 61, 166], [65, 154, 65, 160]]));
  const NOZ = [[88, 160], [112, 160], [116, 172], [84, 172]];
  const rivets = [106, 140].map((y) => [82, 87, 92, 108, 113, 118].map((x) => `<circle class="wash rivet" cx="${x}" cy="${y + 2.6}" r=".7"/>`).join("")).join("");
  const rocket = (fuel) => `
    <g transform="translate(20 34) scale(0.8)">
      <g class="flame"><path d="M85 173 Q100 226 115 173 Z"/><path class="flame-core" d="M92 173 Q100 204 108 173 Z"/></g>
      <g class="rocket">
        ${wash(poly(finL, true), "paper")}${wash(poly(finR, true), "paper")}
        ${ink(poly(finL, true), "o")}${ink(poly(finR, true), "o")}${ink(finHatch, "h")}
        ${wash(poly(NOZ, true), "paper")}${ink(poly(NOZ, true), "o")}${ink(seg([[104, 161, 105, 171], [107.5, 161, 109, 171], [111, 161, 113, 171], [92, 161, 90.5, 171]]), "h")}
        ${wash(HULL, "paper")}${wash(NOSE, "spot")}
        ${ink(hullHatch, "h")}
        ${ink("M78 80H122M78 106H122M78 140H122", "d")}${rivets}
        ${ink(HULL, "o")}
        <circle class="wash paper" cx="100" cy="94" r="9"/>
        <circle class="ink o" cx="100" cy="94" r="9" pathLength="1"/><circle class="ink d" cx="100" cy="94" r="6.4" pathLength="1"/>
        ${ink(seg([[102.5, 96.5, 105.5, 92], [100.5, 99, 104.5, 93.5], [98.5, 100, 103, 94.5]]), "h")}
        ${ink("M95.2 92.5 A5 5 0 0 1 98.6 89", "d hi")}
        ${wash("M95 112h10v40h-10z", "paper")}<rect class="fuel" x="96.6" y="113.6" width="6.8" height="36.8" rx="3.4" style="--f0:${fuel[0]};--f1:${fuel[1]}"/>
        <rect class="ink d" x="95" y="112" width="10" height="40" rx="5" pathLength="1"/>
        ${ink(seg([[107, 122, 110, 122], [107, 132, 109, 132], [107, 142, 110, 142]]), "h")}
      </g>
    </g>`;

  /* ── Set pieces ── */
  const ground = () => {
    const gravel = [];
    for (let i = 0; i < 34; i++) { const x = 18 + i * 5 + ((i * 37) % 7) * 0.5, y = 199 + ((i * 53) % 5); gravel.push([x, y, x + 1.6, y]); }
    return `${ink("M14 196H186", "o")}${ink(seg(gravel), "h")}
      ${wash("M62 184H138L136 196H64Z", "paper")}
      ${ink("M60 184H140M66 184L63 196M134 184L137 196M70 184L86 196M130 184L114 196", "d")}
      ${ink(seg(Array.from({ length: 17 }, (_, i) => [66 + i * 4, 185, 66 + i * 4, 188])), "h")}`;
  };
  const gantry = (arm) => {
    const brace = [];
    for (let y = 70; y < 196; y += 14) brace.push([30, y, 46, y + 14], [46, y, 30, y + 14], [30, y, 46, y]);
    return `<g class="gantry">${ink("M30 196V64M46 196V64M26 64H50", "d")}${ink(seg(brace), "h")}
      <circle class="wash spot" cx="38" cy="58.5" r="2.2"/><circle class="ink h" cx="38" cy="58.5" r="2.2" pathLength="1"/>
      ${arm ? `<g class="arm">${ink("M46 98H81M46 103H81M46 98L51 103L56 98L61 103L66 98L71 103L76 98L81 103", "d")}</g>` : ""}</g>`;
  };
  const cloud = (cx, cy, r, d) => {
    let p = "";
    for (let i = 0; i <= 7; i++) {
      const a = Math.PI * (0.95 + i * 0.16), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.75;
      p += i ? `A${f(r * 0.42)} ${f(r * 0.42)} 0 0 1 ${f(x)} ${f(y)}` : `M${f(x)} ${f(y)}`;
    }
    return `<g class="vent" style="--d:${d}ms">${wash(p + "Z", "paper")}<path class="vent-line" d="${p}"/></g>`;
  };
  const dial = () => {
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [164 + Math.sin(a) * 19, 96 - Math.cos(a) * 19, 164 + Math.sin(a) * 21.5, 96 - Math.cos(a) * 21.5]; });
    return `<g class="dial">${ink(seg(ticks), "h")}<circle class="ink d" cx="164" cy="96" r="16" pathLength="1"/>
      <circle class="dial-arc" cx="164" cy="96" r="16" pathLength="1" transform="rotate(-90 164 96)"/>
      <text class="count" x="164" y="101" text-anchor="middle">3</text></g>`;
  };
  const MOON = { x: 160, y: 72, r: 22 };
  const moon = () => {
    const { x: cx, y: cy, r } = MOON, h1 = [], h2 = [], dots = [];
    for (let y = cy - r + 1.6; y < cy + r - 1; y += 2.1) {
      const dy = y - cy, w = Math.sqrt(r * r - dy * dy) - 0.6;
      const x1 = cx + w * Math.max(-1, Math.min(1, 0.05 - 0.75 * (dy / r)));
      if (x1 < cx + w - 1) h1.push([x1, y, cx + w, y]);
      const x2 = cx + w * Math.max(-1, Math.min(1, 0.5 - 0.6 * (dy / r)));
      if (x2 < cx + w - 1.5) h2.push([x2, y + 1, cx + w - 0.5, y - 0.4]);
    }
    for (let i = 0; i < 12; i++) { const a = 0.4 + i * 0.35, rr = r * (0.55 + 0.4 * ((i * 0.618) % 1)); dots.push(`<circle class="wash rivet" cx="${f(cx + Math.cos(a) * rr)}" cy="${f(cy + Math.sin(a) * rr)}" r=".45"/>`); }
    const crater = (x, y, rx, ry) => `${ink(`M${x - rx} ${y}A${rx} ${ry} 0 1 0 ${x + rx} ${y}A${rx} ${ry} 0 1 0 ${x - rx} ${y}`, "d")}${ink(`M${x - rx * 0.8} ${y - ry * 0.1}A${rx * 0.85} ${ry * 0.8} 0 0 1 ${x + rx * 0.5} ${y - ry * 0.75}`, "h")}`;
    return `<g class="moon"><circle class="wash paper" cx="${cx}" cy="${cy}" r="${r}"/>${ink(seg(h1), "h")}${ink(seg(h2), "h")}${dots.join("")}
      ${crater(149, 80, 3.8, 2.8)}${crater(163, 59, 2.6, 2)}${crater(172, 76, 4.2, 3.1)}
      <circle class="ink o" cx="${cx}" cy="${cy}" r="${r}" pathLength="1"/></g>`;
  };
  const stars = () => [[24, 30, 1], [58, 18, 0], [92, 40, 1], [128, 14, 0], [190, 26, 0], [118, 52, 0], [16, 74, 1], [70, 60, 0]]
    .map(([x, y, big]) => big ? ink(`M${x - 2.6} ${y}H${x + 2.6}M${x} ${y - 2.6}V${y + 2.6}`, "h") : `<circle class="wash rivet" cx="${x}" cy="${y}" r=".7"/>`).join("");

  const SCENES = [
    () => `${ground()}${gantry(false)}
      <path class="hose" d="M46 150 C60 150 62 132 81 132"/><path class="hose-in" d="M46 150 C60 150 62 132 81 132"/>
      <path class="hose-flow" d="M46 150 C60 150 62 132 81 132" pathLength="1"/>
      ${rocket([0.04, 0.4])}`,
    () => `${ground()}${gantry(true)}${rocket([0.4, 1])}${cloud(66, 92, 9, 0)}${cloud(58, 104, 7, 110)}${cloud(72, 108, 6, 200)}${dial()}`,
    () => `${stars()}${moon()}
      <g class="flag"><line x1="175" y1="56" x2="175" y2="40"/><path d="M175 40 L187 43.8 L175 47.6 Z"/></g>
      <g class="dust"><path d="M150 52 q-6 -4 -12 -2"/><path d="M166 52 q6 -4 12 -2"/></g>
      ${ground()}<g class="ship">${rocket([1, 1])}</g>`,
  ];

  /* ── Flight: ignition, then up and over onto the moon's top ── */
  const CX = 100, CY = 34 + 0.8 * 108, BASE = 0.8 * 66, END_S = 0.32;
  const P = [[CX, CY], [CX, 30], [MOON.x + 6, 6], [MOON.x - 2, MOON.y - MOON.r - BASE * END_S]];
  const bez = (t, i) => (1 - t) ** 3 * P[0][i] + 3 * (1 - t) ** 2 * t * P[1][i] + 3 * (1 - t) * t * t * P[2][i] + t ** 3 * P[3][i];
  const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);       // slow start, cruise, slow touchdown
  const pose = (u) => {
    const t = smoother(u);
    return { x: bez(t, 0), y: bez(t, 1), deg: 34 * Math.sin(Math.PI * t) ** 1.4, s: 1 - (1 - END_S) * t };
  };
  const place = (ship, { x, y, deg, s }, jx = 0) => ship.setAttribute("transform", `translate(${f(x + jx)} ${f(y)}) rotate(${f(deg)}) scale(${f(s)}) translate(${-CX} ${-CY})`);

  function fly(scene, li) {
    const ship = scene.svg.querySelector(".ship");
    if (reduced()) { place(ship, pose(1)); li.classList.add("landed"); return; }
    const { canvas } = scene, r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d"), k = r.width / 200;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Phones give each stage 2s, so the flight is tightened to land inside it.
    const quick = matchMedia("(max-width: 900px)").matches;
    const IGN = quick ? 220 : 420, DUR = quick ? 1350 : 2400, parts = [];
    const start = performance.now();
    let last = start, n = 0;
    li.classList.add("burning");
    cancelAnimationFrame(scene.raf);
    const tick = (now) => {
      const dt = Math.min(now - last, 32), el = now - start; last = now;
      const u = Math.min(Math.max((el - IGN) / DUR, 0), 1), p = pose(u);
      // Ignition: the rocket strains on the pad and smoke rolls out both ways.
      const shake = el < IGN ? Math.sin(el * 0.9) * 0.6 * (el / IGN) : u < 0.08 ? Math.sin(el * 0.9) * 0.4 * (1 - u / 0.08) : 0;
      place(ship, p, shake);
      if (el < IGN + 260) for (let j = 0; j < 2; j++, n++) {
        const side = n % 2 ? 1 : -1;
        parts.push({ smoke: true, x: (100 + side * 10) * k, y: 184 * k, vx: side * (0.5 + (n % 5) * 0.12), vy: -0.05 - (n % 3) * 0.04, r: (2 + (n % 4)) * k * 0.6, grow: 0.012, life: 0, max: 900 + (n % 5) * 120 });
      }
      if (u > 0 && u < 0.97) {
        const a = (p.deg * Math.PI) / 180, off = BASE * p.s;
        const nx = p.x - Math.sin(a) * -off * -1, ny = p.y + Math.cos(a) * off;
        for (let j = 0; j < 2; j++, n++) parts.push({ x: nx * k, y: ny * k, vx: -Math.sin(a) * 0.35 + ((n * 37) % 11 - 5) * 0.025, vy: Math.cos(a) * 0.35 + ((n * 53) % 7 - 3) * 0.02, len: (2 + (n % 3)) * (0.5 + p.s * 0.5) * k, ang: a, life: 0, max: 520 + (n % 5) * 80 });
      } else if (u >= 1 && !li.classList.contains("landed")) { li.classList.remove("burning"); li.classList.add("landed"); }
      ctx.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      for (const q of parts) {
        q.life += dt;
        if (q.life > q.max) continue;
        alive++;
        q.x += q.vx * dt * 0.06; q.y += q.vy * dt * 0.06;
        const t = q.life / q.max;
        ctx.lineCap = "round";
        if (q.smoke) {
          // Engraved smoke: open rings that swell and thin out.
          q.r += q.grow * dt * k;
          ctx.globalAlpha = (1 - t) * 0.5; ctx.strokeStyle = "#0c0c0e"; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.r, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke();
        } else {
          // Exhaust: hot near the nozzle, cooling to short ink dashes.
          ctx.globalAlpha = (1 - t) * 0.85; ctx.strokeStyle = t < 0.25 ? ORANGE : "#0c0c0e"; ctx.lineWidth = t < 0.25 ? 1.6 : 0.8;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - Math.sin(q.ang) * -q.len, q.y + Math.cos(q.ang) * q.len); ctx.stroke();
        }
      }
      scene.raf = (u < 1 || alive) && !document.hidden ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, r.width, r.height), 0);
    };
    scene.raf = requestAnimationFrame(tick);
  }

  /* ── Countdown: the dial's ring sweeps a third per beat, then GO ── */
  function countdown(scene, li) {
    const text = scene.svg.querySelector(".count"), arc = scene.svg.querySelector(".dial-arc");
    const seq = ["3", "2", "1", "GO"];
    clearTimeout(scene.timer);
    if (reduced()) { text.textContent = "GO"; text.classList.add("go"); arc.style.strokeDashoffset = "0"; return; }
    let i = 0;
    const next = () => {
      if (!li.classList.contains("on")) return;
      text.textContent = seq[i];
      text.classList.toggle("go", seq[i] === "GO");
      arc.style.strokeDashoffset = String(1 - Math.min(i + 1, 3) / 3);
      text.animate?.([{ opacity: 0, transform: "translateY(4px) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.9,.3,1.2)" });
      if (++i < seq.length) scene.timer = setTimeout(next, 560);
    };
    scene.timer = setTimeout(next, 250);
  }

  function reset(scene, li, index) {
    cancelAnimationFrame(scene.raf);
    clearTimeout(scene.timer);
    li.classList.remove("landed", "burning");
    if (index === 1) {
      const t = scene.svg.querySelector(".count"); t.textContent = "3"; t.classList.remove("go");
      scene.svg.querySelector(".dial-arc").style.strokeDashoffset = "";
    }
    if (index === 2) {
      const ship = scene.svg.querySelector(".ship");
      ship.removeAttribute("transform");
      scene.canvas.getContext("2d")?.clearRect(0, 0, scene.canvas.width, scene.canvas.height);
      if (!reduced()) ship.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" });
    }
  }

  function build(host, index) {
    host.innerHTML = `<svg class="scene-svg" viewBox="0 0 200 220">${SCENES[index]()}</svg><canvas class="scene-fx"></canvas>`;
    const svg = host.querySelector("svg");
    // Each scene draws in order, the three of them a beat apart.
    svg.querySelectorAll(".ink, .wash").forEach((el, i) => el.style.setProperty("--dl", `${index * 220 + Math.min(i * 14, 900)}ms`));
    return { svg, canvas: host.querySelector("canvas") };
  }

  const journey = document.getElementById("journey");
  const steps = [...document.querySelectorAll(".jstep")];
  const scenes = steps.map((li) => build(li.querySelector(".scene"), +li.dataset.step));
  const rail = [...document.querySelectorAll(".journey-rail span")];
  const setActive = (i) => {
    steps.forEach((li, j) => {
      const was = li.classList.contains("on"), on = j === i;
      if (on === was) return;
      li.classList.toggle("on", on);
      if (!on) return reset(scenes[j], li, j);
      if (j === 1) countdown(scenes[j], li);
      if (j === 2) fly(scenes[j], li);
    });
    rail.forEach((d, j) => d.classList.toggle("on", j <= i));
  };

  /* The engraving inks itself in the first time the section is seen. */
  if (reduced() || !("IntersectionObserver" in window)) journey.classList.add("inked");
  else new IntersectionObserver(([e], o) => { if (e.isIntersecting) { journey.classList.add("inked"); o.disconnect(); } }, { threshold: 0.25 }).observe(journey);

  const mobile = matchMedia("(max-width: 900px)");
  steps.forEach((li, i) => {
    li.addEventListener("pointerenter", () => !mobile.matches && setActive(i));
    li.addEventListener("focus", () => !mobile.matches && setActive(i));
  });
  document.querySelector(".journey-grid").addEventListener("pointerleave", () => !mobile.matches && setActive(-1));

  /* Phones: the stages sit side by side as cards. While the section is on
     screen they play one after another, 2s each, looping; a swipe takes over
     and the sequence resumes from that card a moment later. */
  const grid = document.querySelector(".journey-grid");
  const STAGE_MS = 2000;
  let cur = 0, timer = 0, inView = false, auto = false, swipeT = 0;
  const show = (i, smooth = true) => {
    cur = (i + steps.length) % steps.length;
    auto = true;
    grid.scrollTo({ left: steps[cur].offsetLeft - grid.offsetLeft - parseFloat(getComputedStyle(grid).paddingLeft), behavior: smooth && !reduced() ? "smooth" : "auto" });
    setActive(cur);
    setTimeout(() => (auto = false), 600);
  };
  const play = () => {
    clearTimeout(timer);
    if (!mobile.matches || !inView || document.hidden || reduced()) return;
    timer = setTimeout(() => { show(cur + 1); play(); }, STAGE_MS);
  };
  grid.addEventListener("scroll", () => {
    if (!mobile.matches || auto) return;
    clearTimeout(timer); clearTimeout(swipeT);
    swipeT = setTimeout(() => {
      const i = Math.round(grid.scrollLeft / (steps[1].offsetLeft - steps[0].offsetLeft));
      cur = Math.max(0, Math.min(steps.length - 1, i)); setActive(cur); play();
    }, 160);
  }, { passive: true });
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (!mobile.matches) return;
    if (inView) { show(cur, false); play(); } else { clearTimeout(timer); }
  }, { threshold: 0.45 }).observe(grid);
  mobile.addEventListener("change", () => { clearTimeout(timer); setActive(-1); if (mobile.matches && inView) { show(0, false); play(); } });
  document.addEventListener("visibilitychange", () => document.hidden && scenes.forEach((s) => cancelAnimationFrame(s.raf)));
  document.addEventListener("visibilitychange", () => (document.hidden ? clearTimeout(timer) : play()));
  if (mobile.matches && reduced()) setActive(0);
})();
