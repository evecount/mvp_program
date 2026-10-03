/**
 * MVP mockup: "How MVP works" as one rocket, fuelled and flown to the moon.
 *
 *   01 Fuel up     - on the pad, tank empty; lit, the hose flows and it fills
 *   02 Countdown   - lit, the tank tops up, the gantry arm swings clear, the
 *                    tank vents once and a T-3 / T-2 / T-1 / GO count runs
 *   03 To the moon - lit, the rocket lifts off and flies up and over to the
 *                    moon, shrinking into the distance with an exhaust trail,
 *                    and touches down upright; a flag goes up on arrival
 *
 * Every moment plays once and settles; nothing loops or grows while it sits.
 * The flight and its exhaust share one rAF timeline (threeui-canvas-craft
 * laws): it runs only while flying or while particles live, stops on hidden
 * tabs, caps DPR at 2. Reduced motion jumps each frame to its settled state.
 */
(function () {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ORANGE = "#fc6736";

  /* The rocket (drawn at 0 0 200 220, then placed at 80% scale on the pad). */
  const BODY = "M100 34 C116 52 124 78 124 108 L124 170 L76 170 L76 108 C76 78 84 52 100 34 Z";
  const NOSE = "M100 34 C110 45 117 58 120 72 L80 72 C83 58 90 45 100 34 Z";
  const rocket = (fuel) => `
    <g transform="translate(20 34) scale(0.8)">
      <path class="flame" d="M88 182 Q100 226 112 182 Z"/>
      <path class="flame flame--core" d="M94 182 Q100 206 106 182 Z"/>
      <g class="rocket">
        <path class="r-fin" d="M76 138 L57 166 L57 182 L76 170 Z"/><path class="r-fin" d="M124 138 L143 166 L143 182 L124 170 Z"/>
        <path class="r-nozzle" d="M88 170 L84 182 L116 182 L112 170 Z"/>
        <path class="r-body" d="${BODY}"/>
        <path class="r-nose" d="${NOSE}"/>
        <line class="r-seam" x1="76" y1="128" x2="124" y2="128"/>
        <circle class="r-window" cx="100" cy="98" r="10"/>
        <rect class="gauge" x="94" y="112" width="12" height="46" rx="6"/>
        <rect class="fuel" x="96" y="114" width="8" height="42" rx="4" style="--f0:${fuel[0]};--f1:${fuel[1]}"/>
      </g>
    </g>`;
  const ground = `<line class="ground" x1="14" y1="196" x2="186" y2="196"/><path class="pad" d="M66 196 L73 186 L127 186 L134 196"/>`;
  const gantry = (arm) => `
    <g class="gantry">
      <path d="M30 196 V64 M46 196 V64 M30 64 H46"/>
      ${[76, 100, 124, 148, 172].map((y) => `<path d="M30 ${y} L46 ${y + 24} M46 ${y} L30 ${y + 24}"/>`).join("")}
      ${arm ? `<path class="arm" d="M46 104 H81"/>` : ""}
    </g>`;
  const stars = [[24, 30], [58, 18], [92, 40], [128, 14], [190, 30], [124, 52], [16, 74]]
    .map(([x, y], i) => `<circle class="star" cx="${x}" cy="${y}" r="${i % 3 ? 0.9 : 1.4}"/>`).join("");
  const MOON = { x: 160, y: 72, r: 22 };

  const SCENES = [
    () => `${ground}${gantry(false)}
      <path class="hose" d="M46 150 C60 150 62 132 81 132" pathLength="1"/>
      <path class="hose-flow" d="M46 150 C60 150 62 132 81 132" pathLength="1"/>
      ${rocket([0.04, 0.4])}`,
    () => `${ground}${gantry(true)}
      ${rocket([0.4, 1])}
      <circle class="vent" cx="66" cy="96" r="7"/><circle class="vent" cx="62" cy="104" r="5" style="--d:90ms"/>
      <text class="count" x="166" y="120" text-anchor="middle">T-3</text>`,
    () => `${stars}
      <g class="moon"><circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}"/><circle class="crater" cx="152" cy="68" r="4"/><circle class="crater" cx="167" cy="82" r="3"/><circle class="crater" cx="170" cy="64" r="2"/></g>
      <g class="flag"><line x1="175" y1="56" x2="175" y2="41"/><path d="M175 41 L186 44.5 L175 48 Z"/></g>
      ${ground}
      <g class="ship">${rocket([1, 1])}</g>`,
  ];

  /* Flight: a cubic from the pad, up and over, down onto the moon's top.
     The ship leans into the transfer and rights itself to touch down. */
  const CX = 100, CY = 34 + 0.8 * 108;                         // rocket centre on the pad
  const BASE = 0.8 * 62, END_S = 0.32;                          // centre-to-nozzle, landed scale
  const P = [[CX, CY], [CX, 34], [MOON.x + 4, 12], [MOON.x - 2, MOON.y - MOON.r - BASE * END_S]];
  const bez = (t, i) => (1 - t) ** 3 * P[0][i] + 3 * (1 - t) ** 2 * t * P[1][i] + 3 * (1 - t) * t * t * P[2][i] + t ** 3 * P[3][i];
    const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (2 - 2 * u) ** 2 / 2);
  const pose = (u) => {
    const t = ease(u), x = bez(t, 0), y = bez(t, 1);
    const deg = 38 * Math.sin(Math.PI * t) ** 1.5;
    const s = 1 - (1 - END_S) * t;
    return { x, y, deg, s };
  };
  const place = (ship, { x, y, deg, s }) => ship.setAttribute("transform", `translate(${x} ${y}) rotate(${deg}) scale(${s}) translate(${-CX} ${-CY})`);

  function fly(scene, li) {
    const ship = scene.svg.querySelector(".ship");
    if (reduced()) { place(ship, pose(1)); li.classList.add("landed"); return; }
    const { canvas } = scene;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = r.width / 200;
    const DUR = 2600, parts = [];
    const start = performance.now();
    let last = start, n = 0;
    cancelAnimationFrame(scene.raf);
    const tick = (now) => {
      const dt = Math.min(now - last, 32); last = now;
      const u = Math.min((now - start) / DUR, 1);
      const p = pose(u);
      place(ship, p);
      if (u < 1) {
        // Nozzle sits below centre, turned and shrunk with the ship.
        const a = (p.deg * Math.PI) / 180, off = BASE * p.s;
        const nx = p.x - Math.sin(a) * off, ny = p.y + Math.cos(a) * off;
        for (let j = 0; j < 2; j++, n++) parts.push({ x: nx * k, y: ny * k, vx: -Math.sin(a) * 0.4 + ((n * 37) % 11 - 5) * 0.03, vy: Math.cos(a) * 0.4 + ((n * 53) % 7 - 3) * 0.02, r: (1 + (n % 4) * 0.5) * (0.5 + p.s * 0.5), life: 0, max: 600 + (n % 5) * 90, grey: n % 4 === 0 });
      } else if (!li.classList.contains("landed")) li.classList.add("landed");
      ctx.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      for (const q of parts) {
        q.life += dt;
        if (q.life > q.max) continue;
        alive++;
        q.x += q.vx * dt * 0.06; q.y += q.vy * dt * 0.06;
        const t = q.life / q.max;
        ctx.globalAlpha = (1 - t) * (q.grey ? 0.35 : 0.85);
        ctx.fillStyle = q.grey ? "#9a958e" : t < 0.3 ? "#ffc29e" : ORANGE;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      }
      scene.raf = (u < 1 || alive) && !document.hidden ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, r.width, r.height), 0);
    };
    scene.raf = requestAnimationFrame(tick);
  }

  function countdown(scene, li) {
    const text = scene.svg.querySelector(".count");
    const seq = ["T-3", "T-2", "T-1", "GO"];
    clearTimeout(scene.timer);
    if (reduced()) { text.textContent = "GO"; return; }
    let i = 0;
    const next = () => {
      if (!li.classList.contains("on")) return;
      text.textContent = seq[i];
      text.classList.toggle("go", seq[i] === "GO");
      text.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      if (++i < seq.length) scene.timer = setTimeout(next, 520);
    };
    next();
  }

  function reset(scene, li, index) {
    cancelAnimationFrame(scene.raf);
    clearTimeout(scene.timer);
    li.classList.remove("landed");
    if (index === 1) { const t = scene.svg.querySelector(".count"); t.textContent = "T-3"; t.classList.remove("go"); }
    if (index === 2) {
      const ship = scene.svg.querySelector(".ship");
      ship.removeAttribute("transform");
      scene.canvas.getContext("2d")?.clearRect(0, 0, scene.canvas.width, scene.canvas.height);
      if (!reduced()) ship.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    }
  }

  function build(host, index) {
    host.innerHTML = `<svg class="scene-svg" viewBox="0 0 200 220">${SCENES[index]()}</svg><canvas class="scene-fx"></canvas>`;
    return { svg: host.querySelector("svg"), canvas: host.querySelector("canvas") };
  }

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
    setActive(r.top > innerHeight * 0.4 ? -1 : Math.floor(p * steps.length));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  mobile.addEventListener("change", () => { setActive(-1); onScroll(); });
  document.addEventListener("visibilitychange", () => document.hidden && scenes.forEach((s) => cancelAnimationFrame(s.raf)));
  onScroll();
})();
