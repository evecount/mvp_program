/**
 * MVP mockup hero intro (first visit per tab session; ?intro replays it).
 *
 * A hand built only from lines of the program's own words tosses a paper
 * plane, then dissolves; the headline streams out of the plane's tail like a
 * trail, letter by letter, and each letter springs into its place. Scroll,
 * click or a key skips straight to the finished hero.
 *
 * A WebGL fragment shader ray-marches two signed-distance shapes (an open
 * hand and a folded dart) and, wherever a ray lands, prints a glyph instead of
 * shading a surface: the hand is sliced into rings that wrap its fingers, the
 * plane into lines that run along its folds like print on a page.
 *
 * The GL context is released when the intro ends; DPR is capped at 1.25
 * (threeui-canvas-craft). Reduced motion or no WebGL: the hero as designed.
 */
(function () {
  const canvas = document.querySelector(".hero-type");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  const hero = canvas.closest(".hero");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const WORDS = "validate the problem · build the MVP · test demand · insight to MVP · find your first buyers · 1-month sprint · 3-month venture build · Mamba Venture Program · Singapore · build a venture that sells · ".replace(/·/g, "/");

  const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uBuild, uYaw, uCurl, uTextLen, uDist, uHandFade;
uniform mat3 uHandRi, uPlaneRi; uniform vec3 uHandP, uPlaneP, uInk;
uniform sampler2D uAtlas, uText;

float smin(float a, float b, float k){ float h = clamp(.5 + .5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }
float cap(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba), 0., 1.); return length(pa - ba*h) - mix(ra, rb, h); }
float rbox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float dot2(vec3 v){ return dot(v, v); }
float tri(vec3 p, vec3 a, vec3 b, vec3 c){
  vec3 ba = b-a, pa = p-a, cb = c-b, pb = p-b, ac = a-c, pc = p-c, n = cross(ba, ac);
  return sqrt((sign(dot(cross(ba,n),pa)) + sign(dot(cross(cb,n),pb)) + sign(dot(cross(ac,n),pc)) < 2.)
    ? min(min(dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.,1.)-pa), dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.,1.)-pb)), dot2(ac*clamp(dot(ac,pc)/dot2(ac),0.,1.)-pc))
    : dot(n,pa)*dot(n,pa)/dot2(n));
}

