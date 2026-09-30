/**
 * EveCount Venture Studio - Cohort 1 Entrance Examination
 * Question Bank: 20 Advanced Diagnostic Questions across 5 Foundational Domains
 * Passing Threshold: 80% (16 / 20 correct)
 */

const EXAM_QUESTIONS = [
  {
    id: 1,
    domain: "MVP Scoping & Rapid Velocity",
    domainKey: "scoping",
    question: "You are building an AI-powered automated inventory forecasting tool for multi-location coffee chains. You have 3 weeks before cohort demo day. What represents the true Minimum Viable Product (MVP) to test whether store managers will trust and act on the forecasts?",
    scenario: "Store managers currently use Excel sheets and intuition. Developing an automated two-way ERP sync, mobile application, and multi-tenant user authentication will take 10 weeks of engineering.",
    options: [
      "Build a polished React native mobile app with mock data to showcase the intended UI/UX to potential buyers.",
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
    explanation: "As Peter Thiel and Casey Winters note, true PMF is proven when the cohort retention curve stops decaying and levels out into a horizontal plateau. Vanity metrics like cumulative signups or one-time upvotes measure distribution noise, not retained value."
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
    explanation: "Custom feature requests from low-ACV prospects are deadly distractions. Great founders don't build software blindly; they uncover the root job-to-be-done ('Mom Test' rule) and fulfill it manually or with minimal bespoke code to protect the product vision."
  },
  {
    id: 5,
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
    id: 6,
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
    id: 7,
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
    id: 8,
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
    id: 9,
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
    id: 10,
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
    id: 11,
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
    id: 12,
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
    id: 13,
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
    id: 14,
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
    id: 15,
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
    id: 16,
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
    id: 17,
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
    id: 18,
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
    id: 19,
    domain: "Founder Decision Making & Crisis Execution",
    domainKey: "grit",
    question: "When should an early-stage startup initiate a decisive product pivot?",
    scenario: "Cohort 1 review at week 8.",
    options: [
      "Whenever a customer cancels their subscription on day 3.",
      "After repeated, systematic customer interviews and sprint cycles reveal that users do not feel intense pain, will not pay, or lack retention despite rapid iterations on positioning.",
      "Whenever the founders read a trending tech news headline about a new open-source model release.",
      "Never; pivoting is a sign of weakness and conviction means sticking to the initial idea for 5 years regardless of evidence."
    ],
    correct: 1,
    explanation: "Pivots should not be whimsical reactions to isolated negative feedback, nor avoided through stubborn denial. A pivot is warranted when systematic, empirical evidence across multiple sprints confirms that the core hypothesis lacks acute demand or customer willingness to pay."
  },
  {
    id: 20,
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
  }
];

// Domain weights and metadata
const DOMAIN_METADATA = {
  scoping: {
    name: "MVP Scoping & Rapid Velocity",
    icon: "zap",
    description: "Ability to scope ruthless 0-to-1 prototypes, eliminate feature creep, and measure genuine retention plateaus."
  },
  gtm: {
    name: "Customer Discovery & Go-To-Market",
    icon: "users",
    description: "Competency in 'Mom Test' customer discovery, founder-led outbound sales, and fully loaded CAC economics."
  },
  economics: {
    name: "Unit Economics, Runway & SAFE Financing",
    icon: "trending-up",
    description: "Mastery of Post-Money SAFE caps, runway burn calculations, LTV/CAC ratios, and venture dilution models."
  },
  defensibility: {
    name: "Defensibility, Moats & Wedge Strategy",
    icon: "shield",
    description: "Strategic positioning using counter-positioning, proprietary switching costs, and bottom-up TAM modeling."
  },
  grit: {
    name: "Founder Decision Making & Crisis Execution",
    icon: "compass",
    description: "Crisis handling, 4-year vesting cliff enforcement, predatory term sheet defense, and strategic pivots."
  }
};
