/**
 * Mamba MVP — site chrome: sound toggle, toasts and the partner inquiry form.
 * Routing lives in router.js; the application form lives in apply.js.
 */

class SiteApp {
  constructor() {
    this.bindEvents();
    this.bindModals();
  }

  bindEvents() {
    // Audio Toggle
    const audioBtn = document.getElementById("btn-toggle-sound");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        const enabled = window.soundEngine.toggle();
        audioBtn.classList.toggle("active", enabled);
        audioBtn.setAttribute("aria-pressed", String(enabled));
        audioBtn.title = enabled ? "Sound effects on" : "Sound effects off";
        this.showToast(enabled ? "Sound effects enabled" : "Sound effects muted");
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

  /* Modals: focus moves in on open and back to the opener on close; Escape,
     the backdrop and any [data-close-modal] close it; Tab stays inside. The
     exit plays its (shorter) animation before the overlay is hidden. */
  openModal(modalId, opener) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    this.modalOpener = opener || document.activeElement;
    modal.classList.remove("closing");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    const first = modal.querySelector("input:not([readonly]), textarea, select") || modal.querySelector("button");
    requestAnimationFrame(() => first?.focus({ preventScroll: true }));
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal.classList.contains("active") || modal.classList.contains("closing")) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => {
      modal.classList.remove("active", "closing");
      document.body.style.overflow = "";
      this.modalOpener?.focus?.({ preventScroll: true });
    };
    if (reduced) return done();
    modal.classList.add("closing");
    setTimeout(done, 160);
  }

  bindModals() {
    document.querySelectorAll("[data-modal]").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest("[data-close-modal]")) this.closeModal(modal.id);
      });
      modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") return this.closeModal(modal.id);
        if (e.key !== "Tab") return;
        const items = [...modal.querySelectorAll("button, input, textarea, select, a[href]")].filter((n) => !n.disabled && n.offsetParent);
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    });
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new SiteApp();
});
