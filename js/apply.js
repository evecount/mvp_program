/**
 * Mamba MVP — Apply to MVP: the step-by-step application form.
 *
 * Renders js/application-questions.js one step at a time, validates each step
 * before moving on, keeps a draft in this browser, and files the finished
 * application as one document in the Firestore collection `mvp_applications`.
 * firestore.rules enforces the same field list and limits on the way in, and
 * the Cloud Function in functions/ scores it and mails the dossier.
 *
 * Questions tagged with `tracks` only show for those tracks; a step with no
 * question for the chosen track is skipped.
 */
const APP = window.MVP_APPLICATION;
const COLLECTION = "mvp_applications";
const DRAFT_KEY = "mamba-mvp.application-draft.v2";
const FIREBASE_VERSION = "10.14.1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Options arrive as plain strings or as { value, label, hint }. */
const allSteps = APP.steps.map((step) => ({
  ...step,
  fields: step.fields.map((f) => ({
    ...f,
    options: f.options?.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
  })),
}));
const allFields = allSteps.flatMap((s) => s.fields);

const shows = (f) => !f.tracks || f.tracks.includes(data.track);
const visibleFields = (step) => step.fields.filter(shows);
/* Recomputed on every read: changing the track changes which steps exist. */
let steps = [];
function refreshSteps() {
  steps = allSteps.filter((s) => visibleFields(s).length);
  stepIndex = Math.min(stepIndex, steps.length - 1);
}

const $ = (id) => document.getElementById(id);
const els = {
  card: $("apply-card"),
  form: $("apply-form"),
  body: $("apply-step-body"),
  bar: $("apply-progress-bar"),
  count: $("apply-step-count"),
  name: $("apply-step-name"),
  prev: $("apply-prev"),
  next: $("apply-next"),
  banner: $("apply-error-banner"),
  done: $("apply-done"),
  doneCopy: $("apply-done-copy"),
  hero: document.querySelector(".ap-hero"),
};

let data = {};
let stepIndex = 0;
let submitting = false;

/* ── Draft ─────────────────────────────────────────────────────────── */

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.data === "object") {
      data = parsed.data;
      stepIndex = Math.max(0, parsed.step | 0);
    }
  } catch {
    /* No storage (private mode etc.) — the form still works, it just won't resume. */
  }
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step: stepIndex, savedAt: Date.now() }));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

/* ── Rendering ─────────────────────────────────────────────────────── */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children.filter(Boolean));
  return node;
}

/* Checkbox labels may carry [text](/path) links to the policies; they open in
   a new tab so the half-filled form stays put. */
function linked(label) {
  return label.split(/(\[[^\]]+\]\(\/[^)\s]+\))/).filter(Boolean).map((part) => {
    const m = part.match(/^\[([^\]]+)\]\((\/[^)\s]+)\)$/);
    return m ? el("a", { href: m[2], target: "_blank", rel: "noopener", text: m[1] }) : document.createTextNode(part);
  });
}

