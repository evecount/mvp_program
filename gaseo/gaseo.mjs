#!/usr/bin/env node
/**
 * GASEO: the site's headless SEO, AEO and GEO agent.
 *
 *   node gaseo/gaseo.mjs fix            write every managed head block, robots.txt, sitemap.xml and llms.txt
 *   node gaseo/gaseo.mjs check          fail if any of those are stale, then audit (what CI runs)
 *   node gaseo/gaseo.mjs audit          lint every page: titles, descriptions, headings, alt text, links, schema
 *   node gaseo/gaseo.mjs domain <url>   move the site to a new origin and regenerate everything
 *   node gaseo/gaseo.mjs live [url]     crawl the deployed site: status codes, canonicals, robots, sitemap
 *   node gaseo/gaseo.mjs review         ask Claude for an SEO/AEO/GEO review (needs ANTHROPIC_API_KEY)
 *
 * Each page keeps its own <title> and meta description, written by hand. GASEO owns everything between
 * <!-- gaseo:start --> and <!-- gaseo:end --> in each <head> (canonical, robots, Open Graph, Twitter,
 * JSON-LD), plus robots.txt, sitemap.xml and llms.txt. The FAQ JSON-LD is read from the visible FAQ on
 * the home page and the cohort dates from js/cohorts.js, so the schema never drifts from what people read.
 * No dependencies, except the Anthropic SDK for `review`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CONFIG_PATH = join(HERE, "config.json");
const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

const read = (f) => readFileSync(join(ROOT, f), "utf8");
const exists = (f) => existsSync(join(ROOT, f));
const origin = () => cfg.origin.replace(/\/+$/, "");
const abs = (path) => origin() + path;
const indexable = () => cfg.pages.filter((p) => !p.noindex);

// ---------------------------------------------------------------- HTML helpers

const decode = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&mdash;/g, "—");
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const textOf = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").replace(/ ([,.;:!?])/g, "$1").trim();
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1].toLowerCase(), m[2]]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);

const titleOf = (html) => decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
const descriptionOf = (html) => {
  const tag = tags(html, "meta").find((t) => attrs(t).name === "description");
  return tag ? decode(attrs(tag).content || "").trim() : "";
};

/** Visible text: what a reader (or an answer engine) actually gets from the page. */
const visibleText = (html) =>
  textOf(html.replace(/<head[\s\S]*?<\/head>/i, "").replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, " "));

/** The FAQ as written on the page: <details class="faq-item"><summary><h3>Q</h3></summary>A…</details>. */
function faqOf(html) {
  return [...html.matchAll(/<details class="faq-item">[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<\/summary>([\s\S]*?)<\/details>/g)]
    .map((m) => ({ q: textOf(m[1]), a: textOf(m[2]) }));
}

// ---------------------------------------------------------------- facts

function cohorts() {
  if (!exists(cfg.cohortsFile)) return [];
  const m = read(cfg.cohortsFile).match(/MVP_COHORTS\s*=\s*(\[[\s\S]*?\]);/);
  return m ? JSON.parse(m[1]) : [];
}

/** The cohort the site is selling: the first that hasn't started yet. */
function nextCohort(now = Date.now()) {
  const list = cohorts();
  return list.find((c) => Date.parse(c.startsAt) > now) || null;
}

const sgtIso = (ms) => new Date(ms + 8 * 3600e3).toISOString().replace(/\.\d{3}Z$/, "+08:00");
const longDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Singapore" }).format(new Date(iso));

// ---------------------------------------------------------------- JSON-LD

const ID = { org: () => abs("/#organization"), site: () => abs("/#website") };

function organizationNode() {
  const o = cfg.organization;
  return {
    "@type": "Organization",
    "@id": ID.org(),
    name: o.name,
    legalName: o.legalName,
    url: abs("/"),
    logo: { "@type": "ImageObject", url: abs(cfg.logo), width: 512, height: 512 },
    address: {
      "@type": "PostalAddress",
      streetAddress: o.streetAddress,
      postalCode: o.postalCode,
      addressLocality: o.addressLocality,
      addressCountry: o.addressCountry,
    },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: abs("/contact.html"), areaServed: "SG", availableLanguage: "en" },
    ...(o.sameAs?.length ? { sameAs: o.sameAs } : {}),
  };
}

