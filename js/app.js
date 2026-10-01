/**
 * Mamba MVP — site chrome: sound toggle, toasts and the partner inquiry form.
 * Routing lives in router.js; the application form lives in apply.js.
 */

class SiteApp {
  constructor() {
    this.bindEvents();
  }

  bindEvents() {
    // Audio Toggle
    const audioBtn = document.getElementById("btn-toggle-sound");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        const enabled = window.soundEngine.toggle();
        audioBtn.classList.toggle("active", enabled);
        audioBtn.title = enabled ? "Sound FX Enabled" : "Sound FX Muted";
        this.showToast(enabled ? "Sound effects enabled" : "Sound effects muted");
      });
    }

    // Audience Inquiry Modal triggers
    document.querySelectorAll(".audience-inquire-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const track = btn.dataset.track || "General Inquiry";
        const title = btn.dataset.title || "Partner Proposal";
        const modal = document.getElementById("inquiry-modal");
        const trackInput = document.getElementById("inq-track");
        const titleEl = document.getElementById("inquiry-modal-title");
        if (trackInput) trackInput.value = track;
        if (titleEl) titleEl.textContent = title;
        if (modal) modal.classList.add("active");
        window.soundEngine?.select();
      });
    });

    // Inquiry Form Submit
    const inqForm = document.getElementById("inquiry-form");
    if (inqForm) {
      inqForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const track = document.getElementById("inq-track")?.value || "Partner Inquiry";
        const name = document.getElementById("inq-name")?.value.trim() || "Partner";
        const email = document.getElementById("inq-email")?.value.trim() || "";
        const org = document.getElementById("inq-org")?.value.trim() || "";
        const msg = document.getElementById("inq-msg")?.value.trim() || "";

        const subject = encodeURIComponent(`[Mamba MVP Ecosystem] ${track} Inquiry - ${org} (${name})`);
        const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nOrganization: ${org}\nEngagement Track: ${track}\n\nMessage/Proposal:\n${msg}`);

        this.closeModal("inquiry-modal");
        window.soundEngine?.pass();
        this.showToast("Inquiry submitted! Our investment team will respond within 24h.");
        window.location.href = `mailto:partnerships@evecount.com?subject=${subject}&body=${body}`;
        inqForm.reset();
      });
    }
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = document.createElement("span");
    icon.textContent = "⚡";
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(icon, " ", text);
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(40px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new SiteApp();
});
