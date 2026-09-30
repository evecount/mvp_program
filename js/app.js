/**
 * EveCount Venture Studio - Cohort 1 Examination Portal Application Logic
 */

class ExamApp {
  constructor() {
    this.candidate = {
      fullName: "",
      email: "",
      startupName: "",
      track: "B2B Enterprise AI & Workflow",
      evidence: "",
      first30days: "",
      failureRisk: "",
      agreed: false
    };

    this.questions = EXAM_QUESTIONS;
    this.currentIndex = 0;
    this.userAnswers = {}; // { [qId]: optionIndex }
    this.flagged = new Set(); // Set of qIds

    this.timerSeconds = 60 * 60; // 60 minutes for 50 questions
    this.timerInterval = null;
    this.isExamActive = false;
    this.examFinished = false;

    this.results = null;

    this.booking = {
      partner: "James Sun (Venture Partner • Admissions Lead)",
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
    this.populateRubricTable();
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

    // Application Transmission to Studio
    document.getElementById("btn-submit-application")?.addEventListener("click", () => this.transmitApplication());
    document.getElementById("btn-copy-payload")?.addEventListener("click", () => this.copyApplicationPayload());
    document.getElementById("btn-download-record")?.addEventListener("click", () => this.downloadApplicationProof());

    // LinkedIn Share Buttons
    document.getElementById("hero-btn-linkedin-share")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.shareOnLinkedIn();
    });

    // Retake Exam
    document.getElementById("btn-retake-exam")?.addEventListener("click", () => this.resetExam());

