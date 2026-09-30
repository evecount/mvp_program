/**
 * EveCount Venture Studio - Cohort 1 Entrance Examination
 * Question Bank: 50 Rigorous Diagnostic Scenarios across 5 Foundational Domains
 * Passing Threshold: 80% (40 / 50 correct)
 * Time Allowance: 60 Minutes
 */

const EXAM_QUESTIONS = [
  // =========================================================================
  // DOMAIN 1: MVP Scoping & Engineering Velocity (Questions 1 - 10)
  // =========================================================================
  {
    id: 1,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "You are building an AI-powered automated inventory forecasting tool for multi-location coffee chains. You have 3 weeks before cohort demo day. What represents the true Minimum Viable Product (MVP) to test whether store managers will trust and act on the forecasts?",
    scenario: "Store managers currently use Excel sheets and intuition. Developing an automated two-way ERP sync, mobile application, and multi-tenant user authentication will take 10 weeks of engineering.",
    options: [
      "Build a polished React Native mobile app with mock data to showcase the intended UI/UX to potential buyers.",
      "Send a daily 6:00 AM WhatsApp or SMS message with purchasing numbers calculated manually or via a quick Python script, measuring whether managers actually buy the suggested quantities.",
      "Pause customer testing until SOC2 compliance and automated ERP webhook integrations are fully unit-tested to avoid data contamination.",
      "Launch a Kickstarter and pre-order landing page offering a 50% discount on an annual SaaS license before touching any store data."
    ],
    correct: 1,
    explanation: "This is the classic 'Wizard of Oz / Concierge MVP'. Testing whether operators trust your predictions does not require building real-time bi-directional ERP pipes. A daily WhatsApp message manual test yields immediate behavioral validation with zero engineering overhead."
  },
  {
    id: 2,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "During sprint planning for your B2B SaaS MVP, your technical co-founder insists on deploying a distributed microservices architecture on Kubernetes across multi-region AWS clusters to ensure 99.999% uptime. How should you proceed as CEO?",
    scenario: "Current user count: 0 paying enterprise clients, 4 LOIs (Letters of Intent). Runway: $125,000.",
    options: [
      "Approve the Kubernetes architecture because enterprise buyers require five-nines uptime in vendor security questionnaires.",
      "Hire an external DevOps consultant on contract to assist in configuring Terraform scripts and multi-region failover.",
      "Reject the microservice architecture and mandate a monolithic deployment on a managed platform (e.g., Render, Railway, or single EC2) to minimize deployment friction and maximize shipping speed.",
      "Delay the MVP launch by 6 weeks to complete comprehensive penetration testing and SOC2 Type II certification."
    ],
    correct: 2,
    explanation: "Premature optimization is fatal for pre-seed startups. Until you have verified product-market fit and high traffic concurrency, a simple monolith on managed infrastructure lets you iterate daily. Microservices introduce network overhead, orchestration debt, and massive cognitive drag when your data model is constantly shifting."
  },
  {
    id: 3,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "Which of the following metrics is the most reliable indicator of initial Product-Market Fit (PMF) during an incubator or MVP testing phase?",
    scenario: "Your product has been live for 60 days with 450 registered accounts.",
    options: [
      "Total cumulative signups generated through Product Hunt and LinkedIn viral posts.",
      "High Net Promoter Score (NPS) based on survey responses from users who logged in only once.",
      "A cohort retention curve that flattens asymptotically parallel to the x-axis after week 4 with high repeat usage from a core segment.",
      "The total number of pre-seed investor inbound messages received on Twitter / X."
    ],
    correct: 2,
    explanation: "As Casey Winters and Peter Thiel note, true PMF is proven when the cohort retention curve stops decaying and levels out into a horizontal plateau. Vanity metrics like cumulative signups or one-time upvotes measure distribution noise, not retained value."
  },
  {
    id: 4,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "A design partner requests an extensive custom reporting dashboard with 14 bespoke PDF export layouts before agreeing to pilot your tool. How should a high-conviction venture studio founder respond?",
    scenario: "The prospect is a tier-2 regional firm offering a $400/month pilot.",
    options: [
      "Immediately assign the entire engineering team to build all 14 custom export templates to close the logo.",
      "Decline custom feature builds; offer to manually generate their weekly report via CSV export while investigating the underlying business question they are attempting to answer.",
      "Agree to build the dashboard only if the customer signs a 5-year locked contract with upfront payment.",
      "Pivot the entire company product roadmap to become a dedicated custom reporting agency."
    ],
    correct: 1,
    explanation: "Custom feature requests from low-ACV prospects are deadly distractions. Great founders don't build software blindly; they uncover the root job-to-be-done ('Mom Test' rule) and fulfill it manually or with minimal bespoke code to protect product focus."
  },
  {
    id: 5,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "You are deciding on the tech stack for a 0-to-1 workflow automation tool. Your team is fluent in Next.js/PostgreSQL, but a trending framework on Hacker News promises 15% better micro-benchmarks in Rust. Which principle should dictate your choice?",
    scenario: "You must ship a testable prototype to 5 design partners in 14 days.",
    options: [
      "Choose Rust to ensure the codebase will never need to be rewritten when scaling to 100 million users.",
      "Build with the stack the founding team can write with their eyes closed (Next.js/PostgreSQL), because iteration speed and cycle time trump synthetic runtime micro-optimizations.",
      "Split the backend into Rust and frontend into Next.js and spend week 1 configuring gRPC serialization.",
      "Delay the project until an enterprise architect can audit both frameworks."
    ],
    correct: 1,
    explanation: "At the pre-seed stage, velocity of learning is the sole competitive differentiator. Rewriting code later when you have millions of users is a luxury problem. Pick whatever stack minimizes keystroke-to-production latency today."
  },
  {
    id: 6,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "Your generative AI contract summarizer suffers from 8-second LLM inference latency, causing pilot users to bounce off the screen. What is the leanest engineering solution for your MVP?",
    scenario: "Model calls take 6-10 seconds to generate a 4-page analysis.",
    options: [
      "Train a proprietary 70-billion parameter open-weights model on an on-premise 8xH100 cluster for $200,000.",
      "Implement optimistic UI patterns with streaming responses (Server-Sent Events) and progressive skeleton loaders showing step-by-step reasoning tokens as they arrive.",
      "Shut down the product and conclude that LLMs are commercially unusable for legal documents.",
      "Hide the latency by disabling user cancellation and forcing a full-page modal blocker with an infinite spinner."
    ],
    correct: 1,
    explanation: "Perceived latency is dramatically reduced when users see streaming tokens and incremental progress within 200ms. Building streaming UX costs hours of frontend work, whereas retraining models burns hundreds of thousands of dollars before validating demand."
  },
  {
    id: 7,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "When is paying down technical debt the highest-priority operational decision for a seed-stage engineering team?",
    scenario: "Current state: Sprint cycles have slowed from 2 days to 3 weeks due to brittle regressions in the core billing engine.",
    options: [
      "Never; startups must write spaghetti code until Series B.",
      "When tech debt directly bottlenecks team shipping velocity, causes customer data loss, or corrupts primary financial ledger state.",
      "Whenever a new engineer joins and complains about missing unit test coverage on non-critical landing page buttons.",
      "Every Friday afternoon as a mandatory stylistic code-cleanup ritual."
    ],
    correct: 1,
    explanation: "Refactoring is only justified when technical debt becomes a direct friction point on shipping velocity or threatens critical integrity (billing, user data). Stylistic perfectionism that doesn't unblock iteration speed is vanity."
  },
  {
    id: 8,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "You have 50 active users. 48 users use the product silently every morning, while 2 vocal users post angry rants on Slack demanding a dark-mode theme and integration with an obscure CRM. How do you prioritize sprint tickets?",
    scenario: "Vocal minority vs silent engaged majority.",
    options: [
      "Immediately halt core roadmap work and build the obscure CRM integration to placate the loud users.",
      "Analyze the telemetry of the 48 daily active users to reinforce the high-retention core workflow; engage the 2 vocal users privately to understand if their requests align with the broader ICP.",
      "Ban the 2 vocal users from the platform immediately.",
      "Put all feature requests into a public Twitter poll and let the public vote."
    ],
    correct: 1,
    explanation: "The loud minority trap often derails naive founders. Behavioral telemetry from engaged, retained users reveals what truly delivers value. Customer feedback must be synthesized, not blindly executed."
  },
  {
    id: 9,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "What deployment cadence best characterizes high-performing venture studio teams during the 0-to-1 incubation phase?",
    scenario: "Sprint velocity comparison between studio teams.",
    options: [
      "Shipping quarterly monolithic releases after 6-week regression testing cycles.",
      "Shipping continuous atomic deploys multiple times per day directly behind feature flags, shortening the feedback loop with live users to hours.",
      "Shipping once a month strictly during scheduled Sunday 2:00 AM maintenance windows.",
      "Shipping only after securing formal written sign-off from all angel investors."
    ],
    correct: 1,
    explanation: "Venture studios excel through cycle compression. Shipping multiple times per day behind feature flags enables rapid feedback loops, micro-experiments, and instant bug fixes without destabilizing other users."
  },
  {
    id: 10,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "You have a waitlist of 4,000 email addresses from an viral tweet, but only 5 active beta users who use the tool daily and provide thoughtful qualitative feedback. Where should the founders spend 80% of their working hours?",
    scenario: "Vanity waitlist scale vs concentrated qualitative depth.",
    options: [
      "Building a complex viral referral loop and gamified waitlist leaderboard for the 4,000 emails.",
      "Working obsessively alongside the 5 active users to make them wildly successful, understanding every edge case until the experience is indisputably indispensable.",
      "Selling the email list to an affiliate marketing network for quick cash.",
      "Blasting all 4,000 waitlist members with a premature buggy build."
    ],
    correct: 1,
    explanation: "As Paul Graham famously advised: 'It's better to have 100 people love you than a million people just kind of like you.' Making 5 customers wildly successful creates the blueprint and testimonials for true product-market fit."
  },

  // =========================================================================
  // DOMAIN 2: Customer Discovery & Go-To-Market (Questions 11 - 20)
  // =========================================================================
  {
    id: 11,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "According to 'The Mom Test' methodology for early customer discovery, which question is completely INVALID and must be avoided when interviewing potential users?",
    scenario: "You are interviewing Head of Operations candidates at mid-market logistics companies.",
    options: [
      "\"How do you currently resolve discrepancies between freight bills and warehouse receipts?\"",
      "\"When was the last time this issue caused a shipment delay, and how much did it cost you?\"",
      "\"Would you pay $500/month for an automated software solution that fixed this problem for you?\"",
      "\"What other software or spreadsheets have you purchased or built to try to solve this?\""
    ],
    correct: 2,
    explanation: "Hypothetical future questions ('Would you pay for X?') invite polite lies. People will always say 'Yes' to be supportive. Valid customer discovery focuses strictly on past behavior, specific expenditures already incurred, and tangible workarounds currently in use."
  },
  {
    id: 12,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "You have zero budget for paid acquisition. Which Go-To-Market (GTM) motion is most effective for an early-stage B2B founder to secure their first 10 paying customers?",
    scenario: "Target Market: Boutique dental practice owners.",
    options: [
      "Run broad programmatic Google Display Network banner ads with 50 cents CPC.",
      "Direct, hyper-personalized founder-led outbound (cold phone calls, physical drop-ins, tailored Loom videos, and mutual network introductions).",
      "Launch a comprehensive 6-month TikTok organic content campaign hoping to go viral.",
      "Hire an outsourced commission-only SDR agency in an overseas timezone to send 10,000 generic emails."
    ],
    correct: 1,
    explanation: "Founder-led sales is irreplaceable at the 0-to-1 stage. Doing non-scalable things (Paul Graham's 'Do Things That Don't Scale') lets the founder absorb direct rejections, refine the positioning message in real-time, and uncover nuance no outsourced agency could detect."
  },
  {
    id: 13,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "What constitutes a legally credible and venture-admissible Letter of Intent (LOI) from an enterprise customer?",
    scenario: "You are presenting commercial traction to our Investment Committee for Cohort 1 follow-on capital.",
    options: [
      "A casual message on LinkedIn stating \"Sounds cool, ping me when it's live!\"",
      "A signed document detailing specific success criteria, trial timeline (e.g. 30 days), and explicit pilot pricing or annual contract value upon meeting those criteria.",
      "An email introducing you to another junior intern at the company.",
      "A verbal handshake at a networking conference cocktail party."
    ],
    correct: 1,
    explanation: "A credible LOI must specify: (1) clear acceptance criteria / KPIs, (2) defined pilot evaluation duration, and (3) a committed contract value ($) triggered automatically if the software meets those agreed-upon milestones."
  },
  {
    id: 14,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "When calculating Customer Acquisition Cost (CAC) for early enterprise sales, which calculation is strictly accurate?",
    scenario: "In Q1: Sales rep salary $20k, Ad spend $5k, Founder time equivalent $10k, CRM tooling $1k. You closed 4 customers.",
    options: [
      "Ad Spend ($5,000) / 4 = $1,250 CAC.",
      "Total Sales & Marketing Expenses ($20k + $5k + $10k + $1k = $36k) / 4 = $9,000 CAC.",
      "Zero CAC because the founders closed the deals through personal networking.",
      "Ad Spend divided by total website visitors ($5,000 / 10,000 = $0.50 CAC)."
    ],
    correct: 1,
    explanation: "Fully-loaded CAC must encompass all direct and indirect sales/marketing acquisition expenditures: salaries, tool subscriptions, advertising, and marketing overhead. Omitting salaries or founder labor creates a distorted, dangerously optimistic financial illusion."
  },
  {
    id: 15,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "Why does selling B2B software at $15/month per company frequently kill pre-seed startups?",
    scenario: "Unit economic viability for B2B startups with human customer support.",
    options: [
      "Because Stripe transaction fees exceed $15 on every credit card charge.",
      "Because the customer acquisition cost (CAC) and customer support overhead drastically exceed the $180 annual contract value (ACV), creating an 'unprofitable dead zone' without consumer viral scale.",
      "Because businesses are legally prohibited from paying less than $100 for software in the United States.",
      "Because low pricing triggers automated antitrust investigations by the Federal Trade Commission."
    ],
    correct: 1,
    explanation: "Christoph Janz's famous SaaS startup framework illustrates the 'valley of death': you either need millions of consumer users at $10/mo with zero marginal CAC, or enterprise contracts ($5k-$100k ACV) that fund outbound sales. Selling low-ACV B2B software with human sales/support leads to structural insolvency."
  },
  {
    id: 16,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "During a discovery interview, a prospect spends 30 minutes politely nodding and saying your product 'sounds like a great idea for somebody else'. How should you interpret this response?",
    scenario: "Evaluating customer intent signals.",
    options: [
      "Count them as a confirmed sales lead in your CRM pipeline.",
      "Recognize this as a polite disqualification ('No'); they do not experience an acute, bleeding-neck problem and will never purchase.",
      "Send them 10 follow-up emails offering 90% discounts.",
      "Ask them to invest as an angel investor in your company."
    ],
    correct: 1,
    explanation: "Lukewarm praise and 'sounds great for other companies' is polite rejection in disguise. True enterprise buyers respond with visceral relief, ask how soon they can implement it, and immediately share confidential workflow pains."
  },
  {
    id: 17,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "What is the anatomy of a top-performing cold outbound email to a VP of Engineering or Head of Operations?",
    scenario: "Drafting outbound campaigns for your Cohort 1 enterprise pilot.",
    options: [
      "A 7-paragraph comprehensive overview of your startup's founding story, patent portfolio, and entire product feature matrix with 4 PDF attachments.",
      "A concise 3-4 sentence message highlighting a specific observation about their company, a quantified acute pain point, and a frictionless call-to-action (e.g. 'Worth exploring a 15-min chat next Tuesday?').",
      "An automated calendar invite directly sent to their schedule with no context.",
      "A threatening notice claiming their current vendor is violating regulatory standards."
    ],
    correct: 1,
    explanation: "High-converting cold outbound is brief, hyper-relevant, and respectful of executive time. Highlighting specific observation + sharp problem statement + low-friction ask outperforms multi-paragraph feature pitches every single time."
  },
  {
    id: 18,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "What is a 'Reverse Trial' model in modern Product-Led Growth (PLG) SaaS?",
    scenario: "Designing user onboarding for pre-seed software.",
    options: [
      "A model where the company pays the user $10 every time they click a button.",
      "A model where new signups are automatically granted full access to top-tier enterprise features for 14 days, then gracefully downgraded to a restricted free tier if they do not upgrade, triggering loss aversion.",
      "A model where users must sign a physical paper contract before accessing a login screen.",
      "A model where the software runs backwards to test data persistence."
    ],
    correct: 1,
    explanation: "Reverse trials give users immediate access to the premium capabilities. When the 14 days lapse, the user has experienced the full superpower and naturally upgrades rather than losing their enriched workflow."
  },
  {
    id: 19,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "Gabriel Weinberg's 'Bullseye Framework' dictates which tactical approach to early customer acquisition channels?",
    scenario: "Allocating 20 hours/week of founder GTM capacity.",
    options: [
      "Spreading marketing budget equally across all 19 traction channels simultaneously.",
      "Brainstorming all channels, running fast cheap tests on the top 3, and focusing 100% of effort on the single inner-ring channel that proves repeatable and scalable.",
      "Exclusively using billboard advertising in Times Square.",
      "Outsourcing all marketing to a PR agency before building the product."
    ],
    correct: 1,
    explanation: "Startups almost always achieve scale through one single dominant distribution channel. Testing broadly in the outer ring to find the single inner-ring bullseye channel is the disciplined path to scalable growth."
  },
  {
    id: 20,
    domain: "Customer Discovery & Go-To-Market",
    domainKey: "gtm",
    question: "What is the critical difference between 'Voluntary Churn' and 'Involuntary Churn' in SaaS?",
    scenario: "Auditing churn metrics in month 3 of beta.",
    options: [
      "Voluntary churn is when an employee quits; involuntary is when they are fired.",
      "Voluntary churn occurs when a user intentionally cancels their subscription; involuntary churn occurs when their credit card fails, expires, or encounters bank billing errors.",
      "There is no difference; all churn is classified as criminal negligence.",
      "Involuntary churn only happens during national holidays."
    ],
    correct: 1,
    explanation: "Involuntary churn (expired credit cards, outdated billing info) often accounts for 20-40% of all SaaS cancellations. It can be largely remedied via dunning software and retry logic, whereas voluntary churn reflects product dissatisfaction or lack of ROI."
  },

  // =========================================================================
  // DOMAIN 3: Unit Economics, Runway & SAFE Financing (Questions 21 - 30)
  // =========================================================================
  {
    id: 21,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "EveCount Venture Studio offers your startup $125,000 on a standard YC-style Post-Money SAFE with a Valuation Cap of $2,500,000. Assuming no other convertible notes exist prior to your Series Seed, what percentage of company ownership is the Studio purchasing upon conversion?",
    scenario: "Standard Post-Money Valuation Cap formula applied.",
    options: [
      "10.0%",
      "5.0%",
      "2.5%",
      "12.5%"
    ],
    correct: 1,
    explanation: "In a Post-Money SAFE: Ownership % = Investment Amount / Post-Money Valuation Cap. Here, $125,000 / $2,500,000 = 0.05 or exactly 5.0%. The key benefit of a post-money SAFE is that founders and investors know the exact ownership percentage sold before future priced rounds."
  },
  {
    id: 22,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "Your startup has $180,000 cash remaining in the bank. Your Monthly Recurring Revenue (MRR) is $15,000 growing at 10% MoM. Your Monthly Gross Burn (salaries, AWS, rent) is $35,000. What is your Net Burn and estimated remaining runway?",
    scenario: "Assume static gross expenses for conservative baseline planning.",
    options: [
      "Net Burn: $35,000; Runway: 5.1 months.",
      "Net Burn: $20,000; Runway: 9.0 months.",
      "Net Burn: $15,000; Runway: 12.0 months.",
      "Net Burn: $50,000; Runway: 3.6 months."
    ],
    correct: 1,
    explanation: "Net Burn = Gross Burn ($35,000) - Monthly Revenue ($15,000) = $20,000/month. Remaining Runway = Cash ($180,000) / Net Burn ($20,000) = 9.0 months. (Factoring in 10% revenue growth will gradually extend runway, but 9 months is the disciplined baseline)."
  },
  {
    id: 23,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "Why do venture capitalists emphasize the 'LTV to CAC ratio' (Life-Time Value to Customer Acquisition Cost), and what is the benchmark threshold for a healthy venture-backed SaaS company?",
    scenario: "You are forecasting unit economics for your Cohort 1 pitch deck.",
    options: [
      "LTV/CAC must be 1.0x to break even on payment processing fees.",
      "LTV/CAC should be at least 3.0x or higher with a CAC payback period under 12 months.",
      "LTV/CAC should be negative to indicate aggressive market capture subsidies.",
      "LTV/CAC is only relevant for hardware manufacturers with physical inventory depreciation."
    ],
    correct: 1,
    explanation: "An LTV/CAC ratio of >= 3.0x means every dollar invested in acquisition generates at least $3 in gross margin over the customer's lifespan. Paired with a CAC payback period under 12 months, it ensures working capital recycled quickly into scalable growth."
  },
  {
    id: 24,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "What is the critical legal difference between a priced equity round (e.g. Series Seed Preferred Stock) and a convertible instrument like a SAFE or Convertible Promissory Note?",
    scenario: "Choosing the financing instrument for your pre-seed angel round.",
    options: [
      "SAFEs require establishing a formal Board of Directors and issuing official share certificates with state filings immediately.",
      "SAFEs defer the complex valuation negotiation, stock option pool authorization, and heavy legal fees ($20k-$50k) until a future priced round.",
      "Convertible Notes never convert into equity and must always be repaid as debt in cash within 90 days.",
      "Priced rounds are illegal in Delaware and Singapore for technology companies."
    ],
    correct: 1,
    explanation: "SAFEs (Simple Agreement for Future Equity) allow founders to raise capital quickly with standardized contracts and minimal legal costs ($1k-$3k) without valuing the company immediately or issuing preferred stock until institutional Series Seed leads price the company."
  },
  {
    id: 25,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "What is the operational difference between a SAFE with a 'Valuation Cap' versus a SAFE with a 'Discount'?",
    scenario: "Evaluating term sheet clauses from angel syndicates.",
    options: [
      "Valuation Cap sets a maximum effective valuation at which the investor's cash converts into shares during the future priced round, protecting early investors from hyper-growth dilution; Discount offers a percentage price discount (e.g. 20%) relative to the next round price.",
      "Discount means the investor gives you a 20% discount on office rent; Cap means they get free merchandise.",
      "Valuation Caps only apply if the company fails; Discounts only apply if the company goes public.",
      "There is no difference; both terms are legally identical."
    ],
    correct: 0,
    explanation: "A Valuation Cap protects early risk-takers by guaranteeing that if the startup later raises at $50M, their conversion price is capped at the agreed ceiling (e.g. $5M), rewarding early conviction with greater equity ownership."
  },
  {
    id: 26,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "Why did Y Combinator transition from Pre-Money SAFEs to Post-Money SAFEs in 2018?",
    scenario: "Cap table transparency and anti-dilution surprises.",
    options: [
      "Because Pre-Money SAFEs were banned by the SEC.",
      "Because Pre-Money SAFEs caused compounding founder dilution surprises where issuing multiple notes diluted founders unpredictably, whereas Post-Money SAFEs clearly fix the exact ownership percentage sold with every check.",
      "Because Post-Money SAFEs eliminate the need for income taxes.",
      "Because Post-Money SAFEs convert into cryptocurrency tokens."
    ],
    correct: 1,
    explanation: "With Pre-Money SAFEs, multiple SAFE rounds compounded against founders upon conversion, often leaving founders with far less equity than expected. Post-Money SAFEs provide total cap table clarity: selling $500k on a $5M post-money cap means selling exactly 10%."
  },
  {
    id: 27,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "What is the 'Option Pool Shuffle' commonly encountered during institutional priced rounds?",
    scenario: "Negotiating a Series Seed term sheet with a lead VC.",
    options: [
      "When engineers trade their stock options with each other at company happy hours.",
      "When the incoming VC requires a 10%-15% unallocated Employee Stock Option Pool (ESOP) to be created *prior* to the investment, forcing 100% of that equity dilution onto the founders rather than sharing it with the new investor.",
      "When the board cancels stock options and replaces them with cash bonuses.",
      "When the company changes stock option brokers from Carta to Pulley."
    ],
    correct: 1,
    explanation: "The Option Pool Shuffle is a classic venture negotiation tactic: requiring the expansion of the option pool on a pre-money basis effectively reduces the true valuation the founders receive by absorbing all option creation dilution before the investor's capital enters."
  },
  {
    id: 28,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "Your generative AI startup generates $100,000 in monthly revenue, but spends $65,000 on OpenAI API tokens, $10,000 on Pinecone vector search, and $5,000 on AWS hosting. What is your Gross Margin, and how will VCs view it?",
    scenario: "Direct Cost of Goods Sold (COGS) in AI wrappers.",
    options: [
      "Gross Margin: 20%; VCs will evaluate the company like a low-margin IT services firm rather than an 80%+ gross margin software company.",
      "Gross Margin: 80%; VCs will celebrate the stellar software margin.",
      "Gross Margin: 100%; compute costs are classified as corporate marketing expenses.",
      "Gross Margin: -50%; the company is losing money on every query."
    ],
    correct: 0,
    explanation: "Gross Margin = (Revenue - COGS) / Revenue = ($100k - $80k) / $100k = 20%. Traditional SaaS commands 75%-85% gross margins. A 20% margin business requires 4x more revenue to generate the same gross profit, drastically lowering its venture valuation multiple."
  },
  {
    id: 29,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "According to Paul Graham's essay, what does it mean for a startup to be 'Default Alive'?",
    scenario: "Strategic runway and financial sovereignty assessment.",
    options: [
      "The startup has successfully completed an initial public offering (IPO).",
      "Assuming revenue growth and expenses remain at their current trajectory, the startup will reach profitability before running out of money, without needing to raise more outside capital.",
      "All founders are alive and healthy.",
      "The company has purchased life insurance policies on key engineers."
    ],
    correct: 1,
    explanation: "Default Alive means your current growth trajectory and cash burn intersect at profitability before cash hits zero. Startups that are Default Alive negotiate from a position of absolute power; startups that are Default Dead must raise capital under duress."
  },
  {
    id: 30,
    domain: "Unit Economics, Runway & SAFE Financing",
    domainKey: "economics",
    question: "What is a 'Down Round' in venture capital, and why is it dangerous for founder incentives?",
    scenario: "Subsequent financing under market correction conditions.",
    options: [
      "A round raised from investors located in the Southern Hemisphere.",
      "A priced round where the company's per-share valuation is lower than the previous round, which triggers full-ratchet or weighted-average anti-dilution protections for existing preferred shareholders, severely diluting common stock held by founders and employees.",
      "A round where founders borrow money from commercial banks at prime rates.",
      "A round where all previous convertible notes are forgiven as charity."
    ],
    correct: 1,
    explanation: "Down rounds trigger anti-dilution clauses that grant additional shares to earlier preferred investors to compensate for the price drop. Because common stockholders (founders and staff) do not have anti-dilution protection, they absorb severe dilution, often destroying employee equity motivation."
  },

  // =========================================================================
  // DOMAIN 4: Defensibility, Moats & Wedge Strategy (Questions 31 - 40)
  // =========================================================================
  {
    id: 31,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "What constitutes a genuine, enduring competitive moat for a software startup against deep-pocketed incumbents (like Google, Microsoft, or Salesforce)?",
    scenario: "An investor asks: \"What stops a 100-person team at Salesforce from building this in two weeks?\"",
    options: [
      "Filing a provisional software patent on a basic database query mechanism.",
      "High proprietary switching costs, accumulated bilateral network effects, or mission-critical workflow data gravity.",
      "Having a prettier color gradient and sleek CSS typography on the landing page.",
      "Signing an exclusive non-disclosure agreement (NDA) with all pitch deck viewers."
    ],
    correct: 1,
    explanation: "Hamilton Helmer's '7 Powers' identifies true moats: Network Effects, Switching Costs, Counter-Positioning, Scale Economies, Cornered Resources, Process Power, and Brand. Features and NDAs are easily bypassed; proprietary system of record data gravity and network lock-in are not."
  },
  {
    id: 32,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "What is a 'Wedge Strategy' in early-stage venture building?",
    scenario: "You are entering a crowded $50 Billion industry dominated by legacy incumbents.",
    options: [
      "Selling a wide suite of 25 enterprise tools simultaneously to outcompete Oracle on breadth.",
      "Entering the market with an hyper-focused, acute single-use utility that solves an unbearable pain point for an underserved niche, then expanding into adjacent modules.",
      "Spending 80% of your venture investment on Google Search ads for the industry's most expensive keyword.",
      "Offering your product completely free with no monetization plan forever to bankrupt your rivals."
    ],
    correct: 1,
    explanation: "The Wedge Strategy (exemplified by Figma, Rippling, and Square) penetrates a crowded market through a razor-sharp, frictionless initial utility. Once entrenched with happy users, the startup expands horizontally into payroll, billing, analytics, and broader platform dominance."
  },
  {
    id: 33,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "What is 'Counter-Positioning' as a strategic advantage?",
    scenario: "Incumbents generate 90% of their profit from expensive on-premise licensing and manual consultant fees.",
    options: [
      "Suing the incumbent in federal court for trademark infringement.",
      "Adopting a superior business model (e.g. self-serve SaaS) that the incumbent cannot copy without cannibalizing their own core profit center.",
      "Listing your pricing as exactly $1 cheaper than the incumbent's catalog price.",
      "Running billboard advertisements outside the incumbent's headquarters mocking their CEO."
    ],
    correct: 1,
    explanation: "Counter-positioning occurs when a challenger pioneers a business model that incumbents refuse or hesitate to adopt because doing so would destroy their own high-margin legacy cash cow (e.g. Netflix DVD/streaming vs Blockbuster late fees; Vanguard low-fee indexing vs active fund managers)."
  },
  {
    id: 34,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "How should a venture-backed founder calculate Total Addressable Market (TAM) using a rigorous 'Bottom-Up' methodology?",
    scenario: "Your team is preparing the financial model for Cohort 1 Demo Day.",
    options: [
      "Taking a Gartner market report stating \"The Global AI market is $500B\" and assuming you capture 1% = $5B TAM.",
      "Multiplying the verifiable total count of potential customer logos in your target segment by your realistic Annual Contract Value (ACV).",
      "Adding together the market capitalizations of Apple, Amazon, and Nvidia.",
      "Estimating the total global human population multiplied by your $10/year consumer tier."
    ],
    correct: 1,
    explanation: "Top-down TAM calculations ('1% of a huge market') are dismissed by tier-1 VCs. Bottom-up TAM = (Verified Number of Target Companies in ICP) × (Realistic Annual Contract Value / ACV). It demonstrates deep comprehension of customer density and pricing reality."
  },
  {
    id: 35,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "How does a founder solve the classic 'Chicken-and-Egg' cold-start problem in a two-sided marketplace (e.g. Uber, Airbnb, DoorDash)?",
    scenario: "Launch phase of a supply-demand bilateral network.",
    options: [
      "Spend $500,000 on nationwide television advertisements to acquire both sides at the same time.",
      "Subsidize and manually constrain the market geographically or vertically to ensure dense, guaranteed supply in one localized micro-market first before opening demand.",
      "Launch worldwide in 45 countries simultaneously with zero supply in all of them.",
      "Require users to pay an upfront $1,000 registration deposit."
    ],
    correct: 1,
    explanation: "Marketplace liquidity requires extreme geographic or vertical concentration. DoorDash started in Palo Alto; Uber started in San Francisco; Airbnb started with design conference attendees. Winning hyper-localized supply density creates organic liquidity."
  },
  {
    id: 36,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "Why do 'Systems of Record' command higher enterprise valuations than 'Point Solution Utilities'?",
    scenario: "Evaluating software category defensibility.",
    options: [
      "Systems of Record store the authoritative source of truth for critical operational data (e.g. ERP, CRM, HRIS), creating massive organizational switching costs and multi-year contract renewals.",
      "Systems of Record are easier to build over a weekend.",
      "Point solutions have higher customer churn but higher marketing virality.",
      "Because enterprise CIOs dislike all-in-one software suites."
    ],
    correct: 0,
    explanation: "Ripping out a System of Record (Workday, Salesforce, Epic Systems) requires hundreds of hours of data migration, risk, and user retraining. Utilities that sit on top can be replaced in minutes; data gravity and workflow switching costs create enduring venture enterprise value."
  },
  {
    id: 37,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "What is the primary commercialization vehicle for Commercial Open Source Software (COSS) companies (e.g., MongoDB, Gitlab, Supabase)?",
    scenario: "Monetizing developer adoption.",
    options: [
      "Selling physical printed copies of the documentation manual at bookstores.",
      "Open-core architecture: keeping the foundational engine permissive and open-source, while monetizing managed cloud hosting, multi-tenant RBAC, enterprise compliance (SOC2/SSO), and telemetry tools.",
      "Relying solely on voluntary donation buttons on GitHub Sponsors.",
      "Suing any developer who forks the repository."
    ],
    correct: 1,
    explanation: "The open-core model offers frictionless developer grassroots adoption through open-source software, while enterprise procurement pays for security (SSO/SAML), SOC2 compliance, managed multi-region cloud hosting, and enterprise SLAs."
  },
  {
    id: 38,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "How can stringent regulatory compliance (e.g. HIPAA, FedRAMP, FINRA) serve as a competitive moat rather than an annoyance?",
    scenario: "Building in highly regulated healthcare or defense sectors.",
    options: [
      "Regulations make it impossible for any startup to make a profit.",
      "Achieving complex certifications creates an immense barrier to entry that prevents generic consumer tech startups from easily copying your product or selling to your customers.",
      "Compliance allows founders to avoid paying corporate income taxes.",
      "Regulated industries never purchase commercial software."
    ],
    correct: 1,
    explanation: "Regulatory hurdles are a double-edged sword: difficult to achieve, but once acquired (e.g. FedRAMP High or SOC2 Type II in banking), they act as a formidable defensive moat, blocking lightweight copycats that lack the capital and compliance fortitude."
  },
  {
    id: 39,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "What is 'Vertical SaaS' and why does it often achieve superior market penetration compared to horizontal tools?",
    scenario: "Choosing between a generic CRM for all businesses vs a bespoke system for scrap metal recycling yards.",
    options: [
      "Vertical SaaS software that only runs on mobile phones oriented vertically.",
      "Software engineered end-to-end for the unique workflows, regulations, and terminology of a single specific industry, allowing deeper embedded fintech monetization (payments, insurance, lending).",
      "Software that is sold exclusively to skyscraper construction firms.",
      "Software that has no database and runs entirely in memory."
    ],
    correct: 1,
    explanation: "Vertical SaaS (e.g., Toast for restaurants, ServiceTitan for HVAC, Procore for construction) penetrates deep into operational workflows. By tailoring the product to the industry's jargon and integrating embedded financial services (payments), they capture massive wallet share."
  },
  {
    id: 40,
    domain: "Defensibility, Moats & Wedge Strategy",
    domainKey: "defensibility",
    question: "What constitutes 'Platform Risk' when building a startup on top of third-party APIs (e.g., OpenAI, Twitter/X, Apple iOS)?",
    scenario: "Evaluating technological vulnerability.",
    options: [
      "The risk that computer monitors will crash during investor presentations.",
      "The risk that the underlying platform changes API terms, prices out developers, or ships an in-house native feature that obsoletes your entire value proposition overnight ('sherlocking').",
      "The risk that users will use Windows instead of macOS.",
      "The risk that fiber optic cables across the Pacific Ocean are severed."
    ],
    correct: 1,
    explanation: "Platform risk is demonstrated when Apple releases a feature that kills 50 top App Store utilities ('sherlocked'), or when an LLM provider natively adds PDF document chat. Founders must build proprietary domain data gravity and workflow hooks that platforms cannot easily commoditize."
  },

  // =========================================================================
  // DOMAIN 5: Founder Decision Making & Crisis Execution (Questions 41 - 50)
  // =========================================================================
  {
    id: 41,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "Your co-founder and 50% equity partner decides to quit the startup 4 months into Cohort 1 after experiencing severe burnout. You established a standard 4-year vesting schedule with a 1-year cliff. What happens to their equity?",
    scenario: "The co-founder leaves amicably at month 4.",
    options: [
      "They retain 50% of the entire company forever and can block future investor resolutions.",
      "Because they departed prior to the 1-year cliff, 100% of their unvested shares are repurchased by the company at nominal cost, preserving cap table equity for future key hires.",
      "The venture studio automatically takes their 50% shares and shuts down the company.",
      "The remaining founder must pay the departing co-founder cash equal to 50% of the valuation cap."
    ],
    correct: 1,
    explanation: "This is precisely why standard 4-year vesting with a 1-year cliff exists. Departing before the 1-year cliff means 0% of the stock vests, preventing a 'dead equity' cap table disaster that would render the startup uninvestable for future institutional rounds."
  },
  {
    id: 42,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "You have 3 months of runway left. A tier-1 enterprise prospect says they love your product, but their procurement and compliance cycle takes a minimum of 9 months to issue payment. What is the correct founder decision?",
    scenario: "Cash remaining: $45,000. Burn: $15,000/mo.",
    options: [
      "Sign the contract and celebrate because the future revenue will eventually save the company.",
      "Cease all other sales and wait patiently for the 9-month enterprise procurement cycle to complete.",
      "Disqualify or deprioritize the 9-month enterprise deal; pivot sales immediately to mid-market or SMB customers who can swipe a corporate card and close within 14-30 days to sustain runway.",
      "Take out high-interest personal credit card loans with 28% APR to float 9 months of burn without consulting the board."
    ],
    correct: 2,
    explanation: "Startup death occurs when cash hits zero. A 9-month sales cycle on a 3-month runway is a lethal trap. Founders must prioritize high-velocity deals that generate cash immediately, bridge the runway, and re-engage slow enterprise whales from a position of financial strength."
  },
  {
    id: 43,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "You spend the first month of Mamba MVP interviewing 30 potential customers. Twenty-five tell you they don't want the product you're planning to build. What do you do?",
    scenario: "Out of 30 structured target customer interviews in Month 1, 25 explicitly state they do not feel the pain point and would not purchase your proposed solution. Five express mild curiosity but have no budget.",
    options: [
      "Dismiss the 25 negative responses as unvisionary operators who don't understand the future; double down on building the original MVP to prove them wrong at Demo Day.",
      "Offer the product completely free or pay the 25 negative prospects Amazon gift cards to agree to install it anyway.",
      "Deeply analyze the specific reasons why the 25 said no; investigate whether the problem is nonexistent, if you targeted the wrong ICP, or if their actual acute daily pain points point to a high-conviction pivot worth building.",
      "Conclude that entrepreneurship is not for you and immediately shut down without speaking to the venture partners."
    ],
    correct: 2,
    explanation: "As Mamba MVP venture partner James Sun emphasizes: validation can mean discovering that the original idea is wrong. Great founders do not get defensive or cling stubbornly to a disproven thesis. They treat disconfirming evidence as a gift, uncover the true underlying job-to-be-done, and pivot toward what the market is actually desperate for."
  },
  {
    id: 44,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "An investor issues an exploding term sheet that expires in 24 hours, but demands a 35% equity stake for an angel check and a personal guarantee on your family assets. How does an educated venture founder respond?",
    scenario: "Pre-seed stage investment evaluation.",
    options: [
      "Sign immediately out of desperation because capital is hard to raise.",
      "Reject the predatory terms immediately. Giving 35% at pre-seed severely damages cap table incentives, and personal asset guarantees are completely unacceptable in venture equity agreements.",
      "Sign the agreement and secretly plan to breach the contract later.",
      "Ask the investor to increase the equity stake to 50% to make them an equal co-founder."
    ],
    correct: 1,
    explanation: "True venture capital is non-recourse risk capital. Legitimate pre-seed investors take 5% to 15% equity per round. Demanding 35%+ at pre-seed ruins founder equity motivation for later rounds, and demanding personal liability or asset guarantees is predatory and an immediate red flag."
  },
  {
    id: 45,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "You and your co-founder have reached an intractable 50/50 disagreement on whether to pivot to B2B or remain consumer. The team is paralyzed. How should co-founders structure decision rights to prevent deadlock?",
    scenario: "Avoiding founder deadlock.",
    options: [
      "Flip a coin every morning to decide which product features to code.",
      "Establish clear functional ownership at inception: CEO has final tie-breaking decision authority on corporate strategy and commercial matters; CTO has final authority on technical architecture.",
      "Dissolve the company immediately upon the first disagreement.",
      "Call a meeting with all 40 angel investors and demand a democratic shareholder vote."
    ],
    correct: 1,
    explanation: "50/50 deadlock is a leading cause of early startup death. High-performing founding teams divide clear domains of ownership: the CEO holds ultimate authority on strategy/GTM, while the CTO holds authority on technical execution. Consensus is great; clarity is mandatory."
  },
  {
    id: 46,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "Runway has dropped to 4 months due to an unexpected macro downturn. You need to reduce team expenses by 40% to achieve Default Alive. What is the humane and venture-disciplined method to execute layoffs?",
    scenario: "Crisis expense reduction.",
    options: [
      "Cut 5% of the team every Friday for the next 8 weeks to see if morale improves.",
      "Conduct one single, decisive, well-prepared reduction; treat departing colleagues with generosity, severance, and dignity; communicate total transparency to remaining staff to re-anchor runway at 18+ months.",
      "Stop paying salaries without telling anyone and hope engineers continue coding for free.",
      "Leak the rumor to TechCrunch and let employees find out from news headlines."
    ],
    correct: 1,
    explanation: "Drip-feed layoffs destroy organizational psychological safety: survivors spend every week waiting for the other shoe to drop. Conducting one deep, compassionate reduction restores runway immediately and gives the remaining team a secure foundation to execute."
  },
  {
    id: 47,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "What is the hallmark of a high-signal monthly investor update sent by an elite venture-backed CEO?",
    scenario: "Maintaining institutional investor trust.",
    options: [
      "A 20-page document that only lists vanity press mentions and hides cash balance.",
      "A disciplined update structured into: Highlights, Lowlights (bad news first), Core Metrics (MRR, Net Burn, Cash, Runway in Months), and 2-3 specific Asks (e.g. introductions to target customer logos).",
      "Radio silence for 9 months followed by an urgent email asking for an emergency wire transfer.",
      "Sending an automated tweet link once a quarter."
    ],
    correct: 1,
    explanation: "Top tier founders build compounding credibility with their cap table by being ruthlessly candid about bad news, clear on runway in months, and specific with asks. Investors respect founders who diagnose reality transparently."
  },
  {
    id: 48,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "Your lead machine learning engineer suddenly quits 2 weeks before your Series Seed institutional partner pitch. How does a resilient founder handle the crisis?",
    scenario: "Unexpected key hire departure.",
    options: [
      "Cancel all investor meetings, delete the repository, and issue a public statement of defeat.",
      "Remain calm; conduct an amicable knowledge transfer; step into the codebase to stabilize critical demos; and present the venture opportunity with conviction while initiating a targeted search for a senior replacement.",
      "Threaten the departed engineer with endless lawsuits to force them back to work.",
      "Lie to investors during the pitch and claim the engineer is simply on vacation."
    ],
    correct: 1,
    explanation: "Founders are the ultimate backstop of their company. Team members leave; architectures break. Conviction, technical adaptability, and transparency turn operational crises into proof of founder grit."
  },
  {
    id: 49,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "Why must every founder, employee, and contractor sign a comprehensive Proprietary Information and Inventions Agreement (PIIA / IP Assignment) on Day 1?",
    scenario: "Pre-seed legal cleanliness and diligence audit.",
    options: [
      "Because it allows the founders to claim employee patents as their own personal copyright.",
      "Without signed IP assignments, individual developers legally own the copyright to the code they wrote; any missing assignment will block institutional Series A diligence and kill future acquisition deals.",
      "It is an optional formality that is only needed when a company goes public on the NYSE.",
      "It allows the company to monitor employee personal social media accounts."
    ],
    correct: 1,
    explanation: "Clean IP assignment is non-negotiable. If a contractor or departing founder wrote core code without signing a PIIA, they legally retain rights to the software. Institutional VCs will halt financings immediately if cap table IP diligence reveals unassigned code."
  },
  {
    id: 50,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "At the conclusion of Cohort 1, what single achievement will guarantee that institutional venture funds and angel syndicates compete to lead your Series Seed round?",
    scenario: "Venture studio graduation criteria.",
    options: [
      "Winning first place at a local college startup pitch competition.",
      "Demonstrating consistent week-over-week organic growth, passionate customer references who declare they would be devastated if the product disappeared, and disciplined unit economics.",
      "Spending $50,000 on branded jackets and company stickers.",
      "Having 20 celebrity advisors on your advisory board who each own 1% of the equity."
    ],
    correct: 1,
    explanation: "Nothing replaces authentic customer traction. Tier-1 seed investors don't invest in pitch decks or branded swag; they invest in lines of customer retention, desperate buyer demand, and a relentless founding team executing with compounding velocity."
  }
];

