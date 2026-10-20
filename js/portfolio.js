/**
 * Mamba MVP — Portfolio: the cohorts and the startups coming out of them.
 *
 * Add a cohort by adding an entry to PORTFOLIO (newest first). Add a startup
 * by adding it to its cohort's `startups`. Only `name` is required; without a
 * `logo` the card shows the startup's initials, and without a `oneLiner` it
 * says details are coming soon.
 *
 *   {
 *     name: "Startup Name",
 *     oneLiner: "What it does, for whom, in one sentence.",
 *     sector: ["Fintech", "B2B SaaS"],          // optional tags, also the filters
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
    n: 2,
    dates: "Starts 26 Jan 2027",
    status: "upcoming",
    pending: "Applications are open. This cohort's startups are announced as they graduate.",
    startups: [
      { name: "Scripting Destiny" },
      { name: "GRC Nexus" },
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

  const all = PORTFOLIO.flatMap((c) => c.startups);
  const sectors = [...new Set(all.flatMap((s) => s.sector || []))].sort();

  // Headline numbers: only what is true today.
  const stats = document.getElementById("pf-stats");
  if (stats) {
    const add = (value, label) => {
      const d = el("div", "pf-stat");
      d.append(el("strong", null, String(value)), el("span", null, label));
      stats.append(d);
    };
    add(PORTFOLIO.length, PORTFOLIO.length === 1 ? "cohort" : "cohorts");
    if (all.length) add(all.length, all.length === 1 ? "startup" : "startups");
    if (sectors.length) add(sectors.length, sectors.length === 1 ? "sector" : "sectors");
  }

  function card(s) {
    const c = el("article", "pf-card");
    c.dataset.sector = (s.sector || []).join("|");
    const head = el("div", "pf-card-head");
    let logo;
    if (s.logo) {
      logo = el("img", "pf-logo");
      logo.src = s.logo;
      logo.alt = `${s.name} logo`;
      logo.loading = "lazy";
      logo.width = logo.height = 56;
    } else {
      logo = el("div", "pf-logo pf-logo--initials", initials(s.name));
      logo.setAttribute("aria-hidden", "true");
    }
    const title = el("div");
    title.append(el("h3", "pf-name", s.name));
    const meta = [s.track && TRACK[s.track], s.stage].filter(Boolean).join(" · ");
    if (meta) title.append(el("p", "pf-meta", meta));
    head.append(logo, title);
    c.append(head, el("p", s.oneLiner ? "pf-oneliner" : "pf-oneliner pf-oneliner--soon", s.oneLiner || "Details coming soon."));
    if (s.sector?.length) {
      const tags = el("div", "pf-tags");
      for (const t of s.sector) tags.append(el("span", "pf-tag", t));
      c.append(tags);
    }
    if (s.founders?.length) c.append(el("p", "pf-founders", `Founded by ${s.founders.join(", ")}`));
    if (s.url || s.linkedin) {
      const links = el("div", "pf-links");
      if (s.url) links.append(link("pf-link", "Website →", s.url));
      if (s.linkedin) links.append(link("pf-link", "LinkedIn →", s.linkedin));
      c.append(links);
    }
    return c;
  }

  for (const cohort of PORTFOLIO) {
    const sec = el("section", "pf-cohort");
    sec.id = `cohort-${cohort.n}`;
    const head = el("header", "pf-cohort-head");
    const h = el("h2", null, `Cohort #${cohort.n}`);
    const badge = el("span", `pf-badge pf-badge--${cohort.status}`, STATUS[cohort.status] || cohort.status);
    head.append(h, badge, el("p", "pf-dates", cohort.dates));
    sec.append(head);

    const grid = el("div", "pf-grid");
    for (const s of cohort.startups) grid.append(card(s));
    if (!cohort.startups.length) {
      const soon = el("article", "pf-card pf-card--soon");
      soon.append(el("div", "pf-logo pf-logo--initials", "#" + cohort.n), el("p", "pf-oneliner", cohort.pending));
      grid.append(soon);
    }
    sec.append(grid);
    root.append(sec);
  }

  // Sector filter, shown once there are at least two sectors to choose between.
  const filters = document.getElementById("pf-filters");
  if (filters && sectors.length > 1) {
    filters.hidden = false;
    const apply = (sector) => {
      for (const b of filters.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.sector === sector));
      for (const c of root.querySelectorAll(".pf-card:not(.pf-card--soon)")) {
        c.hidden = sector !== "" && !c.dataset.sector.split("|").includes(sector);
      }
    };
    for (const s of ["", ...sectors]) {
      const b = el("button", "pf-filter", s || "All");
      b.type = "button";
      b.dataset.sector = s;
      b.addEventListener("click", () => apply(s));
      filters.append(b);
    }
    apply("");
  }
})();