function partnerNodes() {
  return cfg.partners.map((p) => ({ "@type": "Organization", name: p.name, ...(p.url ? { url: p.url } : {}) }));
}

function programNodes() {
  const c = nextCohort();
  return cfg.programs.map((p) => ({
    "@type": "EducationalOccupationalProgram",
    "@id": abs(`/#program-${p.id}`),
    name: p.name,
    description: p.description,
    url: abs("/"),
    provider: [{ "@id": ID.org() }, ...partnerNodes().filter((n) => n.url)],
    timeToComplete: p.timeToComplete,
    ...(c ? { startDate: c.starts, applicationDeadline: sgtIso(c.closesAt) } : {}),
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: cfg.currency,
      category: "Tuition",
      url: abs("/apply.html"),
      availability: c ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
    programPrerequisites: "Industry insight, an idea or an early prototype. No company or co-founder needed.",
    inLanguage: cfg.language,
  }));
}

function jsonLd(page, html) {
  const url = abs(page.path);
  const graph = [];
  const webPage = {
    "@type": page.type === "home" ? ["WebPage", "AboutPage"] : "WebPage",
    "@id": url + "#webpage",
    url,
    name: titleOf(html),
    description: descriptionOf(html),
    isPartOf: { "@id": ID.site() },
    inLanguage: cfg.language,
    primaryImageOfPage: { "@type": "ImageObject", url: abs(cfg.image.path) },
  };
  if (page.type === "home") {
    webPage.about = { "@id": ID.org() };
    graph.push(
      { "@type": "WebSite", "@id": ID.site(), url: abs("/"), name: cfg.siteName, alternateName: cfg.shortName, description: cfg.summary, publisher: { "@id": ID.org() }, inLanguage: cfg.language },
      organizationNode(),
      ...programNodes(),
    );
    const faq = faqOf(html);
    if (faq.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": url + "#faq",
        mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      });
    }
  } else {
    webPage.breadcrumb = { "@id": url + "#breadcrumb" };
    graph.push({
      "@type": "BreadcrumbList",
      "@id": url + "#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
        { "@type": "ListItem", position: 2, name: textOf((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || titleOf(html)), item: url },
      ],
    });
  }
  graph.unshift(webPage);
  return { "@context": "https://schema.org", "@graph": graph };
}

// ---------------------------------------------------------------- managed head block

const START = "<!-- gaseo:start · generated by gaseo/gaseo.mjs, edit gaseo/config.json or the page's <title>/description instead -->";
const END = "<!-- gaseo:end -->";
const BLOCK_RE = /[ \t]*<!-- gaseo:start[\s\S]*?<!-- gaseo:end -->\n?/;

