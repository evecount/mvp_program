/**
 * MVP mockup: isometric "How MVP works" scenes.
 *
 * Our own take on Hexa's Start/Sprint/Scale illustrations: each step is an
 * isometric 3x3 plot of stacked cubes that gets fuller as the steps progress.
 * Activating a step (hover or focus on desktop, scroll position on mobile)
 * drops in the extra cubes on a spring, lights the tops orange, and releases a
 * short burst of orange motes.
 *
 * Particle canvas follows the threeui-canvas-craft rAF laws: the loop runs only
 * while motes are alive, stops when the tab is hidden, caps DPR at 2 (focal),
 * and reduced motion skips it entirely (the scene itself stays as a still frame).
 */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* heights[y][x]: base = at rest, active = when the step is lit. */
  const SCENES = [
    { base: [[0, 0, 0], [0, 2, 0], [1, 0, 0]], active: [[1, 0, 0], [0, 3, 1], [1, 0, 1]] },
    { base: [[1, 2, 0], [0, 3, 1], [1, 1, 2]], active: [[2, 2, 1], [1, 3, 2], [1, 2, 2]] },
    { base: [[2, 3, 2], [3, 3, 2], [2, 2, 3]], active: [[3, 3, 3], [3, 3, 3], [3, 3, 3]] },
  ];
  const N = 3, H = 3, S = 30;                    // grid, max height, cube edge (px)
  const C = Math.cos(Math.PI / 6), Sn = 0.5;
  const ox = N * S * C + 2, oy = H * S + 2;      // origin so the scene fits the box
  const iso = (x, y, z) => [ox + (x - y) * S * C, oy + (x + y) * S * Sn - z * S];
  const pts = (list) => list.map((p) => iso(...p).map((v) => v.toFixed(1)).join(",")).join(" ");
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const W = Math.round(2 * N * S * C + 4), Ht = Math.round(H * S + N * S + 4);

  function defs(svg, id) {
    const d = el("defs", {});
    const hatch = el("pattern", { id: `hatch-${id}`, width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-55)" });
    hatch.append(el("rect", { width: 5, height: 5, fill: "#fff" }), el("line", { x1: 0, y1: 0, x2: 0, y2: 5, stroke: "#cfcac3", "stroke-width": 1.2 }));
    const grad = (gid, a, b, x2 = 0, y2 = 1) => {
      const g = el("linearGradient", { id: `${gid}-${id}`, x1: 0, y1: 0, x2, y2 });
      g.append(el("stop", { offset: 0, "stop-color": a }), el("stop", { offset: 1, "stop-color": b }));
      return g;
    };
    d.append(hatch, grad("top", "#ffc29e", "#fc6736", 1, 1), grad("left", "#fc6736", "#c2410c"), grad("right", "#ff8a55", "#e2431a"));
    svg.append(d);
  }

  function frame(svg) {
    const g = el("g", { class: "iso-frame" });
    for (let i = 0; i <= N; i++) {
      g.append(el("polyline", { points: pts([[i, 0, 0], [i, N, 0]]) }));
      g.append(el("polyline", { points: pts([[0, i, 0], [N, i, 0]]) }));
    }
    g.append(el("polyline", { points: pts([[0, 0, 0], [0, 0, H]]) }));
    g.append(el("polygon", { points: pts([[0, 0, H], [N, 0, H], [N, 0, 0], [N, N, 0], [0, N, 0], [0, N, H]]) }));
    svg.append(g);
  }

  function cube(x, y, z, id, extra, lit) {
    const g = el("g", { class: `cube${extra ? " extra" : ""}${lit ? " lit" : ""}` });
    const top = pts([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]);
    const left = pts([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]);
    const right = pts([[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]]);
    g.append(
      el("polygon", { points: left, fill: `url(#hatch-${id})`, class: "f" }),
      el("polygon", { points: right, fill: "#fbfaf8", class: "f" }),
      el("polygon", { points: top, fill: "#ffffff", class: "f" }),
    );
    if (lit) {
      const o = el("g", { class: "glow" });
      o.append(
        el("polygon", { points: left, fill: `url(#left-${id})` }),
        el("polygon", { points: right, fill: `url(#right-${id})` }),
        el("polygon", { points: top, fill: `url(#top-${id})` }),
      );
      g.append(o);
    }
    return g;
  }

  function build(host, index) {
    const id = `s${index}`;
    const { base, active } = SCENES[index];
    const svg = el("svg", { viewBox: `0 0 ${W} ${Ht}`, class: "iso-svg" });
    defs(svg, id);
    frame(svg);
    const list = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const b = base[y][x], a = active[y][x];
      for (let z = 0; z < a; z++) {
        const top = z === a - 1;
        list.push({ x, y, z, extra: z >= b, lit: top && (x + y + index) % 2 === 0 });
      }
    }
    // Painter's order: far cells first, lower cubes first.
    list.sort((p, q) => p.x + p.y - (q.x + q.y) || p.z - q.z || p.x - q.x);
    let k = 0;
    for (const c of list) {
      const g = cube(c.x, c.y, c.z, id, c.extra, c.lit);
      g.style.setProperty("--d", `${(c.extra ? k++ : 0) * 55}ms`);
      svg.append(g);
    }
    host.append(svg);
    const canvas = document.createElement("canvas");
    canvas.className = "iso-fx";
    host.append(canvas);
    return { svg, canvas, top: iso(N / 2, N / 2, H) };
  }

  /* Orange motes rising off the scene; the loop ends when the last one does. */
  function burst(scene) {
    if (reduced() || document.hidden) return;
    const { canvas } = scene;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = r.width / W, sy = r.height / Ht;
    const motes = Array.from({ length: 22 }, (_, i) => {
      const a = (i * 2.399) % (Math.PI * 2);             // golden-angle spread, deterministic
      return {
        x: (scene.top[0] + Math.cos(a) * (12 + (i % 5) * 9)) * sx,
        y: (scene.top[1] + 40 + Math.sin(a) * 10) * sy,
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
        ctx.fillStyle = t < 0.5 ? "#fc6736" : "#ff9b63";
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
