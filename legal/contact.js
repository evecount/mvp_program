/* Contact form: posts to /api/contact (Cloud Function → email to the team). */
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const msg = document.getElementById("contact-msg"), btn = form.querySelector(".send"), opened = Date.now();
  // ?topic=… preselects the dropdown (panel buttons link here with one).
  const pre = new URLSearchParams(location.search).get("topic");
  if (pre && [...form.topic.options].some((o) => o.value === pre || o.text === pre)) form.topic.value = pre;
  const say = (t, bad) => { msg.textContent = t; msg.classList.toggle("bad", !!bad); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const body = { name: f.get("name"), email: f.get("email"), organisation: f.get("organisation"), topic: f.get("topic"), message: f.get("message"), linkedin: f.get("linkedin") || "", website: f.get("website"), consent: form.consent.checked, elapsed: Date.now() - opened };
    const missing = [];
    if (String(body.name).trim().length < 2) missing.push("your name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.email).trim())) missing.push("a valid email");
    if (!body.topic) missing.push(form.dataset.kind === "network" ? "how you would like to be involved" : "a topic");
    if (String(body.message).trim().length < 10) missing.push("a message");
    if (!body.consent) missing.push("your agreement to the privacy policy");
    if (missing.length) return say(`Please add ${missing.join(", ")}.`, true);
    btn.disabled = true; say("Sending…");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { form.reset(); say("Thanks, your message is with the team. We'll reply by email."); }
      else if (r.status === 429) say("You've sent a few messages today already. We'll be in touch.", true);
      else say("That didn't send. Please check the fields and try again.", true);
    } catch { say("That didn't send. Please check your connection and try again.", true); }
    btn.disabled = false;
  });
})();