function headBlock(page, html, indent) {
  const title = page.ogTitle || titleOf(html);
  const description = page.ogDescription || descriptionOf(html);
  const url = abs(page.path);
  const img = cfg.image;
  const lines = [START];
  if (!page.noindex) lines.push(`<link rel="canonical" href="${escAttr(url)}">`);
  lines.push(`<meta name="robots" content="${page.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1"}">`);
  if (!page.noindex) {
    lines.push(
      `<meta property="og:site_name" content="${escAttr(cfg.siteName)}">`,
      `<meta property="og:locale" content="${cfg.locale}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${escAttr(url)}">`,
      `<meta property="og:title" content="${escAttr(title)}">`,
      `<meta property="og:description" content="${escAttr(description)}">`,
      `<meta property="og:image" content="${escAttr(abs(img.path))}">`,
      `<meta property="og:image:width" content="${img.width}">`,
      `<meta property="og:image:height" content="${img.height}">`,
      `<meta property="og:image:alt" content="${escAttr(img.alt)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escAttr(title)}">`,
      `<meta name="twitter:description" content="${escAttr(description)}">`,
      `<meta name="twitter:image" content="${escAttr(abs(img.path))}">`,
      `<meta name="twitter:image:alt" content="${escAttr(img.alt)}">`,
    );
    const ld = JSON.stringify(jsonLd(page, html), null, 2).replace(/<\//g, "<\\/");
    lines.push(`<script type="application/ld+json">`, ...ld.split("\n"), `</script>`);
  }
  lines.push(END);
  return lines.map((l) => indent + l).join("\n") + "\n";
}

/** The page with its managed block rebuilt, and any stray tags the block now owns removed. */
function withHead(page, html) {
  let out = html.replace(BLOCK_RE, "");
  out = out
    .replace(/\n[ \t]*<link rel="canonical"[^>]*>/g, "")
    .replace(/\n[ \t]*<meta name="robots"[^>]*>/g, "")
    .replace(/\n[ \t]*<meta (?:property="og:|name="twitter:)[^>]*>/g, "")
    .replace(/\n[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  const anchor = out.match(/\n([ \t]*)<meta name="description"[^>]*>\n/) || out.match(/\n([ \t]*)<title>[\s\S]*?<\/title>\n/);
  if (!anchor) throw new Error(`${page.file}: no <title> or meta description to anchor the GASEO block`);
  const at = anchor.index + anchor[0].length;
  return out.slice(0, at) + headBlock(page, out, anchor[1]) + out.slice(at);
}

// ---------------------------------------------------------------- generated files

function lastmod(file) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: ROOT, encoding: "utf8" }).trim() || today();
  } catch {
    return today();
  }
}
const today = () => new Date().toISOString().slice(0, 10);