// Mamba MVP 6 Panel Scoring Dimensions (Inaugural Cohort Rubric)
const DOMAIN_METADATA = {
  founder: {
    name: "Founder Quality & Commitment",
    weight: "25%",
    weightVal: 0.25,
    icon: "award",
    description: "Motivation, founder-market fit, credibility, and full commitment throughout the 90-day program."
  },
  insight: {
    name: "Problem / Customer Insight",
    weight: "20%",
    weightVal: 0.20,
    icon: "search",
    description: "Clarity of thinking, genuine observation vs isolation, understanding who specifically has this problem."
  },
  validation: {
    name: "Evidence of Validation",
    weight: "15%",
    weightVal: 0.15,
    icon: "check-circle",
    description: "Actual proof of customer conversations, Mom Test discovery, and demand signals separating truth from hype."
  },
  execution: {
    name: "Execution Ability & 0-to-1 Velocity",
    weight: "15%",
    weightVal: 0.15,
    icon: "zap",
    description: "Resourcefulness, MVP scoping speed, and shipping what is buildable and testable without massive capital."
  },
  coachability: {
    name: "Coachability & Adaptability",
    weight: "15%",
    weightVal: 0.15,
    icon: "compass",
    description: "Intellectual honesty, handling disconfirming evidence (e.g. 25/30 customer rejections), and willingness to pivot."
  },
  fit: {
    name: "Fit with Mamba MVP / 90-Day Potential",
    weight: "10%",
    weightVal: 0.10,
    icon: "target",
    description: "Leveraging 71 Ayer Rajah rails, venture engineering, and demonstrating meaningful progress in 90 days."
  }
};

