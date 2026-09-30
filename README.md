# EveCount Venture Studio — Cohort 1 Entrance Examination & Admission Portal ⚡

[![Deploy to GitHub Pages](https://github.com/evecount/mvp_program/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/evecount/mvp_program/actions/workflows/deploy-pages.yml)
[![Live Portal](https://img.shields.io/badge/Live_Portal-GitHub_Pages-00f2fe.svg)](https://evecount.github.io/mvp_program/)
[![Cohort](https://img.shields.io/badge/Cohort-1_(2026)-10b981.svg)](https://github.com/evecount/mvp_program)
[![Question Count](https://img.shields.io/badge/Questions-50_Scenarios-blue.svg)](https://github.com/evecount/mvp_program)
[![Passing Threshold](https://img.shields.io/badge/Passing_Threshold-80%25_(40%2F50)-f59e0b.svg)](https://github.com/evecount/mvp_program)

An interactive, high-stakes proctored diagnostic examination portal designed for **EveCount Venture Studio (Cohort 1)**. Modeled after rigorous enterprise certification exams (such as AWS Solutions Architect and Cloud Practitioner examinations), this platform evaluates aspiring founders across 50 deep scenarios on real 0-to-1 execution, ruthless MVP scoping, and venture finance acumen.

**Live Portal URL (GitHub Pages)**: [https://evecount.github.io/mvp_program/](https://evecount.github.io/mvp_program/)

---

## 🎯 Program Mechanism & Founder Funnel

```
   ┌───────────────────────┐
   │  Candidate Check-in   │  Founder Profile, Startup Concept, Domain Track
   └──────────┬────────────┘
              │
              ▼
   ┌───────────────────────┐
   │  Proctored Exam Room  │  50 Questions • 60-Minute Countdown • Live Matrix
   └──────────┬────────────┘
              │
              ▼
   ┌───────────────────────┐
   │ Instant Scoring Dial  │  Automated Real-Time Grading & Percentile Calc
   └──────────┬────────────┘
              │
       ┌──────┴──────┐
       │             │
  < 80% Fail     ≥ 80% PASS (40+ / 50)
       │             │
       ▼             ▼
┌──────────────┐  ┌────────────────────────────────────────────────────────┐
│  Diagnostic  │  │ 1. Formal Cohort 1 Admission Offer Letter ($125,000)   │
│  Syllabus &  │  │ 2. Post-Money SAFE Term Sheet Model ($2.5M Cap / 5%)   │
│  Retake Gate │  │ 3. Direct Partner Interview Booking (Google Meet/.ics) │
└──────────────┘  │ 4. 1-Click LinkedIn Badge & Certified Results Share    │
                  │ 5. Official Application Dossier Transmission to Studio │
                  └────────────────────────────────────────────────────────┘
```

---

## 📊 Core Diagnostic Domains (50 Scenarios, 10 per Track)

Candidates face 50 comprehensive scenarios representing the daily realities of pre-seed startups:

| Domain | Focus & Heuristics | Questions |
| :--- | :--- | :---: |
| **1. MVP Scoping & Engineering Velocity** | Concierge / Wizard-of-Oz prototypes, monoliths vs premature microservices on Kubernetes, asymptotic cohort retention curves, resisting low-ACV custom feature traps, choosing fast tech stacks, LLM latency & streaming UX, technical debt hygiene, vocal minority traps, daily continuous shipping, alpha depth vs vanity waitlists. | 10 |
| **2. Customer Discovery & Go-To-Market** | *The Mom Test* rules on invalid hypotheticals, founder-led outbound sales, fully-loaded CAC calculations, venture-admissible enterprise LOIs, the $15/mo SaaS death valley, polite rejection decoding, high-converting cold outbound anatomy, reverse trials, Weinberg's Bullseye single-channel discipline, voluntary vs involuntary churn. | 10 |
| **3. Unit Economics, Runway & SAFE Financing** | Post-Money SAFE valuation caps & dilution percentages, Net Burn vs Gross Burn, LTV/CAC benchmark ratios ($\ge 3.0\times$), priced rounds vs convertible debt, caps vs discounts, Pre-Money vs Post-Money SAFE compounding, Option Pool Shuffle mechanics, AI wrapper gross margin realities, Paul Graham's Default Alive framework, down-round anti-dilution implications. | 10 |
| **4. Defensibility, Moats & Wedge Strategy** | Hamilton Helmer's *7 Powers*, bottom-up TAM modeling, counter-positioning business models, Trojan-horse wedge market entry, solving the two-sided marketplace chicken-and-egg dilemma, Systems of Record vs utilities, commercial open-source (COSS) monetization, regulatory compliance moats, Vertical SaaS embedded fintech, platform API risk ('sherlocking'). | 10 |
| **5. Founder Decision Making & Crisis Execution** | Standard 4-year vesting with 1-year cliff enforcement, surviving short runways with enterprise whales vs SMB velocity, empirical pivot criteria, defending against predatory term sheets (35% equity & personal guarantees), co-founder decision rights & deadlock prevention, humane layoff execution, high-signal investor updates, key hire departure resilience, day-1 PIIA/IP assignment, and Cohort 1 graduation syndicate criteria. | 10 |

---

## 🚀 Key Features

- **AWS-Style Proctored Examination Suite**:
  - Live **60:00 Countdown Clock** with color-coded warning alert at the 5-minute mark.
  - Interactive **50-Question Navigation Grid**: Visual tracking for Answered (green), Unanswered (muted), Flagged for Review (orange dot), and Current Question (cyan glow).
  - Keyboard shortcuts (`A, B, C, D` or `1, 2, 3, 4` to select options; `F` to toggle flag; Arrow keys to navigate).
  - Web Audio API synthesizer for crisp proctored feedback.
  - Fullscreen exam mode toggle.
- **Strict 80% Passing Gate**:
  - Requires **$\ge 40 / 50$ correct answers ($80\%$)** to unlock partner conversations.
  - Submission guard modal preventing accidental submits with unanswered questions.
- **Sample Incubator / Studio Offer Letter**:
  - Dynamically personalized with candidate name, startup working title, verification hash, and date.
  - Modeled after elite venture studios (e.g. Y Combinator, Antler, Atomic, Entrepreneur First).
  - Formal terms: **$125,000 USD** investment via Post-Money SAFE at a **$2,500,000 USD valuation cap** ($5.00\%$ equity).
  - Direct **"🖨️ Print / Save as PDF"** and **"📋 Copy Term Sheet Text"** capabilities.
- **Integrated Partner Interview Scheduling**:
  - Direct selection of Venture Partner (Managing GP, EIR/Head of Product, Investment Principal).
  - Date & time window selection with automated **`.ics` Calendar File** generation for 1-click import into Google Calendar or Apple Calendar.
- **Official Application & Answers Transmission**:
  - Candidates submit their verified answers, domain scores, and thesis directly to the admissions team with 1 click.
  - Includes a downloadable certified JSON payload (`.json`) for verifiable offline submission.
- **LinkedIn Social Sharing**:
  - Rich OpenGraph social cards pre-configured for LinkedIn.
  - 1-click sharing buttons for both the exam challenge and qualified founder admission badges.
- **Zero-Dependency Architecture**:
  - Built with pure HTML5, CSS3, and modern ES6 JavaScript.
  - Hosted directly on **GitHub Pages** without any custom domain or external hosting fees.

---

## 📱 Sample LinkedIn Announcement Post Copy

You can use the following draft for your LinkedIn announcement:

```text
🚀 Announcing the EveCount Venture Studio (Cohort 1) Entrance Examination!

We evaluate early-stage founders the same way cloud architects earn their professional AWS certifications: through rigorous, scenario-based diagnostics.

No pitch deck fluff. No endless email waiting rooms.

We've open-sourced our 50-Question Proctored Entrance Exam covering:
1. 0-to-1 MVP Velocity & Ruthless Scoping
2. Mom Test Customer Discovery & GTM Economics
3. Post-Money SAFE Math, Runway & Cap Tables
4. Defensibility, Moats & Wedge Strategies
5. Founder Crisis Decision-Making

🎯 The Rules:
- 50 Scenario Questions
- 60 Minutes on the Clock
- Instant Automated Scoring
- Passing Threshold: 80% (40 / 50 correct)

If you hit 80%, you instantly unlock:
📜 Our formal Cohort 1 Term Sheet ($125,000 SAFE @ $2.5M cap)
📅 Direct 1-on-1 interview scheduling with our General Partners

Are you ready to test your venture instincts?

👉 Take the examination here: https://evecount.github.io/mvp_program/

#startups #venturecapital #founder #mvp #venturestudio #accelerator
```

---

## 🌐 GitHub Pages Deployment Guide

The portal is hosted entirely on GitHub Pages without requiring any paid domain or hosting servers.

### Method 1: Using GitHub Actions (Pre-Configured)
1. Push code to the `main` branch.
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) will automatically publish the site.

### Method 2: Deploy directly from Branch
1. Navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **Deploy from a branch**.
3. Choose branch: `main` and folder: `/ (root)`.
4. Click **Save**. GitHub Pages will serve `index.html` within 60 seconds at:
   ```
   https://evecount.github.io/mvp_program/
   ```

---

## 📜 License & Copyright

© 2026 EveCount Venture Studio. All rights reserved. 
Standard Delaware / Singapore accelerator terms and SAFE frameworks adapted under standard YC SAFE conventions.
