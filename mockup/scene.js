/**
 * MVP mockup: rocket "How MVP works" scenes.
 *
 * One launch told in three frames, drawn as hairline line art in code:
 *   01 Share your idea    - the rocket as a blueprint on graph paper
 *   02 Discuss your stage - assembled on the pad beside the gantry
 *   03 Find your track    - liftoff
 * Activating a step (hover/focus on desktop, scroll on mobile) plays that
 * frame's moment: the blueprint inks itself in, the tank fuels up and the
 * gantry swings clear, or the rocket lifts off on a spring with an exhaust
 * trail.
 *
 * The particle canvas follows the threeui-canvas-craft rAF laws: it runs only
 * while particles live, stops on hidden tabs, caps DPR at 2, and reduced
 * motion skips it (the scenes stay still frames).
 */
(function () {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ORANGE = "#fc6736";

  /* The rocket, shared by all three frames (viewBox 0 0 200 220). */
  const BODY = "M100 34 C116 52 124 78 124 108 L124 170 L76 170 L76 108 C76 78 84 52 100 34 Z";
  const NOSE = "M100 34 C110 45 117 58 120 72 L80 72 C83 58 90 45 100 34 Z";
  const FIN_L = "M76 138 L57 166 L57 182 L76 170 Z";
  const FIN_R = "M124 138 L143 166 L143 182 L124 170 Z";
  const NOZZLE = "M88 170 L84 182 L116 182 L112 170 Z";
  const rocket = (cls = "") => `
    <g class="rocket ${cls}">
      <path class="r-fin" d="${FIN_L}"/><path class="r-fin" d="${FIN_R}"/>
      <path class="r-nozzle" d="${NOZZLE}"/>
      <path class="r-body" d="${BODY}"/>
      <path class="r-nose" d="${NOSE}"/>
      <line class="r-seam" x1="76" y1="128" x2="124" y2="128"/>
      <circle class="r-window" cx="100" cy="98" r="10"/>
    </g>`;
  const ground = `<line class="ground" x1="14" y1="196" x2="186" y2="196"/>`;

  const SCENES = [
    // 01 Blueprint: dashed construction lines; lit, a solid pass inks over them.
    () => `
      <defs><pattern id="bp-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" class="bp-gridline"/></pattern></defs>
      <rect x="10" y="14" width="180" height="182" fill="url(#bp-grid)"/>
      ${ground}
      <g class="draft">
        ${[BODY, NOSE, FIN_L, FIN_R, NOZZLE].map((d) => `<path d="${d}"/>`).join("")}
        <circle cx="100" cy="98" r="10"/>
      </g>
      <g class="ink">
        ${[BODY, FIN_L, FIN_R, NOZZLE].map((d, i) => `<path d="${d}" pathLength="1" style="--d:${i * 140}ms"/>`).join("")}
        <circle cx="100" cy="98" r="10" pathLength="1" style="--d:560ms"/>
      </g>
      <path class="bp-nose" d="${NOSE}"/>
      <g class="dim">
        <line x1="160" y1="34" x2="160" y2="182"/><line x1="154" y1="34" x2="166" y2="34"/><line x1="154" y1="182" x2="166" y2="182"/>
        <text x="168" y="112" transform="rotate(90 168 112)">MVP · 0.1</text>
      </g>`,
    // 02 On the pad: gantry arm, fuel gauge, vapour.
    () => `
      ${ground}
      <g class="gantry">
        <path d="M34 196 V58 M50 196 V58 M34 58 H50"/>
        ${[70, 94, 118, 142, 166].map((y) => `<path d="M34 ${y} L50 ${y + 24} M50 ${y} L34 ${y + 24}"/>`).join("")}
        <path class="arm" d="M50 92 H76"/>
      </g>
      <path class="pad" d="M64 196 L72 184 L128 184 L136 196"/>
      ${rocket()}
      <rect class="gauge" x="94" y="114" width="12" height="44" rx="6"/>
      <rect class="fuel" x="96" y="116" width="8" height="40" rx="4"/>
      <circle class="puff" cx="78" cy="188" r="7" style="--d:0ms"/>
      <circle class="puff" cx="124" cy="189" r="6" style="--d:260ms"/>
      <circle class="puff" cx="100" cy="190" r="5" style="--d:520ms"/>`,
    // 03 Liftoff: the ship rises; flame, smoke and speed lines come up.
    () => `
      ${ground}
      <path class="pad" d="M64 196 L72 184 L128 184 L136 196"/>
      <g class="smoke">
        <circle cx="72" cy="188" r="12" style="--d:0ms"/><circle cx="128" cy="188" r="12" style="--d:80ms"/>
        <circle cx="54" cy="192" r="8" style="--d:160ms"/><circle cx="146" cy="192" r="8" style="--d:220ms"/>
      </g>
      <g class="ship">
        <path class="flame" d="M90 182 Q100 222 110 182 Z"/>
        <path class="flame flame--core" d="M95 182 Q100 204 105 182 Z"/>
        ${rocket()}
      </g>
      <g class="speed">
        <line x1="62" y1="40" x2="62" y2="96" pathLength="1"/><line x1="140" y1="56" x2="140" y2="120" pathLength="1"/><line x1="150" y1="28" x2="150" y2="70" pathLength="1"/>
      </g>`,
  ];

  /* Particles: sparks off the drawing / the pad, or an exhaust trail. */
  function burst(scene, kind) {
    if (reduced() || document.hidden) return;
    const { canvas } = scene;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = r.width / 200, sy = r.height / 220;
    const exhaust = kind === "exhaust";
    const count = exhaust ? 46 : 20;
    const ps = Array.from({ length: count }, (_, i) => {
      const a = (i * 2.399) % (Math.PI * 2);            // golden-angle spread, deterministic
      return exhaust
        ? { x: 100 * sx + Math.cos(a) * 6, y: (200 - (i % 12) * 7) * sy, vx: Math.cos(a) * 0.5, vy: 0.5 + (i % 5) * 0.18,
            r: 1.4 + (i % 4) * 0.8, life: -(i * 18), max: 700 + (i % 6) * 110, grey: i % 3 === 0 }
        : { x: (100 + Math.cos(a) * (18 + (i % 5) * 9)) * sx, y: (kind === "pad" ? 186 : 60 + Math.sin(a) * 26) * sy,
            vx: Math.cos(a) * 0.25, vy: -(0.55 + (i % 7) * 0.12), r: 1.2 + (i % 4) * 0.55, life: 0, max: 900 + (i % 6) * 120 };
    });
    let last = performance.now();
    cancelAnimationFrame(scene.raf);
    const tick = (now) => {
      const dt = Math.min(now - last, 32); last = now;
      ctx.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      for (const p of ps) {
        p.life += dt;
        if (p.life > p.max) continue;
        alive++;
        if (p.life < 0) continue;
        p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
        if (exhaust) { p.vx *= 0.99; p.r += dt * 0.004; } else p.vy *= 0.995;
        const t = p.life / p.max;
        ctx.globalAlpha = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) * (exhaust && p.grey ? 0.35 : 0.85);
        ctx.fillStyle = exhaust ? (p.grey ? "#9a958e" : t < 0.35 ? "#ffb27f" : ORANGE) : t < 0.5 ? ORANGE : "#ff9b63";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      scene.raf = alive && !document.hidden ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, r.width, r.height), 0);
    };
    scene.raf = requestAnimationFrame(tick);
  }

  function build(host, index) {
    host.innerHTML = `<svg class="scene-svg" viewBox="0 0 200 220">${SCENES[index]()}</svg><canvas class="scene-fx"></canvas>`;
    return { canvas: host.querySelector("canvas"), kind: ["spark", "pad", "exhaust"][index] };
  }

  const steps = [...document.querySelectorAll(".jstep")];
  const scenes = steps.map((li) => build(li.querySelector(".scene"), +li.dataset.step));
  const rail = [...document.querySelectorAll(".journey-rail span")];
  const setActive = (i, withFx = true) => {
    steps.forEach((li, j) => {
      const on = j === i;
      if (on && !li.classList.contains("on") && withFx) {
        // Liftoff: let the ship clear the pad before the trail starts.
        setTimeout(() => li.classList.contains("on") && burst(scenes[j], scenes[j].kind), j === 2 ? 180 : 0);
      }
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
