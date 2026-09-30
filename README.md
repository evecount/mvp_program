# EveCount Venture Studio — Cohort 1 Entrance Examination & Admission Portal ⚡

[![Deploy to GitHub Pages](https://github.com/evecount/mvp_program/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/evecount/mvp_program/actions/workflows/deploy-pages.yml)
[![Live Portal](https://img.shields.io/badge/Live_Portal-GitHub_Pages-00f2fe.svg)](https://evecount.github.io/mvp_program/)
[![Cohort](https://img.shields.io/badge/Cohort-1_(2026)-10b981.svg)](https://github.com/evecount/mvp_program)
[![Passing Threshold](https://img.shields.io/badge/Passing_Threshold-80%25-f59e0b.svg)](https://github.com/evecount/mvp_program)

An interactive, high-stakes proctored diagnostic examination portal designed for **EveCount Venture Studio (Cohort 1)**. Modeled after rigorous cloud certifications (such as AWS Solutions Architect and GCP Engineer exams), this platform screens aspiring founders on real 0-to-1 execution, ruthless MVP scoping, and venture finance acumen.

---

## 🎯 Program Mechanism

```
   ┌───────────────────────┐
   │  Candidate Check-in   │  Founder Profile, Startup Concept, Domain Track
   └──────────┬────────────┘
              │
              ▼
   ┌───────────────────────┐
   │  Proctored Exam Room  │  20 Questions • 25 Min Timer • Question Matrix
   └──────────┬────────────┘
              │
              ▼
   ┌───────────────────────┐
   │ Instant Scoring Dial  │  Automated Real-Time Grading & Percentile Calc
   └──────────┬────────────┘
              │
       ┌──────┴──────┐
       │             │
  < 80% Fail     ≥ 80% PASS
       │             │
       ▼             ▼
┌──────────────┐  ┌────────────────────────────────────────────────────────┐
│  Diagnostic  │  │ 1. Official Cohort 1 Admission Offer Letter ($125k)    │
│  Syllabus &  │  │ 2. Post-Money SAFE Term Sheet Model ($2.5M Cap)        │
│  Retake Gate │  │ 3. Direct Partner Interview Booking (Google Meet/.ics) │
└──────────────┘  └────────────────────────────────────────────────────────┘
```

---

## 📊 Core Diagnostic Domains (20 Questions)

Candidates are tested on 20 comprehensive scenarios representing the daily realities of pre-seed startups:

| Domain | Focus & Heuristics | Questions |
| :--- | :--- | :---: |
| **1. MVP Scoping & Rapid Velocity** | Concierge / Wizard-of-Oz prototypes, eliminating premature microservices, identifying asymptotic retention plateaus, resisting low-ACV bespoke distractions. | 4 |
| **2. Customer Discovery & Go-To-Market** | *The Mom Test* questioning rules, founder-led outbound sales, fully-loaded CAC calculations, venture-admissible enterprise LOIs. | 4 |
| **3. Unit Economics, Runway & SAFE Financing** | Post-Money SAFE valuation caps & dilution percentages, Net Burn vs Gross Burn, LTV/CAC benchmark ratios (≥ 3.0x), priced rounds vs convertible notes. | 4 |
| **4. Defensibility, Moats & Wedge Strategy** | Hamilton Helmer's *7 Powers*, bottom-up TAM modeling, counter-positioning business models, Trojan-horse wedge market entry. | 4 |
| **5. Founder Decision Making & Crisis Execution** | Standard 4-year vesting with 1-year cliff enforcement, surviving short runways, empirical pivot criteria, defending against predatory term sheets. | 4 |

---

## 🚀 Key Features

- **Proctored Exam Experience**:
  - Live 25:00 countdown clock with color-coded warning alert at 5:00 minutes.
  - Question matrix navigation drawer (Answered, Unanswered, Flagged, Current).
  - Keyboard shortcuts (`A, B, C, D` or `1, 2, 3, 4` to select options; `F` to flag; Arrow keys to navigate).
  - Synthesized Web Audio API sound effects (crisp UI ticks, select tones, time warnings, pass fanfare).
  - Fullscreen proctored mode toggle.
- **Strict 80% Passing Gate**:
  - Requires **≥ 16 / 20 correct answers** to unlock partner conversations.
  - Submission guard modal preventing accidental submits with unanswered questions.
- **Sample Incubator / Studio Offer Letter**:
  - Dynamically personalized with candidate name, startup working title, verification hash, and date.
  - Modeled after elite venture studios (e.g. Y Combinator, Antler, Atomic, Entrepreneur First).
  - Formal terms: **$125,000 USD** investment via Post-Money SAFE at a **$2,500,000 USD valuation cap** (5.00% equity).
  - Includes dedicated fractional CTO/engineer pairing, $100k cloud compute credits, and in-house design sprint squad.
  - Instant **"Print / Save as PDF"** and **"Copy Term Sheet Text"** capabilities.
- **Integrated Partner Interview Scheduling**:
  - Direct selection of Venture Partner (Managing GP, EIR/Head of Product, Investment Principal).
  - Date & time window selection with automated **`.ics` Calendar File** generation for 1-click import into Google Calendar or Apple Calendar.
- **Zero-Dependency Architecture**:
  - Built with pure HTML5, CSS3, and ES6 JavaScript.
  - Zero build step, zero npm vulnerability exposure, instant loading time under 50ms.

---

## 🛠️ Local Development & Quick Start

Simply clone and open `index.html` in any web browser:

```bash
# Clone the repository
git clone https://github.com/evecount/mvp_program.git

# Navigate to project folder
cd mvp_program

# Open index.html directly
# On Windows:
start index.html

# Or run with any lightweight server (e.g. Python):
python -m http.server 8000
```

---

## 🌐 Deploying to GitHub Pages

This repository includes a pre-configured GitHub Actions workflow in [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. Push your code to the `main` branch of `https://github.com/evecount/mvp_program`:
   ```bash
   git add .
   git commit -m "feat: complete venture studio examination portal"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment > Source**, choose **GitHub Actions**.
3. The workflow will automatically publish your portal at:
   ```
   https://evecount.github.io/mvp_program/
   ```

---

## 📜 License & Copyright

© 2026 EveCount Venture Studio. All rights reserved. 
Standard Delaware / Singapore accelerator terms and SAFE frameworks adapted under standard YC SAFE conventions.