function sitemap() {
  const urls = indexable().map((p) =>
    [
      "  <url>",
      `    <loc>${abs(p.path)}</loc>`,
      `    <lastmod>${lastmod(p.file)}</lastmod>`,
      p.changefreq ? `    <changefreq>${p.changefreq}</changefreq>` : null,
      p.priority != null ? `    <priority>${Number(p.priority).toFixed(1)}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n"),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by GASEO (gaseo/gaseo.mjs). Do not edit by hand. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function robots() {
  const rules = ["Allow: /", ...cfg.robots.disallow.map((d) => `Disallow: ${d}`)];
  return [
    "# Generated by GASEO (gaseo/gaseo.mjs). Do not edit by hand.",
    "User-agent: *",
    ...rules,
    "",
    "# Search engines, AI assistants and answer engines are welcome to read and cite this site.",
    ...cfg.robots.aiCrawlers.map((b) => `User-agent: ${b}`),
    ...rules,
    "",
    `Sitemap: ${abs("/sitemap.xml")}`,
    "",
  ].join("\n");
}

function llmsTxt() {
  const c = nextCohort();
  const home = read(cfg.faqPage);
  const facts = [
    ...cfg.programs.map((p) => `- ${p.name}: ${p.description} ${cfg.currency === "SGD" ? "S$" : cfg.currency + " "}${p.price.toLocaleString("en-SG")}, or 50% upfront and the rest before the program ends.`),
    "- No equity is taken to join. Mamba Partners gets the first look at investing in ventures that complete the program.",
    "- Who it's for: working professionals, SME owners and aspiring founders with industry insight, an idea or an early prototype. No company or co-founder needed.",
    c
      ? `- Next cohort: #${c.n}, starts ${longDate(c.startsAt)}. Applications close ${longDate(sgtIso(c.closesAt))}, 9am Singapore time.`
      : "- Next cohort: to be announced.",
    "- Location: Singapore.",
    `- Run by: ${new Intl.ListFormat("en").format([`${cfg.organization.name} (${cfg.organization.legalName})`, ...cfg.partners.map((p) => `${p.name} (${p.role.toLowerCase()})`)])}.`,
  ];
  const pages = indexable().map((p) => {
    const html = read(p.file);
    return `- [${titleOf(html)}](${abs(p.path)}): ${descriptionOf(html)}`;
  });
  const faq = faqOf(home).flatMap(({ q, a }) => [`### ${q}`, "", a, ""]);
  return [
    `# ${cfg.siteName} (${cfg.shortName})`,
    "",
    `> ${cfg.summary}`,
    "",
    "## Key facts",
    "",
    ...facts,
    "",
    "## Pages",
    "",
    ...pages,
    "",
    "## FAQ",
    "",
    ...faq,
  ].join("\n").replace(/\n+$/, "\n");
}

/** Every file GASEO writes, with its expected contents. */
function plan() {
  const out = [];
  for (const page of cfg.pages) out.push({ file: page.file, content: withHead(page, read(page.file)) });
  out.push({ file: "robots.txt", content: robots() });
  out.push({ file: "sitemap.xml", content: sitemap(), compare: (s) => s.replace(/<lastmod>[^<]*<\/lastmod>/g, "") });
  out.push({ file: "llms.txt", content: llmsTxt() });
  return out;
}

// ---------------------------------------------------------------- audit

function audit() {
  const errors = [], warnings = [];
  const err = (f, m) => errors.push(`${f}: ${m}`), warn = (f, m) => warnings.push(`${f}: ${m}`);
  const seen = { title: new Map(), description: new Map() };
  const ids = new Map(cfg.pages.map((p) => [p.file, new Set([...read(p.file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));

  for (const page of cfg.pages) {
    const f = page.file, html = read(f);
    const title = titleOf(html), desc = descriptionOf(html);
    if (!/<html[^>]*\blang="/i.test(html)) err(f, "<html> has no lang attribute");
    if (!title) err(f, "missing <title>");
    else if (title.length < 25 || title.length > 65) warn(f, `title is ${title.length} characters (aim for 25–65): "${title}"`);
    if (!desc) err(f, "missing meta description");
    else if (desc.length < 70 || desc.length > 160) warn(f, `meta description is ${desc.length} characters (aim for 70–160)`);
    if (!page.noindex) {
      for (const [k, v] of [["title", title], ["description", desc]]) {
        if (seen[k].has(v)) warn(f, `same ${k} as ${seen[k].get(v)}`);
        else seen[k].set(v, f);
      }
    }
    const h1 = (html.match(/<h1\b/gi) || []).length;
    if (h1 !== 1) err(f, `${h1} <h1> elements (want exactly 1)`);

    for (const tag of tags(html, "img")) {
      const a = attrs(tag);
      if (!("alt" in a)) err(f, `<img src="${a.src}"> has no alt attribute`);
      if (!a.width || !a.height) warn(f, `<img src="${a.src}"> has no width/height (layout shift)`);
      if (a.src && !/^(https?:|data:)/.test(a.src) && !exists(resolveLocal(f, a.src))) err(f, `image not found: ${a.src}`);
    }

    for (const tag of tags(html, "a")) {
      const href = attrs(tag).href;
      if (!href || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
      const [pathPart, hash] = href.split("#");
      const target = pathPart ? resolveLocal(f, pathPart.split("?")[0]) : f;
      if (!exists(target)) { err(f, `broken link: ${href}`); continue; }
      if (hash && !(cfg.hashRoutes || []).includes(hash) && ids.has(target) && !ids.get(target).has(hash)) warn(f, `link ${href}: no element with id="${hash}" in ${target}`);
    }

    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { err(f, `invalid JSON-LD: ${e.message}`); }
    }
  }

  const home = read(cfg.faqPage), faq = faqOf(home);
  if (!faq.length) warn(cfg.faqPage, "no FAQ found (AEO): answer engines quote question-and-answer pairs");
  const c = nextCohort();
  if (!c) warn(cfg.cohortsFile, "no upcoming cohort: program schema is marked sold out; add the next cohort");
  else if (faq.length && !faqOf(home).some(({ a }) => a.includes(longDate(c.startsAt)))) {
    warn(cfg.faqPage, `the FAQ doesn't mention the next cohort's start date (${longDate(c.startsAt)}); update the "When does the next cohort start" answer`);
  }

  for (const file of htmlFiles()) {
    if (!cfg.pages.some((p) => p.file === file)) warn(file, "HTML page not listed in gaseo/config.json (no head block, not in sitemap)");
  }
  if (!exists(cfg.image.path.split("?")[0].slice(1))) err("gaseo/config.json", `share image not found: ${cfg.image.path}`);
  return { errors, warnings };
}

function resolveLocal(fromFile, href) {
  let p = href.startsWith("/") ? href.slice(1) : posix.join(posix.dirname(fromFile), href);
  p = posix.normalize(p);
  if (p === "" || p === "." || p.endsWith("/")) p = posix.join(p, "index.html");
  return p;
}

function htmlFiles() {
  const skip = new Set(["node_modules", "functions", "mockup", "assets", "gaseo", ".git", ".github"]);
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (e.name.startsWith(".") || skip.has(e.name)) continue;
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith(".html")) out.push(rel);
    }
  };
  walk("");
  return out;
}

function report({ errors, warnings }) {
  for (const w of warnings) console.log(`  warn   ${w}`);
  for (const e of errors) console.log(`  ERROR  ${e}`);
  console.log(`GASEO audit: ${errors.length} error(s), ${warnings.length} warning(s) across ${cfg.pages.length} pages.`);
  return errors.length === 0;
}

// ---------------------------------------------------------------- commands

function cmdFix() {
  let changed = 0;
  for (const { file, content } of plan()) {
    const before = exists(file) ? read(file) : null;
    if (before !== content) {
      writeFileSync(join(ROOT, file), content);
      console.log(`  wrote  ${file}`);
      changed++;
    }
  }
  console.log(`GASEO fix: ${changed} file(s) updated for ${origin()}.`);
  return report(audit());
}

function cmdCheck() {
  const stale = plan().filter(({ file, content, compare = (s) => s }) => !exists(file) || compare(read(file)) !== compare(content));
  for (const { file } of stale) console.log(`  STALE  ${file}`);
  if (stale.length) console.log(`GASEO check: ${stale.length} file(s) out of date. Run: node gaseo/gaseo.mjs fix`);
  const ok = report(audit());
  return ok && stale.length === 0;
}

function cmdDomain(url) {
  if (!url || !/^https:\/\/[^/]+$/.test(url.replace(/\/$/, ""))) {
    console.error("Usage: node gaseo/gaseo.mjs domain https://example.com");
    return false;
  }
  const before = origin();
  cfg.origin = url.replace(/\/$/, "");
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
  console.log(`GASEO domain: ${before} -> ${origin()}`);
  const ok = cmdFix();
  const leftovers = htmlFiles().filter((f) => read(f).includes(before));
  for (const f of leftovers) console.log(`  note   ${f} still mentions ${before} in its copy; review by hand`);
  return ok;
}

async function cmdLive(base = origin()) {
  base = base.replace(/\/$/, "");
  let failures = 0;
  const get = async (path) => {
    try {
      const r = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "GASEO/1.0 (+https://github.com/evecount/mvp_program)" } });
      return { status: r.status, body: r.status === 200 ? await r.text() : "", location: r.headers.get("location") };
    } catch (e) {
      return { status: 0, body: "", error: e.message };
    }
  };
  const check = (ok, msg) => { console.log(`  ${ok ? "ok   " : "FAIL "} ${msg}`); if (!ok) failures++; };

  for (const p of indexable()) {
    const r = await get(p.path);
    check(r.status === 200, `${p.path} -> ${r.status}${r.location ? " " + r.location : ""}${r.error ? " " + r.error : ""}`);
    if (r.status === 200) {
      const canon = (r.body.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      check(canon === abs(p.path), `${p.path} canonical ${canon || "(none)"}`);
    }
  }
  for (const f of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) {
    const r = await get(f);
    check(r.status === 200, `${f} -> ${r.status}`);
    if (f === "/robots.txt" && r.status === 200) check(r.body.includes(`Sitemap: ${abs("/sitemap.xml")}`), "robots.txt points at the sitemap on the configured origin");
  }
  const missing = await get("/gaseo-probe-does-not-exist");
  check(missing.status === 404, `unknown URL returns 404 (got ${missing.status})`);
  console.log(`GASEO live: ${failures} failure(s) at ${base}.`);
  return failures === 0;
}

const REVIEW_SYSTEM = `You are GASEO, the search reviewer for a small company's marketing site. You review it for three audiences:
SEO (Google and Bing ranking and rich results), AEO (answer engines and featured snippets that quote direct answers), and
GEO (generative engines such as ChatGPT, Claude, Perplexity and Google AI Overviews that summarise and cite sources).

You get every page's title, meta description, visible text and JSON-LD, plus the site's llms.txt. Write a review in Markdown
that the site owner can act on this week. Rules:
- Use only facts present in the material. Never invent prices, dates, results, testimonials, statistics or partners. When a
  recommendation needs a fact the site doesn't state, say exactly what the owner must supply.
- Be specific: name the page and quote the text you would change, then give the replacement.
- Rank by likely impact on being found, quoted and chosen. Skip generic advice that doesn't apply to this site.

Sections, in this order:
1. Highest-impact fixes (at most 7, ranked)
2. Questions people ask that the site doesn't answer yet: the question, why it matters, and a draft answer from site facts or "needs: …"
3. Title and meta description rewrites, per page, only where yours is clearly better (keep titles under 60 characters and descriptions under 155)
4. Fact and entity consistency: contradictions between pages, between visible text and JSON-LD, or naming that drifts
5. Off-site work for GEO: specific places this program should be listed or cited, and what to publish there`;

async function cmdReview() {
  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch {
    console.error("The review needs the Anthropic SDK: run `npm install --prefix gaseo` first.");
    return false;
  }
  const bundle = indexable().map((p) => {
    const html = read(p.file);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1].trim()).join("\n");
    return `<page url="${abs(p.path)}">\n<title>${titleOf(html)}</title>\n<description>${descriptionOf(html)}</description>\n<text>${visibleText(html)}</text>\n<jsonld>${ld}</jsonld>\n</page>`;
  }).join("\n\n");
  const { errors, warnings } = audit();

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: cfg.review.model,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort: cfg.review.effort },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: REVIEW_SYSTEM,
    messages: [{
      role: "user",
      content: `${bundle}\n\n<llms_txt>\n${read("llms.txt")}\n</llms_txt>\n\n<automated_audit>\n${[...errors, ...warnings].join("\n") || "clean"}\n</automated_audit>\n\nReview the site.`,
    }],
  });
  let message;
  try {
    message = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.error("GASEO review: the API key was rejected. Set ANTHROPIC_API_KEY to a valid key.");
    else if (e instanceof Anthropic.RateLimitError) console.error("GASEO review: rate limited; try again shortly.");
    else if (e instanceof Anthropic.APIError) console.error(`GASEO review: API error ${e.status ?? ""} ${e.message}`);
    else throw e;
    return false;
  }
  if (message.stop_reason === "refusal") {
    console.error("GASEO review: the model declined this request.", message.stop_details?.explanation || "");
    return false;
  }
  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  if (message.stop_reason === "max_tokens") console.warn("GASEO review: output hit max_tokens and may be cut short.");
  mkdirSync(join(HERE, "reports"), { recursive: true });
  const out = join(HERE, "reports", `review-${today()}.md`);
  writeFileSync(out, `# GASEO review, ${today()}\n\nSite: ${origin()} · Model: ${message.model}\n\n${text}\n`);
  console.log(`GASEO review: wrote ${relative(ROOT, out)}`);
  return true;
}

// ---------------------------------------------------------------- main

const [cmd, arg] = process.argv.slice(2);
const commands = {
  fix: cmdFix,
  check: cmdCheck,
  audit: () => report(audit()),
  domain: () => cmdDomain(arg),
  live: () => cmdLive(arg),
  review: cmdReview,
};
if (!commands[cmd]) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, "").trim());
  process.exit(cmd ? 1 : 0);
}
process.exit((await commands[cmd]()) ? 0 : 1);