    // Rubric Modal triggers
    document.getElementById("btn-open-rubric-modal")?.addEventListener("click", () => {
      const modal = document.getElementById("rubric-modal");
      if (modal) modal.classList.add("active");
    });

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
        this.showToast("Inquiry submitted! Our team at 71 Ayer Rajah Crescent will respond within 24h.");
        window.location.href = `mailto:partnerships@evecount.com?subject=${subject}&body=${body}`;
        inqForm.reset();
      });
    }

    // Audience Chips Active State Navigation
    document.querySelectorAll(".audience-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".audience-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });

    // Autofill Sample Answers button
    document.getElementById("btn-autofill-sample")?.addEventListener("click", () => {
      const nameInput = document.getElementById("cand-name");
      const emailInput = document.getElementById("cand-email");
      const startupInput = document.getElementById("cand-startup");
      const qEvidence = document.getElementById("q-evidence");
      const qFirst30 = document.getElementById("q-first30days");
      const qRisk = document.getElementById("q-failure-risk");

      if (nameInput) nameInput.value = "Alex Chen";
      if (emailInput) emailInput.value = "alex@nexusflow.ai";
      if (startupInput) startupInput.value = "Nexus Flow AI";
      if (qEvidence) qEvidence.value = "We conducted 18 structured customer interviews with mid-market logistics managers. 7 signed LOIs for an automated reconciliation pilot at $650/month each; 4 shared confidential sample freight invoices to benchmark data accuracy.";
      if (qFirst30) qFirst30.value = "1. Days 1–10: Deploy a Wizard-of-Oz invoice parser for our 3 warmest LOI signups to process 20 live shipment files manually.\n2. Days 11–20: Measure discrepancies caught vs manual audits, iterate workflow UX with store operators.\n3. Days 21–30: Convert 2 pilot partners into upfront annual prepaid contracts ($7,800 ACV) before writing automated ERP connectors.";
      if (qRisk) qRisk.value = "Slow enterprise procurement cycles (90-180 days) stalling cash flow before reaching Default Alive. To counter this, we are strictly prioritizing mid-market operators who can swipe corporate credit cards within 14 days.";

      window.soundEngine?.select();
      this.showToast("Sample candidate answers loaded!");
    });

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
      alert("Please confirm the honor code to proceed with the benchmark.");
      return;
    }

    this.candidate.fullName = nameInput.value.trim() || "Venture Candidate";
    this.candidate.email = emailInput.value.trim() || "founder@startup.io";
    this.candidate.startupName = startupInput.value.trim() || "Stealth Venture";
    this.candidate.track = trackInput.value;
    this.candidate.evidence = document.getElementById("q-evidence")?.value.trim() || "Customer discovery interviews and pilot pipeline in progress";
    this.candidate.first30days = document.getElementById("q-first30days")?.value.trim() || "30-day velocity plan and MVP customer tests";
    this.candidate.failureRisk = document.getElementById("q-failure-risk")?.value.trim() || "Sales cycle velocity and runway management";

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
    document.body.classList.add("exam-mode");
    this.showScreen("screen-exam");
    window.soundEngine.select();
    this.showToast("The 0-to-1 Founder Benchmark Active");
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
        this.showToast("5 minutes remaining in benchmark session!", "warning");
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
    document.body.classList.remove("exam-mode");
    this.isExamActive = false;
    this.examFinished = true;

    // Calculate score & 6 Panel Dimensions (James Sun Framework)
    let correctCount = 0;
    const domainStats = {
      founder: { correct: 0, total: 0 },
      insight: { correct: 0, total: 0 },
      validation: { correct: 0, total: 0 },
      execution: { correct: 0, total: 0 },
      coachability: { correct: 0, total: 0 },
      fit: { correct: 0, total: 0 }
    };

    this.questions.forEach(q => {
      const userChoice = this.userAnswers[q.id];
      const isCorrect = userChoice === q.correct;
      if (isCorrect) correctCount++;

      const dimKey = (typeof QUESTION_DIMENSION_MAP !== "undefined" && QUESTION_DIMENSION_MAP[q.id]) || "execution";
      if (domainStats[dimKey]) {
        domainStats[dimKey].total++;
        if (isCorrect) domainStats[dimKey].correct++;
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
      certHash: `MAMBA-C1-${passed ? "PASS" : "DIAG"}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
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
      stamp.innerHTML = `✓ CERTIFIED & ADMITTED — MAMBA MVP QUALIFIED`;
      msg.innerHTML = `Congratulations, <strong>${this.candidate.fullName}</strong>! You scored <strong>${r.percentage}%</strong> on the Mamba MVP Entrance Exam, exceeding the strict 80% passing bar. Your formal admission offer letter from James Sun and direct partner calendar access are unlocked below.`;
      
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
      msg.innerHTML = `You scored <strong>${r.percentage}%</strong> (${r.correctCount} / ${r.totalQuestions} correct). Mamba MVP maintains an unyielding 80% qualification standard for Cohort 1. Review your 6-dimension panel breakdown below and retake the diagnostic once prepared.`;

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

    // Render 6 Dimension Panel Competency Bars
    const barsContainer = document.getElementById("domain-bars-container");
    barsContainer.innerHTML = "";

    Object.keys(DOMAIN_METADATA).forEach(key => {
      const meta = DOMAIN_METADATA[key];
      const stat = r.domainStats[key] || { correct: 0, total: 8 };
      const domainPct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;

      const item = document.createElement("div");
      item.className = "domain-bar-item";
      item.innerHTML = `
        <div class="bar-meta">
          <span class="domain-name"><strong>${meta.name}</strong> <span style="color: var(--accent-orange); font-size: 0.8rem; font-weight: 800;">[Weight: ${meta.weight}]</span></span>
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

  populateRubricTable() {
    const tbody = document.getElementById("rubric-table-body");
    if (!tbody || typeof MAMBA_INTERVIEW_QUESTIONS_18 === "undefined") return;
    tbody.innerHTML = "";

    MAMBA_INTERVIEW_QUESTIONS_18.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--accent-orange);">${item.num}. ${item.area}</td>
        <td style="color: var(--text-primary); font-weight: 600;">${item.question}</td>
        <td style="color: var(--text-secondary); font-size: 0.82rem;">${item.lookingFor}</td>
      `;
      tbody.appendChild(tr);
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
MAMBA MVP VENTURE STUDIO — COHORT 1 ADMISSION OFFER & TERM SHEET
Date: ${this.results?.timestamp || "2026"}
Candidate: ${this.candidate.fullName}
Startup Entity: ${this.candidate.startupName}
Focus Track: ${this.candidate.track}
Verification Reference: ${this.results?.certHash || "MAMBA-C1-PASS"}
Score: ${this.results?.percentage}% (Passing threshold: 80%)

KEY INVESTMENT TERMS:
- Program: Mamba MVP (Cohort 1) — 71 Ayer Rajah Crescent, Singapore
- Investment Capital: $125,000 USD via standard Post-Money SAFE
- Valuation Cap: $2,500,000 USD (5.0% Studio equity participation)
- Acceleration Duration: 90 Days (Phase 1 MVP Validation to Demo Day)
- Program Leadership: James Sun (Venture Partner • Admissions Lead)
- Resources: Dedicated Principal Engineer, $100k Cloud Credits (AWS/GCP), In-House Design Sprint
- Governing Law: Delaware / Singapore international standard venture jurisdiction
    `.trim();

    navigator.clipboard.writeText(letterText).then(() => {
      this.showToast("Offer Letter text copied to clipboard!");
    }).catch(() => {
      this.showToast("Failed to copy text", "error");
    });
  }

  getApplicationPayload() {
    return {
      benchmark: "The 0-to-1 Founder Benchmark (Cohort 1)",
      cohort: "Cohort 1 (2026)",
      location: "71 Ayer Rajah Crescent, Singapore",
      candidate: {
        name: this.candidate.fullName,
        email: this.candidate.email,
        startup: this.candidate.startupName,
        track: this.candidate.track
      },
      mandatoryQuestionnaire: {
        q1_evidenceOfDemand: {
          question: "What evidence do you have that somebody actually wants this?",
          purpose: "Separates founders who have spoken to the market from people who simply like their own idea.",
          response: this.candidate.evidence
        },
        q2_first30DaysExecution: {
          question: "If you were accepted today, what are the first three things you would do in the next 30 days?",
          purpose: "Reveals execution ability extremely quickly (specific actions vs broad aspirations).",
          response: this.candidate.first30days
        },
        q3_strongestFailureRisk: {
          question: "What is the strongest reason this business might fail?",
          purpose: "Tests whether the founder understands their own risks and intellectual honesty.",
          response: this.candidate.failureRisk
        }
      },
      evaluation: {
        scorePercentage: this.results ? `${this.results.percentage}%` : "N/A",
        scoreRaw: this.results ? `${this.results.correctCount} / ${this.results.totalQuestions}` : "N/A",
        qualified: this.results ? this.results.passed : false,
        verificationHash: this.results?.certHash || "N/A",
        certifiedDate: this.results?.timestamp || new Date().toISOString(),
        panelDimensionsWeighted: Object.keys(DOMAIN_METADATA).map(key => {
          const meta = DOMAIN_METADATA[key];
          const stat = this.results?.domainStats[key] || { correct: 0, total: 0 };
          const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
          return {
            dimensionKey: key,
            name: meta.name,
            weight: meta.weight,
            correct: stat.correct,
            total: stat.total,
            percentage: `${pct}%`
          };
        })
      },
      answersSummary: this.questions.map(q => ({
        id: q.id,
        domain: q.domain,
        selectedOption: this.userAnswers[q.id] !== undefined ? q.options[this.userAnswers[q.id]] : "Unanswered",
        correctOption: q.options[q.correct],
        isCorrect: this.userAnswers[q.id] === q.correct
      }))
    };
  }

  transmitApplication() {
    if (!this.results) return;
    const payload = this.getApplicationPayload();
    const subject = encodeURIComponent(`[Mamba MVP Cohort 1] ${this.candidate.startupName} (${this.candidate.fullName}) - Score: ${this.results.percentage}% [${this.results.certHash}]`);
    const body = encodeURIComponent(`Dear Mamba MVP Admissions Committee & James Sun,

Please find my verified entrance diagnostic submission and founder questionnaire for Cohort 1 below:

Candidate: ${this.candidate.fullName}
Startup Project: ${this.candidate.startupName}
Focus Track: ${this.candidate.track}
Email: ${this.candidate.email}

=== MANDATORY FOUNDER QUESTIONNAIRE ===
1. What evidence do you have that somebody actually wants this?
${this.candidate.evidence}

2. If you were accepted today, what are the first three things you would do in the next 30 days?
${this.candidate.first30days}

3. What is the strongest reason this business might fail?
${this.candidate.failureRisk}

=== 50-DECISION 0-TO-1 FOUNDER BENCHMARK ===
Overall Score: ${this.results.percentage}% (${this.results.correctCount}/${this.results.totalQuestions} validated)
Threshold Status: ${this.results.passed ? "QUALIFIED & ADMITTED (>= 80%)" : "DIAGNOSTIC (Under 80%)"}
Verification Code: ${this.results.certHash}
Submission Date: ${this.results.timestamp}

=== 6-DIMENSION PANEL SCORING BREAKDOWN ===
${Object.keys(DOMAIN_METADATA).map(k => {
  const m = DOMAIN_METADATA[k];
  const s = this.results.domainStats[k] || { correct: 0, total: 0 };
  const p = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  return `• ${m.name} (Weight: ${m.weight}): ${s.correct}/${s.total} (${p}%)`;
}).join("\n")}

Attached Full JSON Payload:
${JSON.stringify(payload, null, 2)}
    `);

    // Update modal score preview
    const scoreEl = document.getElementById("modal-app-score");
    if (scoreEl) {
      scoreEl.textContent = `${this.results.percentage}% (${this.results.passed ? "Cohort 1 Qualified" : "Diagnostic Completed"})`;
    }

    const modal = document.getElementById("app-transmitted-modal");
    if (modal) modal.classList.add("active");

    // Open mailto link as fallback
    window.location.href = `mailto:admissions@evecount.com?subject=${subject}&body=${body}`;
    this.showToast("Application dossier dispatched to admissions@evecount.com");
  }

  copyApplicationPayload() {
    const payload = this.getApplicationPayload();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      this.showToast("Application payload (.json) copied to clipboard!");
    }).catch(() => {
      this.showToast("Failed to copy payload", "error");
    });
  }

  downloadApplicationProof() {
    const payload = this.getApplicationPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `Mamba_MVP_Cohort1_Proof_${this.candidate.startupName.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Certificate proof downloaded (.json)");
  }

  shareOnLinkedIn() {
    const portalUrl = "https://evecount.github.io/mvp_program/";
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(portalUrl)}`;
    window.open(shareUrl, "_blank", "width=600,height=600");
  }

  resetExam() {
    this.userAnswers = {};
    this.flagged.clear();
    this.timerSeconds = 60 * 60; // 60 minutes
    this.results = null;
    this.currentIndex = 0;
    this.isExamActive = false;
    this.examFinished = false;
    document.body.classList.remove("exam-mode");
    document.getElementById("header-exam-meta").style.display = "none";
    this.showScreen("screen-orientation");
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ExamApp();
});
