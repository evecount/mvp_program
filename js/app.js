/**
 * EveCount Venture Studio - Cohort 1 Examination Portal Application Logic
 */

class ExamApp {
  constructor() {
    this.candidate = {
      fullName: "",
      email: "",
      startupName: "",
      track: "B2B AI & SaaS",
      agreed: false
    };

    this.questions = EXAM_QUESTIONS;
    this.currentIndex = 0;
    this.userAnswers = {}; // { [qId]: optionIndex }
    this.flagged = new Set(); // Set of qIds

    this.timerSeconds = 25 * 60; // 25 minutes
    this.timerInterval = null;
    this.isExamActive = false;
    this.examFinished = false;

    this.results = null;

    this.booking = {
      partner: "Dr. Evelyn Vance (Founding Partner)",
      date: "",
      time: "10:00 AM SGT / UTC+8",
      notes: ""
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.renderMatrix();
    this.populateBookingDates();
  }

  bindEvents() {
    // Checkin Form Submit
    const checkinForm = document.getElementById("checkin-form");
    if (checkinForm) {
      checkinForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.startExam();
      });
    }

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

    // Fullscreen Toggle
    const fsBtn = document.getElementById("btn-toggle-fullscreen");
    if (fsBtn) {
      fsBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          fsBtn.classList.add("active");
        } else {
          document.exitFullscreen().catch(() => {});
          fsBtn.classList.remove("active");
        }
      });
    }

    // Question Navigation
    document.getElementById("btn-prev-q")?.addEventListener("click", () => this.navigate(-1));
    document.getElementById("btn-next-q")?.addEventListener("click", () => this.navigate(1));

    // Flag Question
    document.getElementById("btn-flag-q")?.addEventListener("click", () => this.toggleFlag());

    // Submit Exam Buttons
    document.getElementById("btn-submit-exam")?.addEventListener("click", () => this.promptSubmission());
    document.getElementById("btn-confirm-submit")?.addEventListener("click", () => this.finalizeExam());
    document.getElementById("btn-cancel-submit")?.addEventListener("click", () => this.closeModal("submit-modal"));

    // Offer Letter actions
    document.getElementById("btn-print-offer")?.addEventListener("click", () => window.print());
    document.getElementById("btn-copy-offer")?.addEventListener("click", () => this.copyOfferLetter());

    // Retake Exam
    document.getElementById("btn-retake-exam")?.addEventListener("click", () => this.resetExam());

    // Booking actions
    document.getElementById("btn-confirm-booking")?.addEventListener("click", () => this.confirmBooking());

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (!this.isExamActive || this.examFinished) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

      const key = e.key.toUpperCase();
      if (["A", "1"].includes(key)) this.selectOption(0);
      else if (["B", "2"].includes(key)) this.selectOption(1);
      else if (["C", "3"].includes(key)) this.selectOption(2);
      else if (["D", "4"].includes(key)) this.selectOption(3);
      else if (key === "F") this.toggleFlag();
      else if (e.key === "ArrowRight") this.navigate(1);
      else if (e.key === "ArrowLeft") this.navigate(-1);
    });
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(40px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  startExam() {
    const nameInput = document.getElementById("cand-name");
    const emailInput = document.getElementById("cand-email");
    const startupInput = document.getElementById("cand-startup");
    const trackInput = document.getElementById("cand-track");
    const agreeCheck = document.getElementById("cand-agree");

    if (!agreeCheck.checked) {
      alert("Please confirm the examination honor code to proceed.");
      return;
    }

    this.candidate.fullName = nameInput.value.trim() || "Venture Candidate";
    this.candidate.email = emailInput.value.trim() || "founder@startup.io";
    this.candidate.startupName = startupInput.value.trim() || "Stealth Venture";
    this.candidate.track = trackInput.value;

    // Update UI candidate labels
    document.querySelectorAll(".cand-display-name").forEach(el => el.textContent = this.candidate.fullName);
    document.querySelectorAll(".cand-display-startup").forEach(el => el.textContent = this.candidate.startupName);
    document.querySelectorAll(".cand-display-track").forEach(el => el.textContent = this.candidate.track);

    this.isExamActive = true;
    this.examFinished = false;
    this.currentIndex = 0;
    this.userAnswers = {};
    this.flagged.clear();

    document.getElementById("header-exam-meta").style.display = "flex";

    this.startTimer();
    this.loadQuestion(0);
    this.showScreen("screen-exam");
    window.soundEngine.select();
    this.showToast("Cohort 1 Proctored Examination Session Active");
  }

  startTimer() {
    clearInterval(this.timerInterval);
    const timerEl = document.getElementById("exam-timer-display");
    
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      if (this.timerSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.finalizeExam();
        return;
      }

      const mins = Math.floor(this.timerSeconds / 60);
      const secs = this.timerSeconds % 60;
      const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      
      if (timerEl) {
        timerEl.textContent = formatted;
        if (this.timerSeconds <= 300) {
          timerEl.parentElement.classList.add("warning");
        }
      }

      if (this.timerSeconds === 300) {
        window.soundEngine.warning();
        this.showToast("5 minutes remaining in examination session!", "warning");
      }
    }, 1000);
  }

  loadQuestion(index) {
    if (index < 0 || index >= this.questions.length) return;
    this.currentIndex = index;
    const q = this.questions[index];

    // Update tags
    document.getElementById("q-domain-badge").textContent = q.domain;
    document.getElementById("q-counter-label").textContent = `QUESTION ${index + 1} OF ${this.questions.length}`;
    document.getElementById("q-text").textContent = q.question;

    const scenarioEl = document.getElementById("q-scenario");
    if (q.scenario) {
      scenarioEl.style.display = "block";
      scenarioEl.textContent = `SCENARIO CONTEXT: ${q.scenario}`;
    } else {
      scenarioEl.style.display = "none";
    }

    // Flag button state
    const flagBtn = document.getElementById("btn-flag-q");
    if (this.flagged.has(q.id)) {
      flagBtn.classList.add("flagged");
      flagBtn.innerHTML = `<span>⚑</span> Flagged for Review`;
    } else {
      flagBtn.classList.remove("flagged");
      flagBtn.innerHTML = `<span>⚐</span> Flag for Review`;
    }

    // Render options
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    const letters = ["A", "B", "C", "D"];
    q.options.forEach((optText, optIdx) => {
      const isSelected = this.userAnswers[q.id] === optIdx;
      const optDiv = document.createElement("div");
      optDiv.className = `option-item ${isSelected ? "selected" : ""}`;
      optDiv.innerHTML = `
        <div class="opt-letter">${letters[optIdx]}</div>
        <div class="opt-content">${optText}</div>
      `;
      optDiv.addEventListener("click", () => {
        this.selectOption(optIdx);
      });
      optionsContainer.appendChild(optDiv);
    });

    // Update Prev / Next button state
    const prevBtn = document.getElementById("btn-prev-q");
    const nextBtn = document.getElementById("btn-next-q");
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) {
      if (index === this.questions.length - 1) {
        nextBtn.innerHTML = `Review & Submit ➔`;
      } else {
        nextBtn.innerHTML = `Next Question ➔`;
      }
    }

    this.updateMatrix();
  }

  selectOption(optIdx) {
    const q = this.questions[this.currentIndex];
    this.userAnswers[q.id] = optIdx;
    window.soundEngine.select();

    // Re-render current options selection state
    document.querySelectorAll(".option-item").forEach((el, idx) => {
      el.classList.toggle("selected", idx === optIdx);
    });

    this.updateMatrix();
  }

  toggleFlag() {
    const q = this.questions[this.currentIndex];
    if (this.flagged.has(q.id)) {
      this.flagged.delete(q.id);
    } else {
      this.flagged.add(q.id);
    }
    window.soundEngine.flag();
    this.loadQuestion(this.currentIndex);
  }

  navigate(delta) {
    const newIdx = this.currentIndex + delta;
    if (newIdx >= this.questions.length) {
      this.promptSubmission();
      return;
    }
    if (newIdx >= 0 && newIdx < this.questions.length) {
      window.soundEngine.navigate();
      this.loadQuestion(newIdx);
    }
  }

  renderMatrix() {
    const grid = document.getElementById("matrix-grid");
    if (!grid) return;
    grid.innerHTML = "";

    this.questions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.className = "matrix-btn";
      btn.id = `matrix-btn-${q.id}`;
      btn.textContent = idx + 1;
      btn.addEventListener("click", () => {
        window.soundEngine.click();
        this.loadQuestion(idx);
      });
      grid.appendChild(btn);
    });
  }

  updateMatrix() {
    this.questions.forEach((q, idx) => {
      const btn = document.getElementById(`matrix-btn-${q.id}`);
      if (!btn) return;
      btn.className = "matrix-btn";
      if (idx === this.currentIndex) btn.classList.add("current");
      if (this.userAnswers[q.id] !== undefined) btn.classList.add("answered");
      if (this.flagged.has(q.id)) btn.classList.add("flagged");
    });
  }

  promptSubmission() {
    const answeredCount = Object.keys(this.userAnswers).length;
    const unansweredCount = this.questions.length - answeredCount;
    const flaggedCount = this.flagged.size;

    document.getElementById("modal-answered-stat").textContent = answeredCount;
    document.getElementById("modal-unanswered-stat").textContent = unansweredCount;
    document.getElementById("modal-flagged-stat").textContent = flaggedCount;

    const modal = document.getElementById("submit-modal");
    if (modal) modal.classList.add("active");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  }

  finalizeExam() {
    this.closeModal("submit-modal");
    clearInterval(this.timerInterval);
    this.isExamActive = false;
    this.examFinished = true;

    // Calculate score
    let correctCount = 0;
    const domainStats = {
      scoping: { correct: 0, total: 0 },
      gtm: { correct: 0, total: 0 },
      economics: { correct: 0, total: 0 },
      defensibility: { correct: 0, total: 0 },
      grit: { correct: 0, total: 0 }
    };

    this.questions.forEach(q => {
      const userChoice = this.userAnswers[q.id];
      const isCorrect = userChoice === q.correct;
      if (isCorrect) correctCount++;

      if (domainStats[q.domainKey]) {
        domainStats[q.domainKey].total++;
        if (isCorrect) domainStats[q.domainKey].correct++;
      }
    });

    const totalQuestions = this.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= 80;

    this.results = {
      correctCount,
      totalQuestions,
      percentage,
      passed,
      domainStats,
      timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      certHash: `MVP-C1-${passed ? "PASS" : "DIAG"}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    };

    this.renderResults();
  }

  renderResults() {
    const r = this.results;
    this.showScreen("screen-results");

    const hero = document.getElementById("result-hero");
    const stamp = document.getElementById("result-stamp");
    const scoreNum = document.getElementById("result-score-number");
    const msg = document.getElementById("result-message");
    const passActions = document.getElementById("passed-action-panel");
    const failActions = document.getElementById("failed-action-panel");

    scoreNum.textContent = r.percentage;

    if (r.passed) {
      window.soundEngine.pass();
      window.confetti.fire(180);
      setTimeout(() => window.confetti.fire(120), 400);

      hero.className = "result-hero passed";
      stamp.className = "badge-stamp passed";
      stamp.innerHTML = `✓ CERTIFIED & ADMITTED — COHORT 1 QUALIFIED`;
      msg.innerHTML = `Congratulations, <strong>${this.candidate.fullName}</strong>! You have scored <strong>${r.percentage}%</strong> on the EveCount Venture Studio Entrance Exam, exceeding the strict 80% passing bar. Your admission offer letter and direct venture partner calendar access are unlocked below.`;
      
      passActions.style.display = "block";
      failActions.style.display = "none";
      const exclusiveContent = document.getElementById("passed-exclusive-content");
      if (exclusiveContent) exclusiveContent.style.display = "block";
      this.populateOfferLetter();
    } else {
      window.soundEngine.fail();

      hero.className = "result-hero failed";
      stamp.className = "badge-stamp failed";
      stamp.innerHTML = `✕ THRESHOLD NOT MET — 80% REQUIRED`;
      msg.innerHTML = `You scored <strong>${r.percentage}%</strong> (${r.correctCount} / ${r.totalQuestions} correct). Our venture studio maintains an unyielding 80% qualification standard for Cohort 1. Partner calendar slots and official offer letters are unlocked only for scores ≥ 80%. Review your domain breakdown below and retake the diagnostic once prepared.`;

      passActions.style.display = "none";
      failActions.style.display = "block";
      const exclusiveContent = document.getElementById("passed-exclusive-content");
      if (exclusiveContent) exclusiveContent.style.display = "none";
    }

    // Always update candidate names across all labels
    document.querySelectorAll(".cand-display-name").forEach(el => el.textContent = this.candidate.fullName);
    document.querySelectorAll(".cand-display-startup").forEach(el => el.textContent = this.candidate.startupName);
    const offerCandName = document.getElementById("offer-cand-name");
    const offerStartupName = document.getElementById("offer-startup-name");
    if (offerCandName) offerCandName.textContent = this.candidate.fullName;
    if (offerStartupName) offerStartupName.textContent = this.candidate.startupName;

    // Render Domain Competency Bars
    const barsContainer = document.getElementById("domain-bars-container");
    barsContainer.innerHTML = "";

    Object.keys(DOMAIN_METADATA).forEach(key => {
      const meta = DOMAIN_METADATA[key];
      const stat = r.domainStats[key] || { correct: 0, total: 4 };
      const domainPct = Math.round((stat.correct / stat.total) * 100);

      const item = document.createElement("div");
      item.className = "domain-bar-item";
      item.innerHTML = `
        <div class="bar-meta">
          <span class="domain-name">${meta.name}</span>
          <span class="domain-score">${stat.correct}/${stat.total} (${domainPct}%)</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill ${domainPct >= 75 ? "success" : domainPct >= 50 ? "warning" : ""}" style="width: ${domainPct}%"></div>
        </div>
      `;
      barsContainer.appendChild(item);
    });

    // Render Question Explanation Review
    this.renderDetailedReview();
  }

  renderDetailedReview() {
    const list = document.getElementById("detailed-review-list");
    list.innerHTML = "";

    this.questions.forEach((q, idx) => {
      const userChoice = this.userAnswers[q.id];
      const isCorrect = userChoice === q.correct;
      const letters = ["A", "B", "C", "D"];

      const item = document.createElement("div");
      item.className = "accordion-item";
      item.innerHTML = `
        <div class="accordion-header">
          <div>
            <span class="q-number-label">QUESTION ${idx + 1} • ${q.domain}</span>
            <div class="accordion-q-title">${q.question}</div>
          </div>
          <span class="q-status-badge ${isCorrect ? "correct" : "incorrect"}">
            ${isCorrect ? "CORRECT (+5%)" : "INCORRECT (0%)"}
          </span>
        </div>
        <div class="accordion-body">
          <div class="review-answer-row">
            <span class="label">YOUR ANSWER:</span>
            <span style="color: ${isCorrect ? "var(--accent-emerald)" : "var(--accent-rose)"}">
              ${userChoice !== undefined ? `[${letters[userChoice]}] ${q.options[userChoice]}` : "Unanswered"}
            </span>
          </div>
          ${!isCorrect ? `
          <div class="review-answer-row">
            <span class="label">CORRECT:</span>
            <span style="color: var(--accent-emerald); font-weight: 600;">
              [${letters[q.correct]}] ${q.options[q.correct]}
            </span>
          </div>
          ` : ""}
          <div class="review-explanation">
            <strong>Venture Studio Insight:</strong> ${q.explanation}
          </div>
        </div>
      `;
      list.appendChild(item);
    });
  }

  populateOfferLetter() {
    const r = this.results;
    document.getElementById("offer-cand-name").textContent = this.candidate.fullName;
    document.getElementById("offer-startup-name").textContent = this.candidate.startupName;
    document.getElementById("offer-date").textContent = r.timestamp;
    document.getElementById("offer-cert-hash").textContent = r.certHash;
    document.getElementById("offer-score-badge").textContent = `${r.percentage}% Qualification Score`;
  }

  populateBookingDates() {
    const dateSelect = document.getElementById("booking-date-select");
    if (!dateSelect) return;
    dateSelect.innerHTML = "";

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) { // Weekdays only
        const opt = document.createElement("option");
        const str = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        opt.value = str;
        opt.textContent = `${str} (Cohort 1 Screening Window)`;
        dateSelect.appendChild(opt);
      }
    }

    // Time slot button selection
    document.querySelectorAll(".slot-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.booking.time = btn.dataset.time || btn.textContent;
      });
    });

    // Partner card selection
    document.querySelectorAll(".partner-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".partner-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        this.booking.partner = card.dataset.partner;
      });
    });
  }

  confirmBooking() {
    const dateSelect = document.getElementById("booking-date-select");
    const dateVal = dateSelect ? dateSelect.value : "Upcoming Date";
    const notesInput = document.getElementById("booking-pitch-notes");
    const notes = notesInput ? notesInput.value.trim() : "";

    this.booking.date = dateVal;
    this.booking.notes = notes;

    window.soundEngine.select();

    // Show Confirmation Dialog
    const confirmModal = document.getElementById("booking-modal");
    document.getElementById("modal-booking-partner").textContent = this.booking.partner;
    document.getElementById("modal-booking-datetime").textContent = `${this.booking.date} at ${this.booking.time}`;
    document.getElementById("modal-booking-email").textContent = this.candidate.email;
    confirmModal.classList.add("active");

    // Hook up ICS calendar download
    const icsBtn = document.getElementById("btn-download-ics");
    if (icsBtn) {
      icsBtn.onclick = () => this.downloadIcsFile();
    }
  }

  downloadIcsFile() {
    const title = `EveCount Venture Studio - Cohort 1 Interview (${this.candidate.startupName})`;
    const desc = `Cohort 1 Admission Meeting with ${this.booking.partner}. Candidate: ${this.candidate.fullName} (${this.candidate.email}). Topic: Term Sheet Walkthrough & Technical Acceleration Roadmap.`;
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EveCount Venture Studio//Cohort 1 Admission//EN
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:${desc}
LOCATION:Google Meet / Zoom (Studio Link)
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: Cohort 1 Partner Interview
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `EveCount_Cohort1_Interview.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Calendar invite downloaded (.ics)");
  }

  copyOfferLetter() {
    const letterText = `
EVECOUNT VENTURE STUDIO — COHORT 1 ADMISSION OFFER & TERM SHEET
Date: ${this.results?.timestamp || "2026"}
Candidate: ${this.candidate.fullName}
Startup Entity: ${this.candidate.startupName}
Verification Reference: ${this.results?.certHash || "MVP-C1-PASS"}
Score: ${this.results?.percentage}% (Passing threshold: 80%)

KEY INVESTMENT TERMS:
- Investment Capital: $125,000 USD via standard Post-Money SAFE
- Valuation Cap: $2,500,000 USD (5.0% Studio equity participation)
- Acceleration Duration: 12 Weeks (Phase 1 MVP Validation to Demo Day)
- Resources: Dedicated Principal Engineer, $100k Cloud Credits (AWS/GCP), In-House Design Sprint
- Governing Law: Delaware / Singapore international standard venture jurisdiction
    `.trim();

    navigator.clipboard.writeText(letterText).then(() => {
      this.showToast("Offer Letter text copied to clipboard!");
    }).catch(() => {
      this.showToast("Failed to copy text", "error");
    });
  }

  resetExam() {
    this.userAnswers = {};
    this.flagged.clear();
    this.timerSeconds = 25 * 60;
    this.results = null;
    this.currentIndex = 0;
    this.isExamActive = false;
    this.examFinished = false;
    document.getElementById("header-exam-meta").style.display = "none";
    this.showScreen("screen-orientation");
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ExamApp();
});