// Map questions 1-50 to the 6 panel scoring dimensions
const QUESTION_DIMENSION_MAP = {
  // Scoping & Execution (Execution: 1-10)
  1: "execution", 2: "execution", 3: "validation", 4: "execution", 5: "execution",
  6: "execution", 7: "execution", 8: "coachability", 9: "execution", 10: "execution",
  // Customer & GTM (Insight & Validation: 11-20)
  11: "validation", 12: "founder", 13: "validation", 14: "execution", 15: "insight",
  16: "insight", 17: "insight", 18: "validation", 19: "execution", 20: "insight",
  // Economics & Financing (Fit & Execution: 21-30)
  21: "fit", 22: "founder", 23: "insight", 24: "fit", 25: "fit",
  26: "fit", 27: "fit", 28: "insight", 29: "founder", 30: "fit",
  // Defensibility & Wedge (Insight & Validation: 31-40)
  31: "insight", 32: "insight", 33: "insight", 34: "validation", 35: "validation",
  36: "insight", 37: "fit", 38: "insight", 39: "insight", 40: "coachability",
  // Founder Grit & Crisis (Founder & Coachability: 41-50)
  41: "founder", 42: "founder", 43: "coachability", 44: "founder", 45: "coachability",
  46: "founder", 47: "coachability", 48: "founder", 49: "founder", 50: "founder"
};