function renderField(f) {
  const value = data[f.id] ?? (f.kind === "checkbox" ? false : "");
  const errId = `err-${f.id}`;
  let input;

  if (f.kind === "checkbox") {
    input = el("input", { type: "checkbox", id: f.id, name: f.id });
    input.checked = Boolean(value);
    return el(
      "div",
      { class: "apply-field apply-field--full", "data-field": f.id },
      el("label", { class: "checkbox-label apply-consent" }, input, el("span", {}, ...linked(f.label))),
      el("p", { class: "apply-field-error", id: errId, hidden: true }),
    );
  }

  if (asChoices(f)) {
    input = el("div", { class: "apply-choices", id: f.id, role: "radiogroup", tabindex: "-1", "aria-labelledby": `label-${f.id}` });
    f.options.forEach((opt, i) => {
      const radio = el("input", { type: "radio", name: f.id, id: `${f.id}--${i}`, value: opt.value });
      radio.checked = opt.value === value;
      input.append(
        el(
          "label",
          { class: "apply-choice", for: `${f.id}--${i}` },
          radio,
          el("span", { class: "apply-choice-text" },
            el("span", { class: "apply-choice-label", text: opt.label }),
            opt.hint ? el("span", { class: "apply-choice-hint", text: opt.hint }) : null),
        ),
      );
    });
  } else if (f.kind === "select") {
    input = el("select", { class: "form-select", id: f.id, name: f.id });
    input.append(el("option", { value: "", text: "Select one" }));
    for (const opt of f.options) {
      const o = el("option", { value: opt.value, text: opt.label });
      if (opt.value === value) o.selected = true;
      input.append(o);
    }
  } else if (f.kind === "textarea") {
    input = el("textarea", { class: "form-input", id: f.id, name: f.id, rows: 5, maxlength: f.max });
    input.value = value;
  } else {
    input = el("input", {
      class: "form-input",
      id: f.id,
      name: f.id,
      type: f.kind,
      maxlength: f.max,
      autocomplete: f.autocomplete,
      placeholder: f.placeholder,
      inputmode: f.kind === "tel" ? "tel" : null,
    });
    input.value = value;
  }

  const counter =
    f.kind === "textarea"
      ? el("span", { class: "apply-counter", id: `count-${f.id}`, text: counterText(f, value) })
      : null;

  const full = f.kind === "textarea" || f.kind === "checkbox" || f.kind === "select";
  const chosen = f.options?.find((o) => o.value === value);
  return el(
    "div",
    { class: `apply-field${full ? " apply-field--full" : ""}`, "data-field": f.id },
    el(
      "div",
      { class: "apply-label-row" },
      asChoices(f)
        ? el("span", { class: "form-label", id: `label-${f.id}`, text: f.label + (f.required ? " *" : "") })
        : el("label", { class: "form-label", for: f.id, text: f.label + (f.required ? " *" : "") }),
      counter,
    ),
    f.hint ? el("p", { class: "apply-hint", text: f.hint }) : null,
    input,
    f.options?.some((o) => o.hint) && !asChoices(f)
      ? el("p", { class: "apply-hint", id: `opt-hint-${f.id}`, text: chosen?.hint || "" })
      : null,
    el("p", { class: "apply-field-error", id: errId, hidden: true }),
  );
}

/* Short option lists show as tappable cards, so every answer is visible at
   once; long lists stay a dropdown. */
const asChoices = (f) => f.kind === "select" && f.options.length <= 6;

function counterText(f, value) {
  const n = String(value || "").trim().length;
  if (f.min && n < f.min) return `${n} / ${f.min} min`;
  return `${n} / ${f.max}`;
}

function render() {
  refreshSteps();
  const step = steps[stepIndex];
  const last = stepIndex === steps.length - 1;

  els.body.replaceChildren(
    ...[
      el("h2", { class: "apply-step-title", text: step.title, tabindex: "-1" }),
      step.intro ? el("p", { class: "apply-step-intro", text: step.intro }) : null,
      el("div", { class: "apply-grid" }, ...visibleFields(step).map(renderField)),
      last ? honeypot() : null,
    ].filter(Boolean),
  );

  els.bar.replaceChildren(
    ...steps.map((_, i) =>
      el("span", { class: `apply-seg${i < stepIndex ? " is-done" : i === stepIndex ? " is-current" : ""}` }),
    ),
  );
  const pad = (n) => String(n).padStart(2, "0");
  els.count.textContent = `Step ${pad(stepIndex + 1)} / ${pad(steps.length)}`;
  els.name.textContent = step.title;
  els.prev.hidden = stepIndex === 0;
  els.next.textContent = last ? "Submit application" : "Continue →";
  hideBanner();
}

/* Bots fill every field; people never see this one. */
function honeypot() {
  const trap = el("input", { type: "text", id: "apply-company-url", name: "company_url", tabindex: "-1", autocomplete: "off" });
  return el("div", { class: "apply-hp", "aria-hidden": "true" }, trap);
}

/* ── Validation ────────────────────────────────────────────────────── */

function readValue(f) {
  const node = $(f.id);
  if (!node) return data[f.id];
  if (asChoices(f)) return node.querySelector("input:checked")?.value ?? "";
  return f.kind === "checkbox" ? node.checked : node.value;
}

/* Radios carry the field id as their name; everything else as its id. */
const fieldFor = (target) => allFields.find((x) => x.id === (target.type === "radio" ? target.name : target.id));

function validateField(f, value) {
  if (f.kind === "checkbox") return f.required && !value ? "Please confirm to submit." : "";
  const v = String(value ?? "").trim();
  if (!v) return f.required ? (f.kind === "select" ? "Choose an answer." : "This is required.") : "";
  if (f.max && v.length > f.max) return `Keep this under ${f.max} characters.`;
  if (f.kind === "email" && !EMAIL_RE.test(v)) return "That doesn't look like an email address.";
  if (f.kind === "url" && !/^https?:\/\/\S+\.\S+/.test(v)) return "Use a full link starting with https://";
  if (f.kind === "select" && !f.options.some((o) => o.value === v)) return "Choose one of the listed answers.";
  if (f.min && f.kind !== "select" && v.length < f.min) return `A little more here, please (at least ${f.min} characters).`;
  return "";
}

