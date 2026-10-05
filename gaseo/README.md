# GASEO

The site's headless SEO, AEO and GEO agent:

- **SEO** (search engine optimisation): ranking and rich results in Google and Bing.
- **AEO** (answer engine optimisation): direct answers that featured snippets and voice assistants can quote.
- **GEO** (generative engine optimisation): being summarised and cited by ChatGPT, Claude, Perplexity and Google AI Overviews.

GASEO is one Node script (`gaseo.mjs`) with no dependencies. The Anthropic SDK is needed only for `review`.

## What it owns

| Output | Source of truth |
|---|---|
| The `<!-- gaseo:start -->…<!-- gaseo:end -->` block in each page's `<head>`: canonical URL, robots, Open Graph, Twitter card, JSON-LD | `config.json` plus the page's own `<title>` and meta description |
| JSON-LD: `WebSite`, `Organization`, two `EducationalOccupationalProgram`s (price, length, start date, application deadline), `FAQPage`, and `WebPage` + `BreadcrumbList` per page | `config.json`, `js/cohorts.js` (dates) and the visible FAQ on `index.html` |
| `robots.txt`: open to search engines and AI crawlers, points at the sitemap | `config.json` → `robots` |
| `sitemap.xml`: every indexable page, `lastmod` from git history | `config.json` → `pages` |
| `llms.txt`: a plain-text brief for AI assistants with the key facts, pages and FAQ ([llmstxt.org](https://llmstxt.org)) | `config.json`, page titles and descriptions, the FAQ |

Never edit these outputs by hand; `check` flags it and `fix` overwrites it. Edit the sources instead.

## Commands

Run them from the repo root:

```bash
node gaseo/gaseo.mjs fix              # regenerate everything, then audit
node gaseo/gaseo.mjs check            # fail if anything is stale or an audit error exists (CI runs this)
node gaseo/gaseo.mjs audit            # titles, descriptions, one <h1>, alt text, image sizes, links, anchors, JSON-LD
node gaseo/gaseo.mjs domain https://new-domain.com   # switch origin everywhere, then regenerate
node gaseo/gaseo.mjs live [origin]    # crawl the deployed site: 200s, canonicals, robots, sitemap, llms.txt, real 404s
npm install --prefix gaseo && node gaseo/gaseo.mjs review   # Claude review → gaseo/reports/review-YYYY-MM-DD.md
```

## Running headless

`.github/workflows/gaseo.yml` runs it without anyone at the keyboard:

- **Every PR:** runs `fix` and commits any changes back to the PR branch as `gaseo[bot]`, then runs `check`. Audit errors fail the PR.
- **Every push to `main`:** runs `check`.
- **Mondays at 09:17 SGT** (or on demand from the Actions tab): runs `live` against the configured origin. When the `ANTHROPIC_API_KEY` repo secret is set, it also runs `review`. Both results go to the run summary and a `gaseo-report` artifact.

## Common changes

- **New page:** add it to `pages` in `config.json` (`noindex: true` keeps it out of search), give it a `<title>`, a meta description and one `<h1>`, then run `fix`.
- **New FAQ entry:** add a `<details class="faq-item">` to the FAQ on `index.html` and run `fix`. The FAQ schema and `llms.txt` pick it up.
- **New cohort:** update `functions/src/mamba/program.ts` and run `npm run build:form` in `functions/` as usual. That regenerates `js/cohorts.js`, which GASEO reads. Then update the cohort answer in the FAQ (the audit warns until you do) and run `fix`.
- **Prices or tracks:** update `programs` in `config.json`, the FAQ and the facts band on `index.html`.
- **Social profiles:** add the LinkedIn, Instagram and other URLs to `organization.sameAs` in `config.json`. They tell search and AI engines that those profiles are the same organisation.