// James Sun's 18 Mandatory Founder Interview Questions & Panel Expectations Table
const MAMBA_INTERVIEW_QUESTIONS_18 = [
  {
    num: 1,
    area: "Founder",
    question: "Tell us about yourself and why you want to build this company.",
    lookingFor: "Motivation, founder-market fit, credibility."
  },
  {
    num: 2,
    area: "Problem",
    question: "What problem are you trying to solve, and who specifically has this problem?",
    lookingFor: "Clarity of thinking and customer understanding."
  },
  {
    num: 3,
    area: "Insight",
    question: "Why do you believe this is a real problem worth solving? What have you personally observed?",
    lookingFor: "Genuine insight vs. an idea generated in isolation."
  },
  {
    num: 4,
    area: "Validation",
    question: "What have you done so far to validate the problem with potential customers?",
    lookingFor: "Evidence, customer conversations, initiative."
  },
  {
    num: 5,
    area: "Solution",
    question: "Explain your solution to us in 60 seconds without using technical jargon.",
    lookingFor: "Ability to communicate the value proposition."
  },
  {
    num: 6,
    area: "Differentiation",
    question: "What are customers doing today instead of using your solution?",
    lookingFor: "Understanding of alternatives and competition."
  },
  {
    num: 7,
    area: "Customer",
    question: "Who would be your first 10 customers, and how would you reach them?",
    lookingFor: "GTM thinking and specificity."
  },
  {
    num: 8,
    area: "Business Model",
    question: "Who pays you, what would they pay for, and how do you eventually make money?",
    lookingFor: "Commercial awareness."
  },
  {
    num: 9,
    area: "Execution",
    question: "If we gave you no additional funding for the next 90 days, what could you realistically build and test?",
    lookingFor: "Resourcefulness and MVP mentality."
  },
  {
    num: 10,
    area: "Commitment",
    question: "How much time can you realistically commit to the venture during the 90-day program?",
    lookingFor: "Actual availability and seriousness."
  },
  {
    num: 11,
    area: "Team",
    question: "What can you personally execute today, and what capabilities are missing from your team?",
    lookingFor: "Self-awareness and team gaps."
  },
  {
    num: 12,
    area: "Technology / AI",
    question: "Where could technology or AI create a meaningful advantage in your business rather than simply being an add-on?",
    lookingFor: "Technology thinking without forcing 'AI'."
  },
  {
    num: 13,
    area: "Coachability",
    question: "Tell us about an assumption you had about this business that you've already discovered might be wrong.",
    lookingFor: "Intellectual honesty and adaptability."
  },
  {
    num: 14,
    area: "Resilience",
    question: "What would make you abandon or significantly change this idea?",
    lookingFor: "Evidence-based decision making rather than attachment."
  },
  {
    num: 15,
    area: "Ambition",
    question: "If this works, what does this company look like three years from now?",
    lookingFor: "Scale of ambition and vision."
  },
  {
    num: 16,
    area: "Program Fit",
    question: "What is the single biggest thing stopping you from moving this business forward today?",
    lookingFor: "Whether Mamba can genuinely help."
  },
  {
    num: 17,
    area: "90-Day Goal",
    question: "What would success look like for you at the end of the Mamba MVP program?",
    lookingFor: "Clear outcomes and realistic expectations."
  },
  {
    num: 18,
    area: "Mamba",
    question: "Why Mamba MVP, and what do you expect from us that you cannot easily do yourself?",
    lookingFor: "Program fit and expectations."
  }
];