function showFieldError(id, message) {
  const err = $(`err-${id}`);
  const input = $(id);
  if (err) {
    err.textContent = message;
    err.hidden = !message;
  }
  if (input) {
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (message) input.setAttribute("aria-describedby", `err-${id}`);
    else input.removeAttribute("aria-describedby");
  }
}

function validateStep(index) {
  let first = null;
  for (const f of visibleFields(steps[index])) {
    const message = validateField(f, readValue(f));
    showFieldError(f.id, message);
    if (message && !first) first = f.id;
  }
  return first;
}

function focusField(id) {
  const node = $(id);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  const target = node.getAttribute("role") === "radiogroup" ? node.querySelector("input:checked, input") : node;
  setTimeout(() => target.focus({ preventScroll: true }), 300);
}

function showBanner(message) {
  els.banner.textContent = message;
  els.banner.hidden = false;
}

function hideBanner() {
  els.banner.hidden = true;
  els.banner.textContent = "";
}

/* ── Navigation ────────────────────────────────────────────────────── */

/* Motion: a step slides in from the side it came from, on the same expo
   ease-out as the rest of the site; a blocked step gives a short iOS-style
   shake. Both are skipped under reduced motion. */
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

function slideIn(direction) {
  if (reducedMotion() || !els.body.animate) return;
  els.body.animate(
    [{ opacity: 0, transform: `translateX(${direction * 28}px)` }, { opacity: 1, transform: "none" }],
    { duration: 420, easing: EASE_OUT },
  );
}

function shake(node) {
  if (reducedMotion() || !node?.animate) return;
  node.animate(
    [0, -8, 7, -5, 3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 360, easing: "ease-out" },
  );
}

function goTo(index) {
  const direction = Math.sign(index - stepIndex) || 1;
  stepIndex = index;
  saveDraft();
  render();
  slideIn(direction);
  els.card.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  els.body.querySelector(".apply-step-title")?.focus({ preventScroll: true });
}

els.form.addEventListener("input", (e) => {
  const f = fieldFor(e.target);
  if (!f) return;
  data[f.id] = readValue(f);
  if (f.kind === "textarea") {
    const c = $(`count-${f.id}`);
    if (c) c.textContent = counterText(f, data[f.id]);
  }
  if ($(`err-${f.id}`)?.textContent) showFieldError(f.id, validateField(f, data[f.id]));
  saveDraft();
});

els.form.addEventListener("change", (e) => {
  const f = fieldFor(e.target);
  if (!f) return;
  data[f.id] = readValue(f);
  showFieldError(f.id, validateField(f, data[f.id]));
  const hint = $(`opt-hint-${f.id}`);
  if (hint) hint.textContent = f.options.find((o) => o.value === data[f.id])?.hint || "";
  if (f.id === "track") refreshSteps();
  saveDraft();
});

els.prev.addEventListener("click", () => stepIndex > 0 && goTo(stepIndex - 1));

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const invalid = validateStep(stepIndex);
  if (invalid) {
    showBanner("A few answers need a look before you continue.");
    shake(els.banner);
    focusField(invalid);
    window.soundEngine?.warning?.();
    return;
  }
  hideBanner();
  if (stepIndex < steps.length - 1) {
    window.soundEngine?.select?.();
    goTo(stepIndex + 1);
    return;
  }
  await submit();
});

/* ── Submission ────────────────────────────────────────────────────── */

/* Every field is sent (the rules require the full shape); a question the
   chosen track never saw goes as "". */
function buildRecord() {
  const record = {};
  for (const f of allFields) {
    const v = shows(f) ? data[f.id] : "";
    record[f.id] = f.kind === "checkbox" ? Boolean(v) : String(v ?? "").trim();
  }
  record.email = record.email.toLowerCase();
  return record;
}

