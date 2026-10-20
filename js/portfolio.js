/**
 * Mamba MVP — Portfolio: the cohorts and the startups coming out of them.
 *
 * Add a cohort by adding an entry to PORTFOLIO (newest first). Add a startup
 * by adding it to its cohort's `startups`. Only `name` is required; without a
 * `logo` the card shows the startup's initials, and without a `oneLiner` it
 * says details are coming soon. `status` is "upcoming", "building" or
 * "graduated".
 *
 *   {
 *     name: "Startup Name",
 *     oneLiner: "What it does, for whom, in one sentence.",
 *     sector: ["Fintech", "B2B SaaS"],          // optional tags
 *     track: "build",                           // optional: "sprint" or "build"
 *     stage: "Paid pilot",                      // optional: where it is today
 *     founders: ["Full Name", "Full Name"],     // optional
 *     logo: "assets/portfolio/startup-name.png",// optional, square works best
 *     url: "https://…",                         // optional website
 *     linkedin: "https://linkedin.com/company/…", // optional
 *   }
 *
 * A cohort with no startups yet shows `pending` in their place.
 */
const PORTFOLIO = [
  {
    n: 3,
    dates: "Dates to be announced",
    status: "upcoming",
    pending: "Applications are open. This cohort's startups are announced as they join.",
    startups: [],
  },
  {
    n: 2,
    dates: "Started 19 Oct 2026",
    status: "building",
    pending: "Cohort #2 is building now.",
    startups: [
      {
        name: "Scripting Destiny",
        oneLiner: "An AI BaZi (Four Pillars of Destiny) platform that calculates a person's chart, luck pillars and Ten Gods, then explains it through an AI destiny consultant.",
        sector: ["Consumer AI", "Metaphysics"],
        stage: "Prototype",
      },
      {
        name: "GRC Nexus",
        oneLiner: "A modular, AI-enabled governance, risk and compliance platform that maps a company's processes to its regulatory obligations, with every decision owned by a named person.",
        sector: ["RegTech", "Enterprise SaaS"],
        stage: "Prototype",
      },
    ],
  },
  {
    n: 1,
    dates: "5 Oct 2026 – 5 Jan 2027",
    status: "building",
    pending: "Cohort #1 is building now. Its startups are unveiled at Demo Day in January 2027.",
    startups: [
      {
        name: "SharedOut",
        oneLiner: "A neighbourhood marketplace where HDB residents rent idle items and book home-based services from neighbours within 500 metres.",
        sector: ["Marketplace", "Sharing economy"],
        stage: "Live in 21 HDB estates",
        logo: "assets/portfolio/sharedout.png",
        url: "https://sharedout.com.sg",
      },
      {
        name: "Auvira",
        oneLiner: "An AI health companion for women's hormonal wellbeing that links daily biometrics and cycle symptoms to an integrated care team.",
        sector: ["Healthtech", "Women's health"],
        stage: "Singapore pilot opening soon",
        logo: "assets/portfolio/auvira.svg",
        url: "https://auvira.health",
      },
    ],
  },
];

(function () {
  const root = document.getElementById("portfolio");
  if (!root) return;

  const STATUS = { upcoming: "Applications open", building: "Building now", graduated: "Graduated" };
  const TRACK = { sprint: "1-month sprint", build: "3-month build" };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const link = (cls, text, href) => {
    const a = el("a", cls, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  };
  const initials = (name) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  // Facts band, as on the homepage: only what is true today.
  const all = PORTFOLIO.flatMap((c) => c.startups);
  const sectors = new Set(all.flatMap((s) => s.sector || []));
  const stats = document.getElementById("pf-stats");
  if (stats) {
    const fact = (label, value, unit) => {
      const d = el("div", "fact reveal");
      d.append(el("p", "mono label", label), el("p", "fact-num display", String(value)), el("p", "fact-unit", unit));
      stats.append(d);
    };
    const building = PORTFOLIO.filter((c) => c.status === "building").length;
    fact("Cohorts", PORTFOLIO.length, building ? `${building} building now.` : "Since October 2026.");
    fact("Startups", all.length, "Announced as they join a cohort.");
    fact("Sectors", sectors.size, [...sectors].slice(0, 3).join(", ") + (sectors.size > 3 ? " and more." : "."));
    const next = PORTFOLIO.find((c) => c.status === "upcoming");
    if (next) fact("Next cohort", `#${next.n}`, `${next.dates}. Applications are open.`);
  }

  function card(s) {
    const c = el("article", "pf-card reveal");
    let logo;
    if (s.logo) {
      logo = el("img", "pf-logo");
      logo.src = s.logo;
      logo.alt = `${s.name} logo`;
      logo.loading = "lazy";
      logo.width = logo.height = 64;
    } else {
      logo = el("div", "pf-logo pf-logo--initials", initials(s.name));
      logo.setAttribute("aria-hidden", "true");
    }
    c.append(logo, el("h3", "pf-name", s.name));
    const meta = [s.stage, s.track && TRACK[s.track]].filter(Boolean).join(" · ");
    if (meta) c.append(el("p", "mono step pf-meta", meta));
    c.append(el("p", s.oneLiner ? "pf-oneliner" : "pf-oneliner pf-oneliner--soon", s.oneLiner || "Details coming soon."));
    if (s.sector?.length) c.append(el("p", "pf-sectors", s.sector.join(" · ")));
    if (s.founders?.length) c.append(el("p", "pf-founders", `Founded by ${s.founders.join(", ")}`));
    if (s.url || s.linkedin) {
      const links = el("div", "pf-links");
      if (s.url) links.append(link("pf-link", "Website ↗", s.url));
      if (s.linkedin) links.append(link("pf-link", "LinkedIn ↗", s.linkedin));
      c.append(links);
    }
    return c;
  }

  // One section per cohort, headed like the homepage's sections.
  for (const cohort of PORTFOLIO) {
    const sec = el("section", `pf-cohort pf-cohort--${cohort.status}`);
    sec.id = `cohort-${cohort.n}`;
    sec.setAttribute("aria-labelledby", `cohort-${cohort.n}-title`);
    const head = el("div", "section-head");
    const label = el("div", "pf-cohort-label");
    label.append(el("p", "mono label", STATUS[cohort.status] || cohort.status), el("p", "pf-dates", cohort.dates));
    const h = el("h2", "display h2", `Cohort #${cohort.n}`);
    h.id = `cohort-${cohort.n}-title`;
    head.append(label, h);
    sec.append(head);

    if (cohort.startups.length) {
      const grid = el("div", "pf-grid");
      for (const s of cohort.startups) grid.append(card(s));
      sec.append(grid);
    } else {
      const soon = el("div", "pf-soon reveal");
      soon.append(el("p", null, cohort.pending));
      if (cohort.status === "upcoming") {
        const a = el("a", "pill pill--black");
        a.href = "/apply.html#apply";
        a.innerHTML = '<span class="pill-shine" aria-hidden="true"></span>Apply to MVP <svg class="i"><use href="#i-arrow"/></svg>';
        soon.append(a);
      }
      sec.append(soon);
    }
    root.append(sec);
  }
})();