// Each finger bends at the knuckle and again mid-way; uCurl closes them toward
// the palm (local +y) - relaxed while holding, flicked open on the toss. The
// smaller fingers curl a little more, so the hand never reads as a paddle.
float finger(vec3 q, float z, float l1, float l2, float s, float r, float cf){
  float c1 = uCurl*.5*cf, c2 = uCurl*.95*cf;
  vec3 a = vec3(.42, .03, z);
  vec3 b = a + vec3(l1*cos(c1), l1*sin(c1) + .02, s);
  vec3 c = b + vec3(l2*cos(c1 + c2), l2*sin(c1 + c2), s*1.3);
  return min(cap(q, a, b, r, r*.9), cap(q, b, c, r*.9, r*.74));
}
float hand(vec3 q){
  float d = rbox(q, vec3(.36, .045, .36), .09);
  d = smin(d, cap(q, vec3(-.42, -.01, 0.), vec3(-1.6, -.06, 0.), .27, .31), .16);
  float f = finger(q, -.31, .42, .36, -.16, .074, .85);
  f = min(f, finger(q, -.105, .48, .4, -.05, .077, 1.));
  f = min(f, finger(q, .105, .45, .37, .06, .074, 1.15));
  f = min(f, finger(q, .3, .34, .29, .17, .066, 1.35));
  d = smin(d, f, .035);
  float t = min(cap(q, vec3(-.05, -.02, -.34), vec3(.18, .06, -.7), .11, .095), cap(q, vec3(.18, .06, -.7), vec3(.42 - uCurl*.06, .12 + uCurl*.16, -.88), .095, .08));
  return smin(d, t, .07);
}
float plane(vec3 r){
  vec3 N = vec3(.62, 0., 0.), T = vec3(-.62, 0., 0.);
  float d = min(tri(r, N, T, vec3(-.62, .07, .46)), tri(r, N, T, vec3(-.62, .07, -.46)));
  d = min(d, tri(r, N, T, vec3(-.56, -.16, 0.)));
  return d - .007;
}
vec2 map(vec3 p){
  float h = hand(uHandRi * (p - uHandP));
  vec3 pp = p - uPlaneP;
  float b = length(pp) - .9;
  float pl = b > .1 ? b : plane(uPlaneRi * pp / 1.2) * 1.2;
  return h < pl ? vec2(h, 0.) : vec2(pl, 1.);
}
vec3 normal(vec3 p){
  vec2 e = vec2(.0015, -.0015);
  return normalize(e.xyy*map(p+e.xyy).x + e.yyx*map(p+e.yyx).x + e.yxy*map(p+e.yxy).x + e.xxx*map(p+e.xxx).x);
}
float hash(float x){ return fract(sin(x*12.9898) * 43758.5453); }
float glyph(float line, float col, vec2 g){
  float idx = mod(line*37. + col, uTextLen);
  float c = floor(texture2D(uText, vec2((idx + .5)/uTextLen, .5)).r*255. + .5) - 32.;
  if (c <= 0.) return 0.;
  vec2 cell = vec2(mod(c, 16.), floor(c/16.));
  return texture2D(uAtlas, (cell + g) / vec2(16., 6.)).a;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y;
  float cy = cos(uYaw), sy = sin(uYaw);
  mat3 ry = mat3(cy, 0., -sy, 0., 1., 0., sy, 0., cy);
  vec3 ro = ry * vec3(0., 0., uDist), rd = ry * normalize(vec3(uv, -2.));
  float t = uDist - 3.5, hit = -1.;
  for (int i = 0; i < 90; i++){
    vec2 m = map(ro + rd*t);
    if (m.x < .0015){ hit = m.y; break; }
    t += m.x * .85;
    if (t > uDist + 4.) break;
  }
  if (hit < 0.){ gl_FragColor = vec4(0.); return; }
  vec3 p = ro + rd*t, n = normal(p);
  float line, u, fy, id = hit;
  if (hit < .5){
    vec3 q = uHandRi * (p - uHandP), nl = uHandRi * n;
    float k = uDist / 9.;
    float v = q.x / (.06*k); line = floor(v); fy = fract(v);
    vec2 tn = normalize(vec2(-nl.z, nl.y) + 1e-5);
    u = dot(q.yz, tn) / (.036*k);
  } else {
    vec3 r = uPlaneRi * (p - uPlaneP), nl = uPlaneRi * n;
    float k = uDist / 9.;
    float v = (abs(nl.y) > abs(nl.z) ? r.z : r.y) / (.056*k);
    line = floor(v) + 400.; fy = fract(v);
    u = r.x / (.034*k);
  }
  float ink = 0.;
  if (fy > .1 && fy < .9) ink = glyph(line, floor(u), vec2(fract(u), 1. - (fy - .1)/.8));
  float h = hash(line + id*131.7);
  ink *= smoothstep(h*.85, h*.85 + .15, uBuild);
  if (hit < .5){
    ink *= 1. - smoothstep(h*.85, h*.85 + .15, uHandFade);
    ink *= smoothstep(-1.45, -.75, (uHandRi * (p - uHandP)).x);   // the forearm fades out: no cut-off edge
  }
  float diff = clamp(dot(n, normalize(vec3(-.5, .75, .55))), 0., 1.);
  float a = min(ink * 1.25, 1.) * (.72 + .28*diff);
  gl_FragColor = vec4(uInk * a, a);
}`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn("typeface:", e.message); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uRes", "uBuild", "uYaw", "uCurl", "uDist", "uHandFade", "uTextLen", "uHandRi", "uPlaneRi", "uHandP", "uPlaneP", "uInk", "uAtlas", "uText"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  /* Glyph atlas (printable ASCII, 16 x 6 cells) and the text as a data row. */
  const tex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); ["TEXTURE_WRAP_S", "TEXTURE_WRAP_T"].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, gl[k], gl.CLAMP_TO_EDGE)); return t; };
  const atlas = () => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 512;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '600 62px "DM Mono", ui-monospace, monospace';
    for (let i = 0; i < 95; i++) g.fillText(String.fromCharCode(32 + i), (i % 16) * 64 + 32, Math.floor(i / 16) * (512 / 6) + 512 / 12);
    tex(0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  };
  atlas();
  tex(1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, WORDS.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([...WORDS].map((ch) => ch.charCodeAt(0) & 127)));
  gl.uniform1i(U.uAtlas, 0); gl.uniform1i(U.uText, 1); gl.uniform1f(U.uTextLen, WORDS.length);
  gl.uniform3f(U.uInk, 12 / 255, 12 / 255, 14 / 255);
  document.fonts?.ready.then(atlas);

  /* Pose helpers: a basis from a heading and an up hint (shaders get the inverse). */
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ortho = (X, hint) => { const d = hint[0] * X[0] + hint[1] * X[1] + hint[2] * X[2]; return norm(hint.map((u, i) => u - X[i] * d)); };
  const inv = (X, Y) => { const Z = cross(X, Y); return new Float32Array([X[0], Y[0], Z[0], X[1], Y[1], Z[1], X[2], Y[2], Z[2]]); };
  const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
  const bez = (P, t) => P[0].map((_, i) => (1 - t) ** 3 * P[0][i] + 3 * (1 - t) ** 2 * t * P[1][i] + 3 * (1 - t) * t * t * P[2][i] + t ** 3 * P[3][i]);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const YAW = 0.14;

  /* Choreography (seconds) */
  const T = { build: 0.7, swing: [0.45, 1.05], release: 1.0, flight: 2.3, fade: 1.2, emit: [0.14, 0.72], settle: 1.0 };
  /* The hand: cocked back while it forms, swings through the toss (the plane
     rides the fingertips until release), fingers flick open, then relax. */
  const X0 = norm([0.6, 0.8, 0]), Y0 = ortho(X0, [-0.3, 0.2, 1]);
  const rz = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
  const hand = (s) => {
    const w = smooth((s - T.swing[0]) / (T.swing[1] - T.swing[0])), after = smooth((s - T.swing[1]) / 0.7);
    const ang = 0.28 - 0.62 * w + 0.12 * after;                 // back, through, settle
    const X = rz(X0, ang), Y = rz(Y0, ang);
    const p = S.handP ? add(S.handP, [0.18, 0.1, 0], w - 0.4 * after) : [0, 0, 0];
    const curl = 0.42 - 0.5 * smooth((s - 0.6) / 0.4) + 0.38 * after;
    return { X, Y, p, curl, ri: inv(X, Y), tips: add(add(p, X, 1.62), Y, 0.3) };
  };
  const plane = (s) => {
    const h = hand(s);
    if (s < T.release) return { u: 0, pos: h.tips, head: h.X, ri: inv(h.X, ortho(h.X, [0, 0.6, 0.8])), h };
    const u = clamp01((s - T.release) / T.flight);
    const e = u * (1.55 - 0.55 * u);                            // leaves at toss speed, eases into the glide
    const k = Math.min(e, 0.999), p = bez(S.path, k), q = bez(S.path, Math.min(k + 0.01, 1));
    const head = norm(q.map((x, i) => x - p[i]));
    const roll = Math.sin(s * 2.4) * 0.1 * u;
    return { u, pos: p, head, ri: inv(head, ortho(head, [roll, 0.6, 0.8])), h };
  };
  /* Stage: everything is placed in screen-normalised units (-1..1) and lifted
     onto the z = 0 plane, so the throw reads the same on any viewport. */
  let W = 0, H = 0, D = 9, S = {};
  const resize = () => {
    // The stage starts under the floating header (logos + nav), not behind it.
    const nav = document.getElementById("nav"), hr = hero.getBoundingClientRect();
    const top = Math.max(0, Math.round((nav ? nav.getBoundingClientRect().bottom : hr.top) - hr.top + 12));
    canvas.style.top = `${top}px`; canvas.style.height = `${hr.height - top}px`;
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.25);
    W = r.width; H = r.height;
    canvas.width = Math.max(2, Math.round(W * dpr)); canvas.height = Math.max(2, Math.round(H * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    const portrait = W / H < 1;
    D = portrait ? 13 : 9;
    const hh = D / 4, hw = hh * (W / H), at = (x, y, z = 0) => [x * hw, y * hh, z];
    const handP = portrait ? at(-0.5, -0.5) : at(-0.62, -0.42);
    // Release: the plane leaves the fingertips along their swing, then levels
    // out and flies flat across the hero, above the headline it writes.
    S = { handP, at };
    const r0 = hand(T.release), dir = norm(r0.X.map((x, i) => x * 0.55 + [1, 0, 0][i] * 0.45));
    const level = portrait ? 0.52 : 0.42;
    S.path = [r0.tips, add(r0.tips, dir, 0.9), at(-0.1, level, 0.4), at(1.45, level + 0.04, 0.2)];
    gl.uniform1f(U.uDist, D);
  };
  /* World -> canvas CSS pixels, through the same yawed camera as the shader. */
  const project = (P) => {
    const cy = Math.cos(YAW), sy = Math.sin(YAW);
    const x = cy * P[0] - sy * P[2], y = P[1], z = sy * P[0] + cy * P[2] - D;
    return [W / 2 + (x * 2 / -z) * H, H / 2 - (y * 2 / -z) * H];
  };

  const draw = (s) => {
    const P = plane(s);
    gl.uniform1f(U.uBuild, clamp01(s / T.build));
    gl.uniform1f(U.uCurl, P.h.curl);
    gl.uniform1f(U.uHandFade, clamp01((s - T.fade) / 0.7));
    gl.uniform1f(U.uYaw, YAW);
    gl.uniformMatrix3fv(U.uHandRi, false, P.h.ri); gl.uniform3fv(U.uHandP, P.h.p);
    gl.uniformMatrix3fv(U.uPlaneRi, false, P.ri); gl.uniform3fv(U.uPlaneP, P.pos);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return P;
  };

  /* The headline, letter by letter (words stay unbreakable). */
  const title = hero.querySelector(".hero-title");
  const letters = [];
  title.querySelectorAll(".line > span").forEach((span) => {
    const words = span.textContent.split(" ");
    span.textContent = "";
    words.forEach((w, wi) => {
      const word = document.createElement("span"); word.className = "word"; word.setAttribute("aria-hidden", "true");
      [...w].forEach((c) => { const ch = document.createElement("span"); ch.className = "ch"; ch.textContent = c; word.append(ch); letters.push(ch); });
      span.append(word);
      if (wi < words.length - 1) span.append(" ");
    });
  });

  const root = document.documentElement;
  let seen = false;
  try { seen = sessionStorage.getItem("mvp-intro") === "1" && !/[?&]intro\b/.test(location.search); } catch (e) {}
  if (reduced || seen) { gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove(); return; }
  try { sessionStorage.setItem("mvp-intro", "1"); } catch (e) {}

  root.classList.add("intro");
  resize();
  canvas.classList.add("on");

  const emitted = new Array(letters.length).fill(false), anims = [];
  let t0 = 0, raf = 0, done = false;
  const finish = () => {
    if (done) return; done = true;
    cancelAnimationFrame(raf);
    anims.forEach((a) => a.finish());
    root.classList.remove("intro");
    canvas.classList.remove("on");
    setTimeout(() => { gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove(); }, 800);
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => removeEventListener(ev, finish));
  };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => addEventListener(ev, finish, { passive: true }));

  const emit = (i, P) => {
    const ch = letters[i], hr = hero.getBoundingClientRect(), r = ch.getBoundingClientRect();
    // The tail of the plane, in hero pixels, is where this letter is born.
    const [tx, ty] = project(add(P.pos, P.head, -0.75));
    const fx = r.left - hr.left + r.width / 2, fy = r.top - hr.top + r.height / 2;
    const dx = tx - fx, dy = ty - fy, ang = Math.atan2(-P.head[1], P.head[0]);
    ch.style.opacity = "1";
    anims.push(ch.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(${ang}rad) scale(.18)`, opacity: 0, easing: "cubic-bezier(.2,.7,.3,1)" },
      { transform: `translate(${dx - 30}px, ${dy + 12}px) rotate(${ang * 0.6}rad) scale(.32)`, opacity: 1, offset: 0.22, easing: "cubic-bezier(.3,1.25,.4,1)" },
      { transform: "none", opacity: 1 },
    ], { duration: T.settle * 1000, fill: "backwards" }));
  };

  const frame = (now) => {
    if (!t0) t0 = now;
    const s = (now - t0) / 1000;
    const P = draw(s);
    const [a, b] = T.emit;
    for (let i = 0; i < letters.length; i++) {
      if (!emitted[i] && P.u >= a + (b - a) * (i / (letters.length - 1))) { emitted[i] = true; emit(i, P); }
    }
    if (P.u >= 1 && s > T.release + T.flight + 0.2) {
      // Plane gone: once the last letter has landed, the rest of the hero rises in.
      canvas.classList.remove("on");
      Promise.all(anims.map((x) => x.finished)).then(finish, finish);
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  addEventListener("resize", resize);
  /* Review aid: ?intro=2.4 freezes the sequence at 2.4s for inspection. */
  const freeze = parseFloat((location.search.match(/[?&]intro=([\d.]+)/) || [])[1]);
  if (freeze >= 0) {
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => removeEventListener(ev, finish));
    document.fonts?.ready.then(() => {
      let P;
      for (let s = 0; s <= freeze; s += 1 / 60) {
        P = plane(s);
        letters.forEach((_, i) => { if (!emitted[i] && P.u >= T.emit[0] + (T.emit[1] - T.emit[0]) * (i / (letters.length - 1))) { emitted[i] = s; emit(i, P); } });
      }
      draw(freeze);
      window.__intro = { S, draw };
      anims.forEach((x, k) => { x.pause(); x.currentTime = Math.min((freeze - emitted.filter(Boolean)[k]) * 1000, T.settle * 1000); });
    });
    return;
  }
  document.fonts?.ready.then(() => (raf = requestAnimationFrame(frame)));
})();