let dbPromise = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
      const [{ initializeApp }, firestore] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-firestore.js`),
      ]);
      const app = initializeApp(window.MVP_FIREBASE_CONFIG);
      const db = firestore.getFirestore(app);
      // Local testing only: window.MVP_FIRESTORE_EMULATOR = "127.0.0.1:8085"
      const emulator = window.MVP_FIRESTORE_EMULATOR;
      if (emulator) firestore.connectFirestoreEmulator(db, ...emulator.split(":").map((v, i) => (i ? +v : v)));
      return { db, firestore };
    })();
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

async function submit() {
  if (submitting) return;

  // Re-check every step: a draft restored from an older version of the form
  // may be missing an answer on a step the applicant already passed.
  for (let i = 0; i < steps.length; i++) {
    const missing = visibleFields(steps[i]).find((f) => validateField(f, data[f.id]));
    if (missing) {
      goTo(i);
      validateStep(i);
      showBanner("One earlier answer needs a look before you can submit.");
      focusField(missing.id);
      return;
    }
  }

  if ($("apply-company-url")?.value) {
    finish(); // honeypot tripped: look successful, file nothing
    return;
  }

  // Applications close 72h before a cohort starts (the rules enforce it too).
  const cohort = (window.MVP_COHORTS || []).find((c) => c.closesAt > Date.now());
  if (!cohort) {
    showBanner("Applications are closed until the next cohort is announced. Your answers are saved on this device, so you can submit once they reopen.");
    return;
  }

  if (!window.MVP_FIREBASE_CONFIG) {
    showBanner("Applications aren't open yet. Your answers are saved on this device, so you can submit as soon as they are.");
    return;
  }

  submitting = true;
  els.next.disabled = true;
  els.next.textContent = "Submitting…";
  try {
    const { db, firestore } = await getDb();
    await firestore.addDoc(firestore.collection(db, COLLECTION), {
      ...buildRecord(),
      cohort: cohort.starts,
      status: "pending",
      schemaVersion: APP.schemaVersion,
      createdAt: firestore.serverTimestamp(),
    });
    finish();
  } catch (err) {
    console.error("[apply] submission failed:", err);
    showBanner("Your application couldn't be sent. Nothing is lost: your answers are saved here. Check your connection and try again.");
    window.soundEngine?.fail?.();
  } finally {
    submitting = false;
    els.next.disabled = false;
    els.next.textContent = "Submit application";
  }
}

function finish() {
  const first = String(data.fullName || "").trim().split(/\s+/)[0];
  els.doneCopy.textContent = first
    ? `Thanks, ${first}. Your application is with the Mamba MVP team, and we'll reply to ${data.email}.`
    : `Thanks. Your application is with the Mamba MVP team, and we'll reply to ${data.email}.`;
  clearDraft();
  data = {};
  stepIndex = 0;
  // The intro banner goes too, so the celebration is the first thing on the page.
  els.card.hidden = true;
  if (els.hero) els.hero.hidden = true;
  els.done.hidden = false;
  els.done.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.soundEngine?.pass?.();
  celebrate();
}

/* The check rises out from behind the headline, ticks itself and pops
   confetti out of the top like a party popper. Reduced motion: the check
   simply appears. */
function celebrate() {
  const mark = els.done.querySelector(".apply-done-mark");
  if (!mark) return;
  els.done.classList.remove("pop");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return els.done.classList.add("pop");
  void mark.offsetWidth;
  // Let the smooth scroll settle so the popper fires where the check lands.
  setTimeout(() => {
    els.done.classList.add("pop");
    setTimeout(() => {
      const r = mark.getBoundingClientRect();
      window.confetti?.burst?.(r.left + r.width / 2, r.top + r.height * 0.35);
    }, 430);
  }, 380);
}

/* ── Boot ──────────────────────────────────────────────────────────── */

document.addEventListener("mvp:route", (e) => {
  if (e.detail !== "apply") return;
  // Coming back to #apply after submitting starts a fresh form.
  if (!els.done.hidden && !Object.keys(data).length) {
    els.done.hidden = true;
    els.card.hidden = false;
    if (els.hero) els.hero.hidden = false;
    render();
  }
});

loadDraft();
render();

/* Review mode: apply.html?preview=submitted opens straight on the success
   screen with sample details and a Replay button, so the animation can be
   checked without filing an application. Nothing is sent or saved. */
if (new URLSearchParams(location.search).get("preview") === "submitted") {
  els.doneCopy.textContent = "Thanks, Alex. Your application is with the Mamba MVP team, and we'll reply to alex@example.com.";
  els.card.hidden = true;
  if (els.hero) els.hero.hidden = true;
  els.done.hidden = false;
  const replay = el("button", { type: "button", class: "btn-secondary apply-replay", text: "Replay animation" });
  replay.addEventListener("click", () => { window.scrollTo({ top: 0 }); window.soundEngine?.pass?.(); celebrate(); });
  els.done.querySelector(".apply-done-actions")?.append(replay);
  setTimeout(celebrate, 300);
}
// Tell an applicant up front when no cohort is taking applications.
if (!(window.MVP_COHORTS || []).some((c) => c.closesAt > Date.now())) {
  showBanner("Applications are closed until the next cohort is announced. You can still fill this in; your answers are saved on this device.");
}
